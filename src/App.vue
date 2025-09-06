<template>
  <div id="app">
    <NotificationContainer />
    <div class="app-container">
      <!-- 工具栏 -->
      <Toolbar 
        :is-dark="theme.isDark"
        :pdf-info="pdfViewerState"
        @file-selected="handleFileSelected"
        @toggle-theme="toggleTheme"
        @open-settings="openSettings"
        @go-to-page="handleGoToPage"
      />

      <!-- 主内容区域 -->
      <div class="main-content">
        <!-- 目录侧栏 -->
        <OutlineSidebar 
          :outline-data="pdfOutline"
          :current-page="pdfViewerState.currentPage"
          :is-collapsed="outlineSidebarCollapsed"
          :width="outlineSidebarWidth"
          :has-pdf-file="!!selectedFile"
          @go-to-page="handleGoToPage"
          @toggle-collapse="handleOutlineToggle"
          @width-changed="handleOutlineWidthChanged"
          @generate-smart-outline="handleGenerateSmartOutline"
        />

        <!-- PDF 查看器 -->
        <div class="pdf-viewer-section">
          <PdfViewer 
            ref="pdfViewerRef"
            :file="selectedFile"
            @pdf-loaded="handlePdfLoaded"
            @page-changed="handlePageChanged"
            @text-selected="handleTextSelected"
            @error="handleError"
            @translate-text="handleTranslateFromMenu"
            @chat-with-text="handleChatFromMenu"
            @outline-loaded="handleOutlineLoaded"
          />
        </div>

        <!-- 侧边栏 -->
        <Sidebar 
          :selected-text="translationState.selectedText"
          :translation="translationState.translatedText"
          :is-translating="translationState.isTranslating"
          :auto-translate="translationState.autoTranslate"
          :chat-messages="chatMessages"
          :is-chat-thinking="isChatThinking"
          :pdf-history="pdfHistory"
          :is-app-ready="isAppReady"
          :is-collapsed="sidebarState.isCollapsed"
          :active-tab="sidebarState.activeTab"
          @translate="handleTranslate"
          @toggle-auto-translate="toggleAutoTranslate"
          @send-message="handleSendMessage"
          @new-chat="handleNewChat"
          @sidebar-width-changed="handleSidebarWidthChanged"
          @sidebar-state-changed="handleSidebarStateChanged"
          @reopen-pdf="handleReopenPdf"
          @delete-pdf-history="deletePdfHistory"
          @clear-pdf-history="clearPdfHistory"
        />
      </div>
    </div>

    <!-- 设置模态框 -->
    <SettingsModal 
      v-if="showSettings"
      :is-dark="theme.isDark"
      :source-color="theme.sourceColor"
      @close="closeSettings"
      @update-theme="updateTheme"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-model:show="showRetryDialog"
      title="文件未找到"
      :message="retryDialogData?.message"
      warning="文件可能已被移动或删除"
      confirm-text="重新选择"
      @confirm="handleRetryConfirm"
      @cancel="handleRetryCancel"
    />

    <ConfirmDialog
      v-model:show="showFileSelectDialog"
      title="选择文件"
      :message="fileSelectData ? `请选择文件: ${fileSelectData.name}` : ''"
      confirm-text="选择"
      @confirm="handleFileSelectConfirm"
      @cancel="handleFileSelectCancel"
    />

    <!-- 更新通知 -->
    <UpdateNotification ref="updateNotificationRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import PdfViewer from './components/PdfViewer.vue'
import Sidebar from './components/Sidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import OutlineSidebar from './components/OutlineSidebar.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import NotificationContainer from './components/NotificationContainer.vue'
import { useNotification } from './composables/useNotification'
import { aiService } from './utils/ai'
import { configManager } from './utils/config'
import { applyMaterialTheme } from './utils/material-theme'
import { normalizePath, getPlatformInfo } from './utils/platform'
import { pdfHistoryManager } from './utils/pdfHistory'
import type { PdfViewerState, TranslationState, ChatMessage, OutlineItem } from './types'
import type { PdfHistoryItem } from './utils/pdfHistory'

// 响应式状态
const theme = reactive({
  isDark: true,
  sourceColor: '#6750A4'
})
const selectedFile = ref<File | null>(null)
const pdfViewerRef = ref()
const updateNotificationRef = ref()
const showSettings = ref(false)
const isChatThinking = ref(false)
const isAppReady = ref(false) // 应用是否完全初始化完成

const { showNotification } = useNotification()

// 确认对话框状态
const showRetryDialog = ref(false)
const retryDialogData = ref<{ item: PdfHistoryItem; message: string } | null>(null)
const showFileSelectDialog = ref(false)
const fileSelectData = ref<PdfHistoryItem | null>(null)

// 目录侧栏状态
const pdfOutline = ref<OutlineItem[]>([])
const outlineSidebarCollapsed = ref(false)
const outlineSidebarWidth = ref(250)



const pdfViewerState = reactive<PdfViewerState>({
  currentScale: 1.0,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,
  error: null
})

const translationState = reactive<TranslationState>({
  selectedText: '',
  translatedText: '',
  isTranslating: false,
  autoTranslate: false,
  error: null
})

const chatMessages = ref<ChatMessage[]>([])

// PDF历史记录状态
const pdfHistory = ref<PdfHistoryItem[]>([])
const maxPdfHistory = 50

// 侧栏状态
const sidebarState = reactive({
  isCollapsed: false,
  activeTab: 'translate' as 'translate' | 'chat' | 'history'
})

// 工具函数
const platformInfo = getPlatformInfo()
console.log(`运行在 ${platformInfo.name} 平台，${platformInfo.isTauri ? 'Tauri' : 'Web'} 环境`)

// 事件处理函数
const handleFileSelected = (file: File, filePath?: string) => {
  selectedFile.value = file
  
  // 如果有文件路径（Tauri环境），使用真实路径；否则使用文件名
  const path = filePath || file.name
  addToPdfHistory(file.name, path)
}

const handlePdfLoaded = (info: { totalPages: number }) => {
  pdfViewerState.totalPages = info.totalPages
  pdfViewerState.currentPage = 1
  
  // 更新当前PDF的页数信息
  if (selectedFile.value && pdfHistory.value.length > 0) {
    const currentPdf = pdfHistory.value[0]
    if (currentPdf && currentPdf.name === selectedFile.value.name) {
      currentPdf.totalPages = info.totalPages
      pdfHistoryManager.saveHistory(pdfHistory.value)
    }
  }
}

const handlePageChanged = (page: number) => {
  pdfViewerState.currentPage = page
}

const handleTextSelected = (text: string) => {
  const trimmedText = text.trim();
  
  if (translationState.selectedText === trimmedText) {
    console.log('Same text selected, skipping...')
    return
  }
  
  translationState.selectedText = trimmedText;
  translationState.translatedText = '';
  translationState.error = null;
  
  if (translationState.autoTranslate && 
      !sidebarState.isCollapsed && 
      sidebarState.activeTab === 'translate' && 
      trimmedText) {
    handleTranslate(trimmedText);
  }
};

const handleTranslate = async (text: string) => {
  if (translationState.isTranslating && translationState.selectedText === text) {
    console.log('Already translating this text, skipping...')
    return
  }

  if (translationState.selectedText === text && 
      translationState.translatedText && 
      !translationState.error) {
    console.log('Text already translated, skipping...')
    return
  }

  translationState.isTranslating = true
  translationState.error = null

  try {
    await configManager.reloadConfig()
    const model = configManager.getActiveModel('translate')
    if (!model) {
      showNotification('请先在设置中配置翻译模型', 'error')
      translationState.isTranslating = false
      return
    }

    translationState.translatedText = ''
    const config = configManager.getConfig()
    
    const result = await aiService.translateTextStream(
      model, 
      text, 
      config.translateTargetLang,
      config.translationPrompt,
      (chunk: string) => {
        translationState.translatedText += chunk
      }
    )

    if (result.error) {
      translationState.error = result.error
      showNotification(result.error, 'error')
    } else {
      if (!translationState.translatedText) {
        translationState.translatedText = result.translatedText
      }
    }
  } catch (err: any) {
    translationState.error = err.message
    showNotification(err.message, 'error')
  } finally {
    translationState.isTranslating = false
  }
}

const toggleAutoTranslate = () => {
  translationState.autoTranslate = !translationState.autoTranslate
  configManager.updateConfig({ enableSelectionTranslation: translationState.autoTranslate })
}

const handleTranslateFromMenu = (text: string) => {
  if (sidebarState.isCollapsed) {
    sidebarState.isCollapsed = false
  }
  sidebarState.activeTab = 'translate'
  translationState.selectedText = text
  handleTranslate(text)
}

const handleChatFromMenu = (text: string) => {
  if (sidebarState.isCollapsed) {
    sidebarState.isCollapsed = false
  }
  sidebarState.activeTab = 'chat'
  const chatInput = `请帮我分析这段内容："${text}"`
  handleSendMessage(chatInput)
}

const handleOutlineLoaded = (outline: OutlineItem[]) => {
  const processOutline = (items: OutlineItem[]): OutlineItem[] => {
    return items.map((item, index) => ({
      ...item,
      id: item.id || `outline-${index}-${Date.now()}`,
      children: (item as any).children ? processOutline((item as any).children) : undefined
    }))
  }
  
  const processedOutline = processOutline(outline)
  pdfOutline.value = processedOutline
}

const handleGoToPage = (page: number) => {
  if (pdfViewerRef.value && typeof pdfViewerRef.value.goToPage === 'function') {
    pdfViewerRef.value.goToPage(page)
  } else {
    const container = document.querySelector('.pdf-pages')
    if (container) {
      const pageElement = container.querySelector(`[data-page="${page}"]`) as HTMLElement
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
}

const handleOutlineToggle = (collapsed: boolean) => {
  outlineSidebarCollapsed.value = collapsed
  localStorage.setItem('outline-sidebar-collapsed', collapsed.toString())
}

const handleOutlineWidthChanged = (width: number) => {
  outlineSidebarWidth.value = width
  localStorage.setItem('outline-sidebar-width', width.toString())
}

const handleGenerateSmartOutline = async () => {
  if (!selectedFile.value || !pdfViewerRef.value) {
    showNotification('请先打开PDF文件', 'error')
    return
  }

  try {
    const smartOutline = await pdfViewerRef.value.generateSmartOutline()
    if (smartOutline && smartOutline.length > 0) {
      pdfOutline.value = smartOutline
      outlineSidebarCollapsed.value = false
    } else {
      showNotification('未能生成智能目录，请检查PDF内容结构', 'error')
    }
  } catch (error) {
    showNotification('智能目录生成失败: ' + (error as Error).message, 'error')
  }
}

const handleSendMessage = async (message: string) => {
  const model = configManager.getActiveModel('chat')
  if (!model) {
    showNotification('请先在设置中配置聊天模型', 'error')
    return
  }

  const userMessage: ChatMessage = {
    id: `user_${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  chatMessages.value.push(userMessage)

  isChatThinking.value = true

  try {
    const chatHistory = chatMessages.value
      .filter(msg => msg.role !== 'user' || msg.id !== userMessage.id)
      .map(msg => ({ role: msg.role, content: msg.content }))

    const result = await aiService.sendChatMessage(
      model,
      message,
      chatHistory,
      configManager.getConfig().chatPrompt
    )

    if (result.error) {
      showNotification(result.error, 'error')
    } else {
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: result.message,
        timestamp: Date.now()
      }
      chatMessages.value.push(aiMessage)
    }
  } catch (err: any) {
    showNotification(err.message, 'error')
  } finally {
    isChatThinking.value = false
  }
}

const handleNewChat = () => {
  chatMessages.value = []
}

const handleSidebarWidthChanged = (width: number) => {
  localStorage.setItem('sidebar-width', width.toString())
}

const handleSidebarStateChanged = (isCollapsed: boolean, activeTab: string) => {
  sidebarState.isCollapsed = isCollapsed
  sidebarState.activeTab = activeTab as 'translate' | 'chat' | 'history'
}

const addToPdfHistory = async (fileName: string, filePath: string) => {
  const normalizedPath = normalizePath(filePath)
  
  const historyItem: PdfHistoryItem = {
    id: `pdf_${Date.now()}`,
    name: fileName,
    path: normalizedPath,
    openTime: Date.now()
  }
  
  try {
    const updatedHistory = await pdfHistoryManager.addToHistory(historyItem, maxPdfHistory)
    pdfHistory.value = updatedHistory
  } catch (error) {
    console.error('添加PDF历史记录失败:', error)
  }
}

const handleReopenPdf = async (item: PdfHistoryItem) => {
  if (!isAppReady.value) {
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (isAppReady.value) break
    }
    if (!isAppReady.value) {
      alert('应用正在初始化，请稍后再试')
      return
    }
  }

  try {
    if (window.__TAURI_INTERNALS__ && item.path !== item.name) {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      try {
        const fileData = await readFile(item.path)
        const file = new File([fileData], item.name, { type: 'application/pdf' })
        selectedFile.value = file
        item.openTime = Date.now()
        const index = pdfHistory.value.findIndex(h => h.id === item.id)
        if (index > 0) {
          pdfHistory.value.splice(index, 1)
          pdfHistory.value.unshift(item)
          pdfHistoryManager.saveHistory(pdfHistory.value)
        }
      } catch (fileErr) {
        retryDialogData.value = {
          item,
          message: `无法找到文件: ${item.path}`
        }
        showRetryDialog.value = true
      }
    } else {
      fileSelectData.value = item
      showFileSelectDialog.value = true
    }
  } catch (err) {
    showNotification('重新打开PDF失败: ' + (err as Error).message, 'error')
  }
}

const deletePdfHistory = async (id: string) => {
  try {
    const updatedHistory = await pdfHistoryManager.removeFromHistory(id)
    pdfHistory.value = updatedHistory
  } catch (error) {
    console.error('删除PDF历史记录失败:', error)
  }
}

const clearPdfHistory = async () => {
  try {
    await pdfHistoryManager.clearHistory()
    pdfHistory.value = []
  } catch (error) {
    console.error('清空PDF历史记录失败:', error)
  }
}

const loadPdfHistory = async () => {
  try {
    const history = await pdfHistoryManager.loadHistory()
    pdfHistory.value = history
  } catch (error) {
    console.error('加载PDF历史记录失败:', error)
    pdfHistory.value = []
  }
}

const toggleTheme = () => {
  theme.isDark = !theme.isDark;
  applyMaterialTheme(theme.sourceColor, theme.isDark);
};

const updateTheme = (newColor: string, newIsDark: boolean) => {
  theme.sourceColor = newColor;
  theme.isDark = newIsDark;
  applyMaterialTheme(theme.sourceColor, theme.isDark);
};

const openSettings = () => {
  showSettings.value = true;
};

const closeSettings = () => {
  showSettings.value = false;
};

const handleRetryConfirm = async () => {
  if (!retryDialogData.value) return
  const { item } = retryDialogData.value
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const selected = await open({
      multiple: false,
      filters: [{ name: 'PDF文件', extensions: ['pdf'] }],
      defaultPath: item.path
    })
    if (selected) {
      const newPath = selected as string
      const fileData = await readFile(newPath)
      const file = new File([fileData], item.name, { type: 'application/pdf' })
      selectedFile.value = file
      item.path = normalizePath(newPath)
      item.openTime = Date.now()
      const index = pdfHistory.value.findIndex(h => h.id === item.id)
      if (index > 0) {
        pdfHistory.value.splice(index, 1)
        pdfHistory.value.unshift(item)
      }
      pdfHistoryManager.saveHistory(pdfHistory.value)
    }
  } catch (error) {
    console.error('重新选择文件失败:', error)
  }
  retryDialogData.value = null
}

const handleRetryCancel = () => {
  retryDialogData.value = null
}

const handleFileSelectConfirm = () => {
  if (!fileSelectData.value) return
  const item = fileSelectData.value
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pdf'
  input.style.display = 'none'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      selectedFile.value = file
      item.openTime = Date.now()
      const index = pdfHistory.value.findIndex(h => h.id === item.id)
      if (index > 0) {
        pdfHistory.value.splice(index, 1)
        pdfHistory.value.unshift(item)
        pdfHistoryManager.saveHistory(pdfHistory.value)
      }
    }
  }
  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
  fileSelectData.value = null
}

const handleFileSelectCancel = () => {
  fileSelectData.value = null
}

const handleError = (errorMessage: string) => {
  showNotification(errorMessage, 'error')
}

onMounted(async () => {
  console.log('开始应用初始化...');

  const savedTheme = localStorage.getItem("app-theme");
  if (savedTheme) {
    try {
      const { isDark, sourceColor } = JSON.parse(savedTheme);
      theme.isDark = isDark ?? true;
      theme.sourceColor = sourceColor ?? '#6750A4';
    } catch (e) {
      console.error("解析保存的主题失败", e);
    }
  }
  applyMaterialTheme(theme.sourceColor, theme.isDark);

  try {
    await configManager.initialize();
    await pdfHistoryManager.initialize();
    const config = configManager.getConfig();
    translationState.autoTranslate = config.enableSelectionTranslation;
  } catch (error) {
    console.error('配置初始化失败，使用默认配置:', error);
  }
  
  await loadPdfHistory();
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  isAppReady.value = true;
  console.log('应用初始化完成，isAppReady =', isAppReady.value);
});

watch(theme, (newTheme) => {
  applyMaterialTheme(newTheme.sourceColor, newTheme.isDark);
}, { deep: true });
</script>

<style>
#app {
  height: 100vh;
  background-color: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.pdf-viewer-section {
  flex: 1;
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container-lowest);
}

/* Old error toast styles are removed */
</style>