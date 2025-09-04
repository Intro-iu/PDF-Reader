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
  background-color: var(--md-sys-color-surface);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 8px;
}

.panel-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 400;
  color: var(--md-sys-color-on-surface);
}

.auto-translate-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--md-sys-color-on-surface-variant);
}

.auto-translate-toggle input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 52px;
  height: 32px;
  background-color: var(--md-sys-color-surface-container-highest);
  border: 2px solid var(--md-sys-color-outline);
  border-radius: 16px;
  transition: all 0.2s ease-in-out;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 4px;
  width: 16px;
  height: 16px;
  background: var(--md-sys-color-outline);
  border-radius: 50%;
  transition: all 0.2s ease-in-out;
  transform: translateY(-50%);
}

.auto-translate-toggle input:checked + .toggle-slider {
  background-color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}

.auto-translate-toggle input:checked + .toggle-slider::before {
  transform: translate(20px, -50%);
  width: 24px;
  height: 24px;
  background-color: var(--md-sys-color-on-primary);
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
  flex: 1;
}

.text-section h4 {
  margin: 0 0 8px 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
}

.text-container {
  flex: 1;
  padding: 16px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 16px;
  overflow-y: auto;
  min-height: 120px;
}

.selected-text {
  background-color: var(--md-sys-color-surface-container);
}

.translation-result {
  background-color: var(--md-sys-color-surface-container-high);
}

.text-content {
  line-height: 1.6;
  color: var(--md-sys-color-on-surface);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.empty-text {
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
  padding: 20px 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--md-sys-color-on-surface-variant);
  padding: 20px 0;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid var(--md-sys-color-surface-variant);
  border-top-color: var(--md-sys-color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.translate-button,
.copy-button {
  padding: 10px 24px;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  align-self: flex-start;
  margin-top: 12px;
}

.translate-button:hover:not(:disabled),
.copy-button:hover {
  box-shadow: var(--md-sys-elevation-level1);
}

.translate-button:disabled {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  cursor: not-allowed;
}
</style>
