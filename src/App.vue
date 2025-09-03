<template>
  <div id="app" :class="{ 'light-mode': theme === 'light' }">
    <div class="app-container">
      <!-- 工具栏 -->
      <Toolbar 
        :theme="theme"
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
          :streaming-message="streamingMessage"
          :streaming-translation="streamingTranslation"
          :pdf-history="pdfHistory"
          :is-app-ready="isAppReady"
          :is-collapsed="sidebarState.isCollapsed"
          :active-tab="sidebarState.activeTab"
          @translate="handleTranslate"
          @toggle-auto-translate="toggleAutoTranslate"
          @send-message="handleSendMessage"
          @send-message-stream="handleSendMessage"
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
      :theme="theme"
      @close="closeSettings"
      @toggle-theme="toggleTheme"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import PdfViewer from './components/PdfViewer_new.vue'
import Sidebar from './components/Sidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import OutlineSidebar from './components/OutlineSidebar.vue'
import { aiService } from './utils/ai'
import { configManager } from './utils/config'
import { applyCSSVariables } from './utils/init'
import type { 
  Theme, 
  PdfViewerState, 
  TranslationState, 
  ChatMessage, 
  OutlineItem, 
  PdfHistoryItem 
} from '@/types'

interface PdfHistoryItem {
  id: string
  name: string
  path: string
  openTime: number
  totalPages?: number
}

// 响应式状态
const theme = ref<Theme>('dark')
const selectedFile = ref<File | null>(null)
const currentPdf = ref<string | null>(null)
const pdfViewerRef = ref()
const isCanvasReady = ref(false)
const showSettings = ref(false)
const error = ref<string | null>(null)
const errorTimer = ref<NodeJS.Timeout | null>(null)
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
const streamingMessage = ref('')
const streamingTranslation = ref('')

// PDF历史记录状态
const pdfHistory = ref<PdfHistoryItem[]>([])
const maxPdfHistory = 50

// 侧栏状态
const sidebarState = reactive({
  isCollapsed: false,
  activeTab: 'translate' as 'translate' | 'chat' | 'history'
})

// 事件处理函数
const handleFileSelected = async (file: File, filePath?: string) => {
  selectedFile.value = file
  
  // 直接使用原始文件路径，不复制文件
  const actualPath = filePath || file.name
  
  console.log('选择的PDF文件:', file.name)
  console.log('文件路径:', actualPath)
  
  // 添加到历史记录 (路径, 文件名)
  addToPdfHistory(actualPath, file.name)
}

const handlePdfLoaded = (info: { totalPages: number }) => {
  pdfViewerState.totalPages = info.totalPages
  pdfViewerState.currentPage = 1
  
  // 更新当前PDF的页数信息
  if (selectedFile.value && pdfHistory.value.length > 0) {
    const currentPdf = pdfHistory.value[0]
    if (currentPdf && currentPdf.name === selectedFile.value.name) {
      currentPdf.totalPages = info.totalPages
      savePdfHistory()
    }
  }
}

const handlePageChanged = (page: number) => {
  pdfViewerState.currentPage = page
}

const handleTextSelected = (text: string) => {
  const trimmedText = text.trim();
  translationState.selectedText = trimmedText;
  
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
  const model = configManager.getActiveModel('translate')
  if (!model) {
    setError('请先在设置中配置翻译模型')
    return
  }

  translationState.isTranslating = true
  translationState.error = null
  streamingTranslation.value = ''

  try {
    // 使用流式翻译
    await aiService.translateTextStream(
      model, 
      text, 
      configManager.getConfig().translateTargetLang,
      configManager.getConfig().translationPrompt
    )
  } catch (err: any) {
    translationState.error = err.message
    setError(err.message)
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

// 目录相关处理函数
const handleOutlineLoaded = (outline: OutlineItem[]) => {
  console.log('App.vue 收到目录数据:', outline)
  pdfOutline.value = outline
  if (outline.length > 0) {
    console.log('PDF目录加载完成，共', outline.length, '个顶级项目')
    console.log('第一个目录项:', outline[0])
  } else {
    console.log('该PDF没有目录或目录为空')
  }
}

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

    // 使用流式输出
    await aiService.sendChatMessageStream(
      model,
      message,
      chatHistory,
      configManager.getConfig().chatPrompt
    )
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
const addToPdfHistory = (filePath: string, fileName: string) => {
  console.log('添加到历史记录:', fileName, '路径:', filePath)
  
  const historyItem: PdfHistoryItem = {
    id: `pdf_${Date.now()}`,
    name: fileName,
    path: filePath,
    openTime: Date.now()
  }
  
  // 检查是否已存在（基于文件路径）
  const existingIndex = pdfHistory.value.findIndex(item => 
    item.path === filePath
  )
  
  if (existingIndex >= 0) {
    // 如果已存在，更新时间并移到最前
    console.log('文件已存在于历史记录中，更新时间')
    pdfHistory.value[existingIndex].openTime = Date.now()
    const item = pdfHistory.value.splice(existingIndex, 1)[0]
    pdfHistory.value.unshift(item)
  } else {
    // 添加新记录到开头
    console.log('添加新的历史记录')
    pdfHistory.value.unshift(historyItem)
  }
  
  // 限制历史记录数量
  if (pdfHistory.value.length > maxPdfHistory) {
    pdfHistory.value = pdfHistory.value.slice(0, maxPdfHistory)
  }
  
  console.log('当前历史记录数量:', pdfHistory.value.length)
  
  // 保存到本地存储
  savePdfHistory()
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
      const { readFile, exists } = await import('@tauri-apps/plugin-fs')
      
      console.log('尝试打开文件:', item.path)
      console.log('文件名:', item.name)
      console.log('路径中是否包含空格:', item.path.includes(' '))
      
      // 尝试多种路径格式
      const pathsToTry = [
        item.path,                              // 原始路径
        item.path.replace(/\//g, '\\'),        // 标准化为Windows路径
        `"${item.path}"`,                      // 添加双引号
        item.path.replace(/\\/g, '/'),         // 标准化为Unix路径
      ]
      
      console.log('将尝试的路径列表:', pathsToTry)
      
      let lastError: Error | null = null
      let success = false
      
      for (const pathToTry of pathsToTry) {
        try {
          console.log(`尝试路径: "${pathToTry}"`)
          
          // 方案1：先检查文件是否存在（如果权限允许）
          try {
            console.log('检查文件是否存在...')
            const fileExists = await exists(pathToTry)
            console.log('文件存在性检查结果:', fileExists)
            
            if (!fileExists) {
              console.log('文件不存在，尝试下一个路径格式')
              continue
            }
          } catch (existsErr) {
            console.log('文件存在性检查失败，直接尝试读取文件:', existsErr)
            // 如果 exists 权限不够，直接尝试读取文件
          }
          
          // 文件存在或跳过检查，读取文件
          console.log('开始读取文件...')
          const fileData = await readFile(pathToTry)
          console.log('文件读取成功，大小:', fileData.length, '字节')
          
          // 创建File对象
          const file = new File([fileData], item.name, { type: 'application/pdf' })
          selectedFile.value = file
          
          // 更新历史记录时间并移到最前面
          item.openTime = Date.now()
          const index = pdfHistory.value.findIndex(h => h.id === item.id)
          if (index > 0) {
            pdfHistory.value.splice(index, 1)
            pdfHistory.value.unshift(item)
            savePdfHistory()
          }
          
          console.log('成功重新打开PDF:', item.name, '使用路径:', pathToTry)
          success = true
          break
          
        } catch (fileErr) {
          console.log(`路径 "${pathToTry}" 失败:`, fileErr)
          lastError = fileErr as Error
          continue
        }
      }
      
      if (!success) {
        console.error('所有路径格式都失败了')
        console.error('最后的错误:', lastError)
        
        // 根据错误类型给出更友好的提示
        let errorMessage = `无法访问文件: ${item.path}`
        const errorMsg = lastError?.message?.toLowerCase() || ''
        
        if (errorMsg.includes('not found') || errorMsg.includes('no such file')) {
          errorMessage = `文件不存在: ${item.path}\n\n可能的原因：\n• 文件已被移动或删除\n• 文件路径包含特殊字符`
        } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
          errorMessage = `没有权限访问文件: ${item.path}`
        } else if (errorMsg.includes('directory')) {
          errorMessage = `文件路径无效: ${item.path}`
        }
        
        retryDialogData.value = {
          item,
          message: errorMessage
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
  // 找到要删除的项目
  const itemToDelete = pdfHistory.value.find(item => item.id === id)
  
  // 如果是缓存文件，尝试删除物理文件
  if (itemToDelete && window.__TAURI_INTERNALS__) {
    try {
      const { appCacheDir } = await import('@tauri-apps/api/path')
      const { remove, exists } = await import('@tauri-apps/plugin-fs')
      
      const cacheDir = await appCacheDir()
      const pdfsDir = `${cacheDir}\\pdfs`
      
      // 检查是否是缓存文件（路径包含缓存目录）
      if (itemToDelete.path.includes(pdfsDir)) {
        const fileExists = await exists(itemToDelete.path)
        if (fileExists) {
          await remove(itemToDelete.path)
          console.log('已删除缓存文件:', itemToDelete.path)
        }
      }
    } catch (err) {
      console.error('删除缓存文件失败:', err)
      // 继续删除历史记录，即使文件删除失败
    }
  }
  
  // 从历史记录中删除
  pdfHistory.value = pdfHistory.value.filter(item => item.id !== id)
  savePdfHistory()
}

const clearPdfHistory = async () => {
  // 子组件已经确认过了，这里直接清空
  console.log('清空PDF历史记录，当前记录数：', pdfHistory.value.length)
  
  // 如果在Tauri环境中，清理所有缓存文件
  if (window.__TAURI_INTERNALS__) {
    try {
      const { appCacheDir } = await import('@tauri-apps/api/path')
      const { remove, exists } = await import('@tauri-apps/plugin-fs')
      
      const cacheDir = await appCacheDir()
      const pdfsDir = `${cacheDir}\\pdfs`
      
      // 删除所有缓存的PDF文件
      for (const item of pdfHistory.value) {
        if (item.path.includes(pdfsDir)) {
          try {
            const fileExists = await exists(item.path)
            if (fileExists) {
              await remove(item.path)
              console.log('已删除缓存文件:', item.path)
            }
          } catch (err) {
            console.error('删除缓存文件失败:', item.path, err)
          }
        }
      }
    } catch (err) {
      console.error('清理缓存文件失败:', err)
    }
  }
  
  pdfHistory.value = []
  savePdfHistory()
  console.log('PDF历史记录已清空')
}

const savePdfHistory = async () => {
  try {
    if (window.__TAURI_INTERNALS__) {
      // Tauri环境，使用后端命令保存
      const { invoke } = await import('@tauri-apps/api/core')
      
      const historyData = {
        items: pdfHistory.value
      }
      
      console.log('通过后端保存历史记录:', historyData)
      await invoke('set_pdf_history', { history: historyData })
      console.log('历史记录保存成功')
    } else {
      // 浏览器环境，回退到localStorage
      localStorage.setItem('pdf-reader-pdf-history', JSON.stringify(pdfHistory.value))
    }
  } catch (error) {
    console.error('保存PDF历史记录失败:', error)
    // 如果后端保存失败，尝试localStorage作为备用
    try {
      localStorage.setItem('pdf-reader-pdf-history', JSON.stringify(pdfHistory.value))
      console.log('已回退到localStorage保存')
    } catch (localStorageError) {
      console.error('localStorage保存也失败:', localStorageError)
    }
  }
}

const loadPdfHistory = async () => {
  try {
    if (window.__TAURI_INTERNALS__) {
      // Tauri环境，使用后端命令加载
      const { invoke } = await import('@tauri-apps/api/core')
      
      console.log('通过后端加载历史记录')
      const historyData = await invoke<{ items: PdfHistoryItem[] }>('get_pdf_history')
      pdfHistory.value = historyData.items
      console.log('从后端加载历史记录成功，记录数:', pdfHistory.value.length)
      return
    }
  } catch (error) {
    console.error('从后端加载PDF历史记录失败:', error)
  }
  
  // 回退到localStorage
  try {
    const stored = localStorage.getItem('pdf-reader-pdf-history')
    if (stored) {
      pdfHistory.value = JSON.parse(stored)
      console.log('从localStorage加载历史记录成功，记录数:', pdfHistory.value.length)
    }
  } catch (error) {
    console.error('从localStorage加载历史记录失败:', error)
  }
}

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

const openSettings = () => {
  showSettings.value = true
}

const closeSettings = () => {
  showSettings.value = false
  applyCSSVariables() // 重新应用 CSS 变量
}

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
      item.path = newPath
      item.openTime = Date.now()
      const index = pdfHistory.value.findIndex(h => h.id === item.id)
      if (index > 0) {
        pdfHistory.value.splice(index, 1)
        pdfHistory.value.unshift(item)
      }
      savePdfHistory()
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
        savePdfHistory()
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
  console.log('开始应用初始化...')
  
  // 应用主题
  const savedTheme = localStorage.getItem('theme') as Theme
  if (savedTheme) {
    theme.value = savedTheme
  }
  console.log('主题加载完成')

  try {
    // 等待配置管理器初始化完成
    await configManager.initialize()
    console.log('配置管理器初始化完成')
    
    // 从已初始化的 configManager 加载配置
    const config = configManager.getConfig()
    translationState.autoTranslate = config.enableSelectionTranslation
    console.log('配置加载完成')
  } catch (error) {
    console.error('配置初始化失败，使用默认配置:', error)
    // 即使配置初始化失败，也要继续
  }
  
  // 加载PDF历史记录
  await loadPdfHistory()
  console.log('PDF历史记录加载完成')
  
  // 设置AI服务事件监听
  aiService.on('streamMessage', (data: { id: string; content: string }) => {
    streamingMessage.value = data.content
  })
  
  aiService.on('streamComplete', (data: { id: string; content: string }) => {
    // 流式输出完成时，添加到聊天消息
    const aiMessage: ChatMessage = {
      id: data.id,
      role: 'assistant',
      content: data.content,
      timestamp: Date.now()
    }
    chatMessages.value.push(aiMessage)
    streamingMessage.value = ''
  })
  
  aiService.on('streamError', (error: string) => {
    setError(error)
    streamingMessage.value = ''
  })
  
  // 翻译相关事件监听
  aiService.on('streamTranslation', (data: { id: string; content: string }) => {
    streamingTranslation.value = data.content
  })
  
  aiService.on('translationComplete', (data: { id: string; content: string }) => {
    // 流式翻译完成时，设置最终翻译结果
    translationState.translatedText = data.content
    streamingTranslation.value = ''
    translationState.isTranslating = false
  })
  
  aiService.on('translationError', (error: string) => {
    setError(error)
    streamingTranslation.value = ''
    translationState.isTranslating = false
    translationState.error = error
  })
  
  // 等待一小段时间确保所有组件都已渲染
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 标记应用已完全初始化
  isAppReady.value = true
  console.log('应用初始化完成，isAppReady =', isAppReady.value)
})

// 清理定时器
onUnmounted(() => {
  if (errorTimer.value) {
    clearTimeout(errorTimer.value)
    errorTimer.value = null
  }
})

// 监听主题变化
watch(theme, (newTheme) => {
  localStorage.setItem('theme', newTheme)
}, { immediate: true })
</script>

<style>
/* CSS 变量定义 */
:root {
  --primary-color: #007acc;
  --primary-hover-color: #005a9e;
  --background-color: #1e1e1e;
  --surface-color: #252526;
  --border-color: #3c3c3c;
  --text-primary-color: #cccccc;
  --text-secondary-color: #858585;
  --input-background: #3c3c3c;
  --input-border: #464647;
  --input-focus-border: #007acc;
  --welcome-color: #6c7086;
  --user-message-bg: #2d2d30;
  --ai-message-bg: #1e1e1e;
  --hover-bg: #2a2d2e;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace;
}

.light-mode {
  --primary-color: #007acc;
  --primary-hover-color: #005a9e;
  --background-color: #f3f4f6;
  --surface-color: #ffffff;
  --border-color: #e5e7eb;
  --text-primary-color: #1f2937;
  --text-secondary-color: #6b7280;
  --input-background: #ffffff;
  --input-border: #d1d5db;
  --input-focus-border: #007acc;
  --welcome-color: #9ca3af;
  --user-message-bg: #f9fafb;
  --ai-message-bg: #ffffff;
  --hover-bg: #f3f4f6;
}

/* 全局样式 */
body, html {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
  background-color: var(--background-color);
  color: var(--text-primary-color);
  height: 100%;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 文本选择样式 */
::selection {
  background: rgba(0, 123, 255, 0.3);
}

#app {
  height: 100vh;
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
}

/* 错误提示 */
.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #f56565;
  color: white;
  padding: 12px 40px 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  z-index: 1001;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
  color: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.toast-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--background-color);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary-color);
}
</style>
