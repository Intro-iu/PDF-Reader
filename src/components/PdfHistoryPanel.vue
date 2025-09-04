<template>
  <div class="history-panel">
    <div class="panel-header">
      <h3>PDF 历史记录</h3>
      <div class="history-controls">
        <button 
          @click="clearHistory" 
          class="clear-button"
          :disabled="pdfHistory.length === 0"
          title="清空历史记录"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 统一的确认对话框 -->
    <ConfirmDialog
      v-model:show="showConfirmDialog"
      title="确认清空"
      :message="`确定要清空所有 ${confirmCount} 条PDF历史记录吗？`"
      warning="此操作不可撤销！"
      confirm-text="清空"
      :is-danger="true"
      @confirm="confirmClear"
      @cancel="cancelClear"
    />

    <div class="history-content">
      <div v-if="pdfHistory.length === 0" class="empty-history">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
        <p>暂无PDF历史记录</p>
        <small>打开的PDF文件会自动保存在这里</small>
      </div>

      <div v-else>
        <div class="history-tip">
          <small>💡 点击历史记录可重新打开对应的PDF文件</small>
        </div>
        <div class="history-list">
        <div 
          v-for="item in pdfHistory" 
          :key="item.id"
          class="history-item pdf-item"
          @click="reopenPdf(item)"
          title="点击重新打开此PDF文件"
        >
          <div class="item-header">
            <div class="item-type">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <div class="item-info">
              <div class="item-title">{{ item.name }}</div>
              <div class="item-meta">
                <span class="item-time">{{ formatTime(item.openTime) }}</span>
                <span v-if="item.totalPages" class="item-pages">{{ item.totalPages }}页</span>
              </div>
            </div>
            <div class="item-actions">
              <button 
                @click.stop="deletePdfHistory(item.id)"
                class="delete-button"
                title="删除记录"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
          <div v-if="item.path" class="item-path">{{ item.path }}</div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

interface PdfHistoryItem {
  id: string
  name: string
  path: string
  openTime: number
  totalPages?: number
}

interface Props {
  pdfHistory: PdfHistoryItem[]
  isAppReady: boolean
}

interface Emits {
  (e: 'reopen-pdf', item: PdfHistoryItem): void
  (e: 'delete-pdf-history', id: string): void
  (e: 'clear-pdf-history'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 确认对话框状态
const showConfirmDialog = ref(false)
const confirmCount = ref(0)

const reopenPdf = (item: PdfHistoryItem) => {
  emit('reopen-pdf', item)
}

const deletePdfHistory = (id: string) => {
  emit('delete-pdf-history', id)
}

const clearHistory = () => {
  console.log('准备显示确认对话框，当前历史记录数量：', props.pdfHistory.length)
  confirmCount.value = props.pdfHistory.length
  if (confirmCount.value === 0) return
  
  showConfirmDialog.value = true
}

const confirmClear = () => {
  console.log('用户确认清空历史记录')
  showConfirmDialog.value = false
  emit('clear-pdf-history')
}

const cancelClear = () => {
  console.log('用户取消清空历史记录')
  showConfirmDialog.value = false
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}
</script>

<style scoped>
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 400;
}

.history-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-button {
  background: none;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-button:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-button svg {
  width: 24px;
  height: 24px;
}

.history-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--md-sys-color-on-surface-variant);
}

.empty-history svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-history p {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.empty-history small {
  font-size: 14px;
  opacity: 0.8;
}

.history-tip {
  padding: 8px 16px;
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  margin: 8px;
  border-radius: 8px;
}

.history-tip small {
  font-size: 12px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 12px;
  margin-bottom: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
  transform: translateY(-1px);
  box-shadow: var(--md-sys-elevation-level1);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-type {
  display: flex;
  align-items: center;
  color: var(--md-sys-color-primary);
}

.item-type svg {
  width: 24px;
  height: 24px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--md-sys-color-on-surface);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--md-sys-color-on-surface-variant);
}

.item-actions {
  display: flex;
}

.delete-button {
  background: none;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.delete-button svg {
  width: 20px;
  height: 20px;
}

.item-path {
  font-size: 12px;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
  padding-left: 36px;
}
</style>
