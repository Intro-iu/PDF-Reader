<template>
  <div class="history-panel">
    <div class="panel-header">
      <h3>PDF 历史记录</h3>
      <div class="history-controls">
        <button 
          @click="clearHistory" 
          class="clear-button"
          :disabled="filteredHistory.length === 0"
          title="清空历史记录"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="history-content">
      <div v-if="filteredHistory.length === 0" class="empty-history">
        <div class="empty-icon">📚</div>
        <p>暂无历史记录</p>
        <small>翻译和聊天记录会自动保存在这里</small>
      </div>

      <div v-else class="history-list">
        <div 
          v-for="item in filteredHistory" 
          :key="item.id"
          class="history-item"
          :class="{ 'translation-item': item.type === 'translation', 'chat-item': item.type === 'chat' }"
        >
          <div class="item-header">
            <div class="item-type">
              <svg v-if="item.type === 'translation'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              <span>{{ item.type === 'translation' ? '翻译' : '聊天' }}</span>
              <span v-if="item.type === 'translation' && item.targetLang" class="target-lang">→ {{ getLanguageName(item.targetLang) }}</span>
            </div>
            <div class="item-time">{{ formatTime(item.timestamp) }}</div>
          </div>

          <div class="item-content">
            <div class="original-text">
              <label>原文:</label>
              <div class="text-content">{{ item.originalText }}</div>
            </div>
            <div class="result-text">
              <label>{{ item.type === 'translation' ? '译文:' : '回复:' }}</label>
              <div class="text-content">{{ item.result }}</div>
            </div>
          </div>

          <div class="item-actions">
            <button @click="reuseItem(item)" class="action-button reuse-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              重用
            </button>
            <button @click="copyText(item.originalText)" class="action-button copy-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              复制
            </button>
            <button @click="deleteItem(item.id)" class="action-button delete-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ActivityHistoryItem } from '@/types'

interface Props {
  historyItems: ActivityHistoryItem[]
}

interface Emits {
  (e: 'reuse-translation', item: ActivityHistoryItem): void
  (e: 'reuse-chat', item: ActivityHistoryItem): void
  (e: 'delete-item', id: string): void
  (e: 'clear-history'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const filterType = ref<'all' | 'translation' | 'chat'>('all')

const filteredHistory = computed(() => {
  if (filterType.value === 'all') {
    return props.historyItems
  }
  return props.historyItems.filter(item => item.type === filterType.value)
})

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInHours * 60)
    return `${minutes}分钟前`
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours)
    return `${hours}小时前`
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24)
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const getLanguageName = (langCode: string) => {
  const langMap: Record<string, string> = {
    'zh': '中文',
    'en': '英文',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语'
  }
  return langMap[langCode] || langCode
}

const reuseItem = (item: ActivityHistoryItem) => {
  if (item.type === 'translation') {
    emit('reuse-translation', item)
  } else {
    emit('reuse-chat', item)
  }
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    console.log('文本已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const deleteItem = (id: string) => {
  emit('delete-item', id)
}

const clearHistory = () => {
  if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
    emit('clear-history')
  }
}
</script>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary-color);
}

.history-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-select {
  background: var(--input-background);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  color: var(--text-primary-color);
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

.clear-button {
  background: none;
  border: none;
  color: var(--text-secondary-color);
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-button:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary-color);
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-button svg {
  width: 16px;
  height: 16px;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary-color);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-history p {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.empty-history small {
  font-size: 14px;
  opacity: 0.8;
}

.history-list {
  padding: 0;
}

.history-item {
  border-bottom: 1px solid var(--border-color);
  padding: 16px 20px;
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background-color: var(--hover-bg);
}

.history-item:last-child {
  border-bottom: none;
}

.translation-item {
  border-left: 3px solid #007acc;
}

.chat-item {
  border-left: 3px solid #28a745;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.item-type {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary-color);
  font-size: 12px;
  font-weight: 500;
}

.item-type svg {
  width: 14px;
  height: 14px;
}

.target-lang {
  color: var(--primary-color);
  font-weight: 600;
}

.item-time {
  font-size: 11px;
  color: var(--text-secondary-color);
}

.item-content {
  margin-bottom: 12px;
}

.original-text,
.result-text {
  margin-bottom: 8px;
}

.original-text label,
.result-text label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary-color);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.text-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary-color);
  background: var(--input-background);
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  max-height: 60px;
  overflow-y: auto;
  word-break: break-word;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary-color);
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: var(--hover-bg);
  color: var(--text-primary-color);
}

.action-button svg {
  width: 12px;
  height: 12px;
}

.reuse-button:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.copy-button:hover {
  border-color: #28a745;
  color: #28a745;
}

.delete-button:hover {
  border-color: #dc3545;
  color: #dc3545;
}
</style>
