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
          @translate="handleTranslate"
          @toggle-auto-translate="toggleAutoTranslate"
          @send-message="handleSendMessage"
          @new-chat="handleNewChat"
          @sidebar-width-changed="handleSidebarWidthChanged"
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
import PdfViewer from './components/PdfViewer.vue'
import Sidebar from './components/Sidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import { aiService } from './utils/ai'
import { configManager } from './utils/config'
import { applyCSSVariables } from './utils/init'
import type { Theme, PdfViewerState, TranslationState, ChatMessage } from './types'

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

// 事件处理函数
const handleFileSelected = (file: File) => {
  selectedFile.value = file
}

const handlePdfLoaded = (info: { totalPages: number }) => {
  pdfViewerState.totalPages = info.totalPages
  pdfViewerState.currentPage = 1
}

const handlePageChanged = (page: number) => {
  pdfViewerState.currentPage = page
}

const handleTextSelected = (text: string) => {
  translationState.selectedText = text
  
  // 如果启用了自动翻译，立即翻译
  if (translationState.autoTranslate && text.trim()) {
    handleTranslate(text)
  }
}

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
      configManager.getConfig().settings.translateTargetLang,
      configManager.getConfig().settings.translationPrompt
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
  configManager.updateSettings({ enableSelectionTranslation: translationState.autoTranslate })
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
      configManager.getConfig().settings.chatPrompt
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

  // 加载配置
  const config = configManager.getConfig()
  translationState.autoTranslate = config.settings.enableSelectionTranslation
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
