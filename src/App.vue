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
        <!-- PDF 查看器 -->
        <div class="pdf-viewer-section">
          <PdfViewer 
            :file="selectedFile"
            @pdf-loaded="handlePdfLoaded"
            @page-changed="handlePageChanged"
            @text-selected="handleTextSelected"
            @error="handleError"
            @translate-text="handleTranslateFromMenu"
            @chat-with-text="handleChatFromMenu"
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
      @close="closeSettings"
    />

    <!-- 错误提示 -->
    <div v-if="error" class="error-toast" @click="clearError">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import PdfViewer from './components/PdfViewer_new.vue'
import Sidebar from './components/Sidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import { aiService } from './utils/ai'
import { configManager } from './utils/config'
import { applyCSSVariables } from './utils/init'
import type { Theme, PdfViewerState, TranslationState, ChatMessage } from './types'

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
const showSettings = ref(false)
const error = ref<string | null>(null)
const isChatThinking = ref(false)

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

// 事件处理函数
const handleFileSelected = (file: File) => {
  selectedFile.value = file
  // 添加到PDF历史记录
  addToPdfHistory(file)
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
    error.value = '请先在设置中配置翻译模型'
    return
  }

  translationState.isTranslating = true
  translationState.error = null

  try {
    const result = await aiService.translateText(
      model, 
      text, 
      configManager.getConfig().translateTargetLang,
      configManager.getConfig().translationPrompt
    )

    if (result.error) {
      translationState.error = result.error
      error.value = result.error
    } else {
      translationState.translatedText = result.translatedText
    }
  } catch (err: any) {
    translationState.error = err.message
    error.value = err.message
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

const handleSendMessage = async (message: string) => {
  const model = configManager.getActiveModel('chat')
  if (!model) {
    error.value = '请先在设置中配置聊天模型'
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
      error.value = result.error
    } else {
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now()
      }
      chatMessages.value.push(aiMessage)
    }
  } catch (err: any) {
    error.value = err.message
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
const addToPdfHistory = (file: File) => {
  const historyItem: PdfHistoryItem = {
    id: `pdf_${Date.now()}`,
    name: file.name,
    path: file.name, // 在浏览器环境中，我们只能获取文件名
    openTime: Date.now()
  }
  
  // 检查是否已存在（基于文件名和大小）
  const existingIndex = pdfHistory.value.findIndex(item => 
    item.name === file.name
  )
  
  if (existingIndex >= 0) {
    // 如果已存在，更新时间并移到最前
    pdfHistory.value[existingIndex].openTime = Date.now()
    const item = pdfHistory.value.splice(existingIndex, 1)[0]
    pdfHistory.value.unshift(item)
  } else {
    // 添加新记录到开头
    pdfHistory.value.unshift(historyItem)
  }
  
  // 限制历史记录数量
  if (pdfHistory.value.length > maxPdfHistory) {
    pdfHistory.value = pdfHistory.value.slice(0, maxPdfHistory)
  }
  
  // 保存到本地存储
  savePdfHistory()
}

const handleReopenPdf = async (item: PdfHistoryItem) => {
  try {
    // 在浏览器环境中，我们无法直接重新打开文件
    // 但我们可以提示用户或提供其他交互方式
    console.log('请重新选择文件:', item.name)
    // 这里可以添加文件选择器的逻辑
  } catch (error) {
    console.error('重新打开PDF失败:', error)
  }
}

const deletePdfHistory = (id: string) => {
  pdfHistory.value = pdfHistory.value.filter(item => item.id !== id)
  savePdfHistory()
}

const clearPdfHistory = () => {
  pdfHistory.value = []
  savePdfHistory()
}

const savePdfHistory = () => {
  try {
    localStorage.setItem('pdf-reader-pdf-history', JSON.stringify(pdfHistory.value))
  } catch (error) {
    console.error('保存PDF历史记录失败:', error)
  }
}

const loadPdfHistory = () => {
  try {
    const saved = localStorage.getItem('pdf-reader-pdf-history')
    if (saved) {
      pdfHistory.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载PDF历史记录失败:', error)
    pdfHistory.value = []
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

const handleError = (errorMessage: string) => {
  error.value = errorMessage
}

const clearError = () => {
  error.value = null
}

// 生命周期
onMounted(() => {
  // 加载保存的主题
  const savedTheme = localStorage.getItem('theme') as Theme
  if (savedTheme) {
    theme.value = savedTheme
  }

  // 从已初始化的 configManager 加载配置
  const config = configManager.getConfig()
  translationState.autoTranslate = config.enableSelectionTranslation
  
  // 加载PDF历史记录
  loadPdfHistory()
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
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  z-index: 1001;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
