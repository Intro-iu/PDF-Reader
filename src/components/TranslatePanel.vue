<template>
  <div class="translate-panel">
    <div class="panel-header">
      <h3>文本翻译</h3>
      <label class="auto-translate-toggle">
        <input 
          type="checkbox" 
          :checked="autoTranslate"
          @change="$emit('toggle-auto-translate')"
        >
        <span class="toggle-slider"></span>
        <span class="toggle-label">自动翻译</span>
      </label>
    </div>

    <div class="translate-content">
      <!-- 选中的文本 -->
      <div class="text-section">
        <h4>选中文本</h4>
        <div class="text-container selected-text">
          <div v-if="selectedText" class="text-content">
            {{ selectedText }}
          </div>
          <div v-else class="empty-text">
            请在 PDF 中选择文本进行翻译
          </div>
        </div>
        
        <button 
          v-if="selectedText && !autoTranslate"
          class="translate-button"
          @click="handleTranslate"
          :disabled="isTranslating"
        >
          {{ isTranslating ? '翻译中...' : '翻译' }}
        </button>
      </div>

      <!-- 翻译结果 -->
      <div class="text-section">
        <h4>翻译结果</h4>
        <div class="text-container translation-result">
          <div v-if="isTranslating" class="loading">
            <div class="loading-spinner"></div>
            正在翻译...
          </div>
          <div v-else-if="translation" class="text-content">
            {{ translation }}
          </div>
          <div v-else class="empty-text">
            翻译结果将显示在这里
          </div>
        </div>
        
        <button 
          v-if="translation"
          class="copy-button"
          @click="copyTranslation"
        >
          复制翻译
        </button>
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
  padding: 16px;
}

.panel-header {
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary-color);
}

.auto-translate-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary-color);
}

.auto-translate-toggle input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--border-color);
  border-radius: 12px;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.auto-translate-toggle input:checked + .toggle-slider {
  background: var(--primary-color);
}

.auto-translate-toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.translate-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden;
}

.text-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.text-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary-color);
}

.text-container {
  flex: 1;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-background);
  overflow-y: auto;
  margin-bottom: 12px;
}

.text-content {
  line-height: 1.6;
  color: var(--text-primary-color);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.empty-text {
  color: var(--text-secondary-color);
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary-color);
  padding: 20px 0;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.translate-button,
.copy-button {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.translate-button:hover:not(:disabled),
.copy-button:hover {
  background: var(--primary-hover-color);
}

.translate-button:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.selected-text {
  background: var(--user-message-bg);
}

.translation-result {
  background: var(--ai-message-bg);
}
</style>
