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

    <!-- 自定义确认对话框 -->
    <div v-if="showConfirmDialog" class="confirm-overlay" @click="cancelClear">
      <div class="confirm-dialog" @click.stop>
        <div class="dialog-header">
          <h4>确认清空</h4>
        </div>
        <div class="dialog-content">
          <p>确定要清空所有 <strong>{{ confirmCount }}</strong> 条PDF历史记录吗？</p>
          <p class="warning">⚠️ 此操作不可撤销！</p>
        </div>
        <div class="dialog-actions">
          <button @click="cancelClear" class="cancel-btn">取消</button>
          <button @click="confirmClear" class="confirm-btn">确定</button>
        </div>
      </div>
    </div>

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
import { computed, nextTick, ref } from 'vue'

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
  background: var(--sidebar-bg);
  color: var(--text-primary);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.history-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.clear-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-button:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
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
  color: var(--text-secondary);
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
  background: var(--card-bg);
  border-radius: 6px;
  margin: 8px;
  border-left: 3px solid var(--primary-color);
}

.history-tip small {
  color: var(--text-secondary);
  font-size: 12px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.pdf-item {
  border-left: 3px solid #e74c3c;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.item-type {
  display: flex;
  align-items: center;
  color: #e74c3c;
}

.item-type svg {
  width: 16px;
  height: 16px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 600;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.item-time {
  color: var(--text-secondary);
}

.item-pages {
  color: var(--text-secondary);
}

.item-actions {
  display: flex;
  gap: 4px;
}

.delete-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background: var(--error-color);
  color: white;
}

.delete-button svg {
  width: 12px;
  height: 12px;
}

.item-path {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.8;
}

/* 滚动条样式 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 确认对话框样式 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: var(--surface-color);
  border-radius: 8px;
  padding: 24px;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-header h4 {
  margin: 0 0 16px 0;
  color: var(--text-primary);
  font-size: 18px;
}

.dialog-content p {
  margin: 0 0 12px 0;
  color: var(--text-primary);
  line-height: 1.5;
}

.dialog-content .warning {
  color: #f39c12;
  font-weight: 500;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn, .confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.cancel-btn {
  background: var(--border-color);
  color: var(--text-primary);
}

.cancel-btn:hover {
  background: var(--text-secondary);
}

.confirm-btn {
  background: #e74c3c;
  color: white;
}

.confirm-btn:hover {
  background: #c0392b;
}
</style>
