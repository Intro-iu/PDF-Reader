<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }" :style="{ width: sidebarWidth }">
    <!-- 侧边栏切换按钮 -->
    <button 
      class="sidebar-toggle"
      :class="{ collapsed: isCollapsed }"
      @click="toggleSidebar"
      :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
      </svg>
    </button>

    <!-- 侧边栏调整器 -->
    <div 
      v-if="!isCollapsed"
      class="sidebar-resizer"
      @mousedown="startResize"
    />

    <!-- 侧边栏内容 -->
    <div v-if="!isCollapsed" class="sidebar-content">
      <!-- 标签切换 -->
      <div class="sidebar-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path :d="tab.icon"></path>
          </svg>
          {{ tab.label }}
        </button>
      </div>

      <!-- 标签面板 -->
      <div class="tab-panels">
        <!-- 翻译面板 -->
        <div v-if="activeTab === 'translate'" class="tab-panel">
          <TranslatePanel 
            :selected-text="selectedText"
            :translation="translation"
            :is-translating="isTranslating"
            :auto-translate="autoTranslate"
            @translate="handleTranslate"
            @toggle-auto-translate="toggleAutoTranslate"
          />
        </div>

        <!-- 聊天面板 -->
        <div v-if="activeTab === 'chat'" class="tab-panel">
          <ChatPanel 
            :messages="chatMessages"
            :is-thinking="isChatThinking"
            @send-message="handleSendMessage"
            @new-chat="handleNewChat"
          />
        </div>

        <!-- 历史记录面板 -->
        <div v-if="activeTab === 'history'" class="tab-panel">
          <PdfHistoryPanel 
            :pdf-history="pdfHistory || []"
            @reopen-pdf="handleReopenPdf"
            @delete-pdf-history="handleDeletePdfHistory"
            @clear-pdf-history="handleClearPdfHistory"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import TranslatePanel from './TranslatePanel.vue'
import ChatPanel from './ChatPanel.vue'
import PdfHistoryPanel from './PdfHistoryPanel.vue'
import type { ChatMessage } from '@/types'

interface PdfHistoryItem {
  id: string
  name: string
  path: string
  openTime: number
  totalPages?: number
}

interface Props {
  selectedText: string
  translation: string
  isTranslating: boolean
  autoTranslate: boolean
  chatMessages: ChatMessage[]
  isChatThinking: boolean
  pdfHistory?: PdfHistoryItem[]
  isCollapsed?: boolean
  activeTab?: 'translate' | 'chat' | 'history'
}

interface Emits {
  (e: 'translate', text: string): void
  (e: 'toggle-auto-translate'): void
  (e: 'send-message', message: string): void
  (e: 'new-chat'): void
  (e: 'sidebar-width-changed', width: number): void
  (e: 'sidebar-state-changed', collapsed: boolean, activeTab: string): void
  (e: 'reopen-pdf', item: PdfHistoryItem): void
  (e: 'delete-pdf-history', id: string): void
  (e: 'clear-pdf-history'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isCollapsed = ref(props.isCollapsed ?? false)
const sidebarWidthValue = ref(450)
const isResizing = ref(false)
const minWidth = 300
const maxWidth = 800

const activeTab = ref<'translate' | 'chat' | 'history'>(props.activeTab ?? 'translate')

const tabs = [
  {
    id: 'translate' as const,
    label: '翻译',
    icon: 'M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z'
  },
  {
    id: 'chat' as const,
    label: '聊天',
    icon: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z'
  },
  {
    id: 'history' as const,
    label: '历史',
    icon: 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z'
  }
]

// 监听props变化并同步内部状态
watch(() => props.isCollapsed, (newCollapsed) => {
  if (newCollapsed !== undefined && newCollapsed !== isCollapsed.value) {
    isCollapsed.value = newCollapsed
  }
})

watch(() => props.activeTab, (newActiveTab) => {
  if (newActiveTab && newActiveTab !== activeTab.value) {
    activeTab.value = newActiveTab
  }
})

const sidebarWidth = computed(() => {
  return isCollapsed.value ? '0px' : `${sidebarWidthValue.value}px`
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  emit('sidebar-state-changed', isCollapsed.value, activeTab.value)
}

const switchTab = (tabId: 'translate' | 'chat' | 'history') => {
  activeTab.value = tabId
  emit('sidebar-state-changed', isCollapsed.value, activeTab.value)
}

const handleReopenPdf = (item: PdfHistoryItem) => {
  emit('reopen-pdf', item)
}

const handleDeletePdfHistory = (id: string) => {
  emit('delete-pdf-history', id)
}

const handleClearPdfHistory = () => {
  emit('clear-pdf-history')
}

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const resize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const containerRect = document.body.getBoundingClientRect()
  const newWidth = containerRect.right - e.clientX
  const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
  
  sidebarWidthValue.value = clampedWidth
  emit('sidebar-width-changed', clampedWidth)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
}

const handleTranslate = (text: string) => {
  emit('translate', text)
}

const toggleAutoTranslate = () => {
  emit('toggle-auto-translate')
}

const handleSendMessage = (message: string) => {
  emit('send-message', message)
}

const handleNewChat = () => {
  emit('new-chat')
}

onMounted(() => {
  // 加载保存的侧边栏状态
  const saved = localStorage.getItem('sidebar-state')
  if (saved) {
    try {
      const state = JSON.parse(saved)
      isCollapsed.value = state.isCollapsed || false
      sidebarWidthValue.value = state.width || 450
      activeTab.value = state.activeTab || 'translate'
    } catch (error) {
      console.warn('Failed to load sidebar state:', error)
    }
  }
  
  // 发送初始状态
  emit('sidebar-state-changed', isCollapsed.value, activeTab.value)
})

onUnmounted(() => {
  // 保存侧边栏状态
  const state = {
    isCollapsed: isCollapsed.value,
    width: sidebarWidthValue.value,
    activeTab: activeTab.value
  }
  localStorage.setItem('sidebar-state', JSON.stringify(state))
})
</script>

<style scoped>
.sidebar {
  position: relative;
  background-color: var(--surface-color);
  border-left: 1px solid var(--border-color);
  transition: width 0.3s ease;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed {
  width: 0 !important;
  min-width: 0 !important;
  overflow: visible; /* 重要：让按钮在收起状态下仍然可见 */
  border-left: none;
}

.sidebar-toggle {
  position: absolute;
  top: 50%;
  left: -25px;
  transform: translateY(-50%);
  width: 24px;
  height: 60px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  transition: all 0.3s ease;
}

.sidebar-toggle.collapsed {
  left: -24px; /* 调整位置确保在收起状态下可见 */
  border-left: none;
  border-right: 1px solid var(--border-color);
  border-radius: 0 8px 8px 0;
  transform: translateY(-50%);
}

.sidebar-toggle:hover {
  background: var(--hover-bg);
}

.sidebar-toggle svg {
  width: 16px;
  height: 16px;
  color: var(--text-primary-color);
  transition: transform 0.3s ease;
}

.sidebar-toggle.collapsed svg {
  transform: rotate(180deg);
}

.sidebar-resizer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
  background: transparent;
  z-index: 5;
}

.sidebar-resizer:hover {
  background: var(--primary-color);
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sidebar-tabs {
  display: flex;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: var(--text-secondary-color);
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  background: var(--hover-bg);
  color: var(--text-primary-color);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-button svg {
  width: 16px;
  height: 16px;
}

.tab-panels {
  flex: 1;
  overflow: hidden;
}

.tab-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
