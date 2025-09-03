<template>
  <div class="translate-panel">
    <!-- 顶部控制栏 -->
    <div class="panel-header">
      <div class="header-content">
        <div class="header-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 8l6 6 6-6"/>
          </svg>
          <h3>智能翻译</h3>
        </div>
        <label class="auto-translate-toggle">
          <input 
            type="checkbox" 
            :checked="autoTranslate"
            @change="$emit('toggle-auto-translate')"
          >
          <div class="toggle-switch">
            <div class="toggle-slider"></div>
          </div>
          <span class="toggle-label">自动翻译</span>
        </label>
      </div>
    </div>

    <div class="translate-content">
      <!-- 原文区域 -->
      <div class="text-card source-card">
        <div class="card-header">
          <span class="card-title">原文</span>
          <span class="text-length" v-if="selectedText">{{ selectedText.length }} 字符</span>
        </div>
        <div class="card-body">
          <div v-if="selectedText" class="text-content">
            {{ selectedText }}
          </div>
          <div v-else class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
            </svg>
            <p>请在 PDF 中选择文本</p>
          </div>
        </div>
        
        <div v-if="selectedText && !autoTranslate" class="card-footer">
          <button 
            class="translate-btn"
            @click="handleTranslate"
            :disabled="isTranslating"
          >
            <svg v-if="!isTranslating" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2l3.09 6.26L22 9l-5.91 5.74L17.91 22 12 18.26 6.09 22l1.82-7.26L2 9l6.91-1.74L12 2z"/>
            </svg>
            <div v-else class="loading-spinner"></div>
            {{ isTranslating ? '翻译中...' : '开始翻译' }}
          </button>
        </div>
      </div>

      <!-- 翻译结果区域 -->
      <div class="text-card result-card">
        <div class="card-header">
          <span class="card-title">译文</span>
          <button 
            v-if="translation && !streamingTranslation"
            class="copy-btn"
            @click="copyTranslation"
            title="复制翻译"
          >
            <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
        <div class="card-body">
          <!-- 流式翻译中 -->
          <div v-if="streamingTranslation" class="text-content streaming">
            <span class="streaming-text">{{ streamingTranslation }}</span>
            <span class="streaming-cursor">|</span>
          </div>
          <!-- 普通加载中 -->
          <div v-else-if="isTranslating && !streamingTranslation" class="loading-state">
            <div class="loading-spinner"></div>
            <p>AI 正在翻译中...</p>
          </div>
          <!-- 翻译完成 -->
          <div v-else-if="translation" class="text-content result">
            {{ translation }}
          </div>
          <!-- 空状态 -->
          <div v-else class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <p>翻译结果将在这里显示</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedText: string
  translation: string
  isTranslating: boolean
  autoTranslate: boolean
  streamingTranslation?: string
}

interface Emits {
  (e: 'translate', text: string): void
  (e: 'toggle-auto-translate'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleTranslate = () => {
  if (props.selectedText) {
    emit('translate', props.selectedText)
  }
}

const copyTranslation = async () => {
  if (props.translation) {
    try {
      await navigator.clipboard.writeText(props.translation)
      // 这里可以添加一个提示
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }
}
</script>

<style scoped>
.translate-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}

/* 顶部控制栏 */
.panel-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-color);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
  transform: rotate(-90deg);
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary-color);
}

.auto-translate-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.auto-translate-toggle input {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  background: var(--border-color);
  border-radius: 13px;
  transition: all 0.3s ease;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.auto-translate-toggle input:checked + .toggle-switch {
  background: var(--primary-color);
}

.auto-translate-toggle input:checked + .toggle-switch .toggle-slider {
  transform: translateX(22px);
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary-color);
}

/* 内容区域 */
.translate-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
}

/* 文本卡片 */
.text-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--surface-color);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.text-card:hover {
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--input-background);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary-color);
}

.text-length {
  font-size: 12px;
  color: var(--text-secondary-color);
  background: var(--background-color);
  padding: 4px 8px;
  border-radius: 6px;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--background-color);
  color: var(--text-secondary-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: var(--primary-color);
  color: white;
}

.copy-icon {
  width: 16px;
  height: 16px;
}

.card-body {
  flex: 1;
  padding: 20px;
  min-height: 120px;
  display: flex;
  align-items: flex-start;
  overflow-y: auto;
}

.text-content {
  line-height: 1.6;
  color: var(--text-primary-color);
  white-space: pre-wrap;
  word-wrap: break-word;
  width: 100%;
}

.text-content.result {
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary-color);
  width: 100%;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary-color);
  width: 100%;
}

.loading-state p {
  margin: 0;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 流式翻译 */
.streaming {
  position: relative;
}

.streaming-text {
  font-weight: 500;
}

.streaming-cursor {
  color: var(--primary-color);
  font-weight: bold;
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 按钮区域 */
.card-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--input-background);
}

.translate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover-color));
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.translate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.translate-btn:disabled {
  background: var(--border-color);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .translate-content {
    padding: 16px;
    gap: 16px;
  }
  
  .card-header {
    padding: 12px 16px 8px;
  }
  
  .card-body {
    padding: 16px;
    min-height: 100px;
  }
  
  .card-footer {
    padding: 12px 16px;
  }
}
</style>
