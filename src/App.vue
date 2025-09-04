<template>
  <div id="app">
    <div class="app-container">
      <!-- 工具栏 -->
      <Toolbar 
        :is-dark="theme.isDark"
        :pdf-info="pdfViewerState"
        @file-selected="handleFileSelected"
        @toggle-theme="toggleTheme"
        @open-settings="openSettings"
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

    <!-- 错误提示 -->
    <Transition name="toast">
      <div v-if="error" class="error-toast" @click="clearError">
        {{ error }}
        <button class="toast-close" @click.stop="clearError" title="关闭">×</button>
      </div>
    </Transition>

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
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import PdfViewer from './components/PdfViewer.vue'
import Sidebar from './components/Sidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import OutlineSidebar from './components/OutlineSidebar.vue'
import UpdateNotification from './components/UpdateNotification.vue'
import { aiService } from './utils/ai'
import { configManager } from './utils/config'
import { applyMaterialTheme, initializeTheme } from './utils/material-theme'
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
const error = ref<string | null>(null)
const errorTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const isChatThinking = ref(false)
const isAppReady = ref(false) // 应用是否完全初始化完成

// 确认对话框状态
const showRetryDialog = ref(false)
const retryDialogData = ref<{ item: PdfHistoryItem; message: string } | null>(null)
const showFileSelectDialog = ref(false)
const fileSelectData = ref<PdfHistoryItem | null>(null)

// 目录侧栏状态
const pdfOutline = ref<OutlineItem[]>([])
const outlineSidebarCollapsed = ref(false)
const outlineSidebarWidth = ref(250)

interface OutlineItem {
  id: string
  title: string
  page: number
  level: number
}

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
  
  // 如果选中的文本和当前已选中的文本相同，则不需要处理
  if (translationState.selectedText === trimmedText) {
    console.log('Same text selected, skipping...')
    return
  }
  
  // 选中了新的文本，清空之前的翻译结果和错误状态
  translationState.selectedText = trimmedText;
  translationState.translatedText = '';
  translationState.error = null;
  
  // 只有在以下条件都满足时才进行自动翻译：
  // 1. 启用了自动翻译
  // 2. 侧栏没有收起
  // 3. 当前激活的是翻译标签页
  // 4. 确实有文本内容
  if (translationState.autoTranslate && 
      !sidebarState.isCollapsed && 
      sidebarState.activeTab === 'translate' && 
      trimmedText) {
    handleTranslate(trimmedText);
  }
};

const handleTranslate = async (text: string) => {
  // 如果正在翻译相同的文本，则不重复翻译
  if (translationState.isTranslating && translationState.selectedText === text) {
    console.log('Already translating this text, skipping...')
    return
  }

  // 如果当前选中的文本和已经翻译过的文本相同，且有翻译结果，则不重复翻译
  if (translationState.selectedText === text && 
      translationState.translatedText && 
      !translationState.error) {
    console.log('Text already translated, skipping...')
    return
  }

  translationState.isTranslating = true
  translationState.error = null
  console.log('Starting translation, current state:', {
    isTranslating: translationState.isTranslating,
    currentText: translationState.translatedText
  })

  try {
    // 强制重新加载配置以确保使用最新设置
    await configManager.reloadConfig()
    
    // 重新加载配置后再获取翻译模型
    const model = configManager.getActiveModel('translate')
    if (!model) {
      setError('请先在设置中配置翻译模型')
      translationState.isTranslating = false
      return
    }

    translationState.translatedText = '' // 清空之前的翻译结果
    console.log('Starting translation for text:', text)
    
    const config = configManager.getConfig()
    console.log('Translation config:', {
      translateTargetLang: config.translateTargetLang,
      translationPrompt: config.translationPrompt
    })
    
    const result = await aiService.translateTextStream(
      model, 
      text, 
      config.translateTargetLang,
      config.translationPrompt,
      (chunk: string) => {
        // 流式更新翻译结果
        console.log('Received chunk:', chunk)
        translationState.translatedText += chunk
      }
    )

    if (result.error) {
      translationState.error = result.error
      setError(result.error)
    } else {
      // 如果没有通过流式更新，使用最终结果
      if (!translationState.translatedText) {
        translationState.translatedText = result.translatedText
      }
    }
  } catch (err: any) {
    translationState.error = err.message
    setError(err.message)
  } finally {
    translationState.isTranslating = false
  }
}

const toggleAutoTranslate = () => {
  translationState.autoTranslate = !translationState.autoTranslate
  configManager.updateConfig({ enableSelectionTranslation: translationState.autoTranslate })
}

const handleTranslateFromMenu = (text: string) => {
  // 确保侧栏展开且切换到翻译标签页
  if (sidebarState.isCollapsed) {
    sidebarState.isCollapsed = false
  }
  sidebarState.activeTab = 'translate'
  
  // 设置选中文本并开始翻译
  translationState.selectedText = text
  handleTranslate(text)
}

const handleChatFromMenu = (text: string) => {
  // 确保侧栏展开且切换到聊天标签页
  if (sidebarState.isCollapsed) {
    sidebarState.isCollapsed = false
  }
  sidebarState.activeTab = 'chat'
  
  // 预填充聊天输入框内容
  const chatInput = `请帮我分析这段内容："${text}"`
  // 这里可以通过emit或者直接调用发送消息
  handleSendMessage(chatInput)
}

// 处理 PDF 轮廓加载
const handleOutlineLoaded = (outline: OutlineItem[]) => {
  // 为每个轮廓项添加 id（如果没有的话）
  const processOutline = (items: OutlineItem[]): OutlineItem[] => {
    return items.map((item, index) => ({
      ...item,
      id: item.id || `outline-${index}-${Date.now()}`,
      children: (item as any).children ? processOutline((item as any).children) : undefined
    }))
  }
  
  const processedOutline = processOutline(outline)
  console.log('App.vue 收到目录数据:', processedOutline)
  pdfOutline.value = processedOutline
  if (processedOutline.length > 0) {
    console.log('PDF目录加载完成，共', processedOutline.length, '个顶级项目')
    console.log('第一个目录项:', processedOutline[0])
  } else {
    console.log('该PDF没有目录或目录为空')
  }
}

// 目录相关处理函数
const handleGoToPage = (page: number) => {
  // 通过 ref 调用 PdfViewer 的 goToPage 方法
  if (pdfViewerRef.value && typeof pdfViewerRef.value.goToPage === 'function') {
    pdfViewerRef.value.goToPage(page)
  } else {
    // 降级方案：直接操作 DOM
    const container = document.querySelector('.pdf-pages')
    if (container) {
      const pageElement = container.querySelector(`[data-page="${page}"]`) as HTMLElement
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
  console.log('跳转到页面:', page)
}

const handleOutlineToggle = (collapsed: boolean) => {
  outlineSidebarCollapsed.value = collapsed
  // 保存状态到本地存储
  localStorage.setItem('outline-sidebar-collapsed', collapsed.toString())
}

const handleOutlineWidthChanged = (width: number) => {
  outlineSidebarWidth.value = width
  // 保存宽度到本地存储
  localStorage.setItem('outline-sidebar-width', width.toString())
}

const handleGenerateSmartOutline = async () => {
  if (!selectedFile.value || !pdfViewerRef.value) {
    setError('请先打开PDF文件')
    return
  }

  try {
    // 通过PDF查看器组件调用智能目录生成
    const smartOutline = await pdfViewerRef.value.generateSmartOutline()
    if (smartOutline && smartOutline.length > 0) {
      pdfOutline.value = smartOutline
      // 展开目录侧栏以显示生成的目录
      outlineSidebarCollapsed.value = false
    } else {
      setError('未能生成智能目录，请检查PDF内容结构')
    }
  } catch (error) {
    console.error('智能目录生成失败:', error)
    setError('智能目录生成失败: ' + (error as Error).message)
  }
}

const handleSendMessage = async (message: string) => {
  const model = configManager.getActiveModel('chat')
  if (!model) {
    setError('请先在设置中配置聊天模型')
    return
  }

  // 添加用户消息
  const userMessage: ChatMessage = {
    id: `user_${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  chatMessages.value.push(userMessage)

  isChatThinking.value = true

  try {
    // 获取聊天历史
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
      setError(result.error)
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
    setError(err.message)
  } finally {
    isChatThinking.value = false
  }
}

const handleNewChat = () => {
  chatMessages.value = []
}

const handleSidebarWidthChanged = (width: number) => {
  // 可以在这里保存侧边栏宽度到本地存储
  localStorage.setItem('sidebar-width', width.toString())
}

const handleSidebarStateChanged = (isCollapsed: boolean, activeTab: string) => {
  sidebarState.isCollapsed = isCollapsed
  sidebarState.activeTab = activeTab as 'translate' | 'chat' | 'history'
}

// PDF历史记录管理函数
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
    console.log('PDF添加到历史记录:', fileName)
  } catch (error) {
    console.error('添加PDF历史记录失败:', error)
  }
}

const handleReopenPdf = async (item: PdfHistoryItem) => {
  // 检查应用是否已经完全初始化
  if (!isAppReady.value) {
    // 等待最多3秒，如果还未初始化完成则提示用户
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
      // Tauri环境且有真实文件路径
      const { readFile } = await import('@tauri-apps/plugin-fs')
      
      try {
        // 直接通过路径读取文件
        const fileData = await readFile(item.path)
        
        // 创建File对象
        const file = new File([fileData], item.name, { type: 'application/pdf' })
        selectedFile.value = file
        
        // 更新历史记录时间并移到最前面
        item.openTime = Date.now()
        const index = pdfHistory.value.findIndex(h => h.id === item.id)
        if (index > 0) {
          pdfHistory.value.splice(index, 1)
          pdfHistory.value.unshift(item)
          pdfHistoryManager.saveHistory(pdfHistory.value)
        }
        
        console.log('成功重新打开PDF:', item.name)
        
      } catch (fileErr) {
        // 文件可能已被移动或删除，显示确认对话框
        retryDialogData.value = {
          item,
          message: `无法找到文件: ${item.path}`
        }
        showRetryDialog.value = true
      }
    } else {
      // 浏览器环境或没有真实路径，显示文件选择确认对话框
      fileSelectData.value = item
      showFileSelectDialog.value = true
    }
  } catch (err) {
    console.error('重新打开PDF失败:', err)
    setError('重新打开PDF失败: ' + (err as Error).message)
  }
}

const deletePdfHistory = async (id: string) => {
  try {
    const updatedHistory = await pdfHistoryManager.removeFromHistory(id)
    pdfHistory.value = updatedHistory
    console.log('PDF历史记录项已删除')
  } catch (error) {
    console.error('删除PDF历史记录失败:', error)
  }
}

const clearPdfHistory = async () => {
  try {
    await pdfHistoryManager.clearHistory()
    pdfHistory.value = []
    console.log('PDF历史记录已清空')
  } catch (error) {
    console.error('清空PDF历史记录失败:', error)
  }
}

const loadPdfHistory = async () => {
  try {
    const history = await pdfHistoryManager.loadHistory()
    pdfHistory.value = history
    console.log('PDF历史记录加载成功')
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
  console.log('openSettings called');
  showSettings.value = true;
};

const closeSettings = () => {
  showSettings.value = false;
};

// 确认对话框处理函数
const handleRetryConfirm = async () => {
  if (!retryDialogData.value) return
  
  const { item } = retryDialogData.value
  try {
    // 打开文件选择器让用户重新选择
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')
    
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'PDF文件',
        extensions: ['pdf']
      }],
      defaultPath: item.path
    })
    
    if (selected) {
      const newPath = selected as string
      const fileData = await readFile(newPath)
      const file = new File([fileData], item.name, { type: 'application/pdf' })
      selectedFile.value = file
      
      // 更新历史记录中的路径
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
      // 更新历史记录时间
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
  setError(errorMessage)
}

const clearError = () => {
  error.value = null
  if (errorTimer.value) {
    clearTimeout(errorTimer.value)
    errorTimer.value = null
  }
}

const setError = (errorMessage: string) => {
  error.value = errorMessage
  
  // 清除之前的定时器
  if (errorTimer.value) {
    clearTimeout(errorTimer.value)
  }
  
  // 5秒后自动清除错误
  errorTimer.value = setTimeout(() => {
    error.value = null
    errorTimer.value = null
  }, 5000)
}

// 生命周期
onMounted(async () => {
  console.log('开始应用初始化...');

  // 从localStorage加载主题
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
  // 应用加载的主题
  applyMaterialTheme(theme.sourceColor, theme.isDark);

  try {
    // 等待配置管理器初始化完成
    await configManager.initialize();
    console.log('配置管理器初始化完成');
    
    // 等待PDF历史记录管理器初始化完成
    await pdfHistoryManager.initialize();
    console.log('PDF历史记录管理器初始化完成');
    
    // 从已初始化的 configManager 加载配置
    const config = configManager.getConfig();
    translationState.autoTranslate = config.enableSelectionTranslation;
    console.log('配置加载完成');
  } catch (error) {
    console.error('配置初始化失败，使用默认配置:', error);
    // 即使配置初始化失败，也要继续
  }
  
  // 加载PDF历史记录
  await loadPdfHistory();
  console.log('PDF历史记录加载完成');
  
  // 等待一小段时间确保所有组件都已渲染
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 标记应用已完全初始化
  isAppReady.value = true;
  console.log('应用初始化完成，isAppReady =', isAppReady.value);
});

// 清理定时器
onUnmounted(() => {
  if (errorTimer.value) {
    clearTimeout(errorTimer.value);
    errorTimer.value = null;
  }
});

// 监听主题变化并保存
watch(theme, (newTheme) => {
  applyMaterialTheme(newTheme.sourceColor, newTheme.isDark);
}, { deep: true });
</script>

<style>
/* 全局样式将由 style.css 和 material-theme.ts 控制 */

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

/* 错误提示 */
.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  padding: 12px 40px 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  z-index: 1001;
  max-width: 300px;
  box-shadow: var(--md-sys-elevation-level3);
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-close {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--md-sys-color-on-error-container);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.toast-close:hover {
  background-color: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>