<template>
  <div class="settings-overlay" @click="$emit('close')">
    <div class="settings-modal" @click.stop>
      <div class="modal-header">
        <h2>设置</h2>
        <button class="close-button" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <div class="settings-section">
          <h3>AI 模型配置</h3>
          
          <div class="model-list">
            <div 
              v-for="model in aiModels" 
              :key="model.id"
              class="model-item"
            >
              <div class="model-info">
                <div class="model-name">{{ model.name }}</div>
                <div class="model-details">
                  <span>{{ model.modelId }}</span>
                  <span class="model-capabilities">
                    <span v-if="model.supportsChat" class="capability">聊天</span>
                    <span v-if="model.supportsTranslation" class="capability">翻译</span>
                  </span>
                </div>
              </div>
              <div class="model-actions">
                <button @click="editModel(model)" class="edit-button">编辑</button>
                <button @click="deleteModel(model.id)" class="delete-button">删除</button>
              </div>
            </div>
          </div>

          <button @click="addNewModel" class="add-model-button">
            添加新模型
          </button>
        </div>

        <div class="settings-section">
          <h3>翻译设置</h3>
          
          <div class="setting-item">
            <label>目标语言:</label>
            <select v-model="settings.translateTargetLang" @change="saveSettings">
              <option value="zh">中文</option>
              <option value="en">英语</option>
              <option value="ja">日语</option>
              <option value="ko">韩语</option>
              <option value="fr">法语</option>
              <option value="de">德语</option>
              <option value="es">西班牙语</option>
            </select>
          </div>

          <div class="setting-item">
            <label>翻译提示词:</label>
            <textarea 
              v-model="settings.translationPrompt" 
              @input="saveSettings"
              placeholder="可选：自定义翻译提示词"
              rows="3"
            ></textarea>
          </div>

          <div class="setting-item">
            <label>
              <input 
                type="checkbox" 
                v-model="settings.enableSelectionTranslation"
                @change="saveSettings"
              >
              启用选择文本自动翻译
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>聊天设置</h3>
          
          <div class="setting-item">
            <label>聊天提示词:</label>
            <textarea 
              v-model="settings.chatPrompt" 
              @input="saveSettings"
              placeholder="设置 AI 助手的角色和行为"
              rows="4"
            ></textarea>
          </div>
        </div>

        <div class="settings-section">
          <h3>外观设置</h3>
          
          <div class="setting-item">
            <label>文本选择颜色:</label>
            <input 
              type="color" 
              v-model="settings.textSelectionColor"
              @change="saveSettings"
            >
          </div>

          <div class="setting-item">
            <label>选择透明度:</label>
            <input 
              type="range" 
              min="10" 
              max="80" 
              v-model.number="settings.selectionOpacity"
              @input="saveSettings"
            >
            <span>{{ settings.selectionOpacity }}%</span>
          </div>
        </div>
      </div>

      <!-- 模型编辑表单 -->
      <div v-if="showModelForm" class="model-form">
        <h3>{{ editingModel ? '编辑模型' : '添加新模型' }}</h3>
        
        <div class="form-group">
          <label>模型名称:</label>
          <input type="text" v-model="modelForm.name" placeholder="例: GPT-4">
        </div>

        <div class="form-group">
          <label>模型 ID:</label>
          <input type="text" v-model="modelForm.modelId" placeholder="例: gpt-4">
        </div>

        <div class="form-group">
          <label>API 端点:</label>
          <input type="url" v-model="modelForm.apiEndpoint" placeholder="https://api.openai.com/v1/chat/completions">
        </div>

        <div class="form-group">
          <label>API Key:</label>
          <input type="password" v-model="modelForm.apiKey" placeholder="输入 API Key">
        </div>

        <div class="form-group">
          <label>功能支持:</label>
          <div class="checkboxes">
            <label>
              <input type="checkbox" v-model="modelForm.supportsChat">
              支持聊天
            </label>
            <label>
              <input type="checkbox" v-model="modelForm.supportsTranslation">
              支持翻译
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button @click="saveModel" class="save-button">保存</button>
          <button @click="cancelModelEdit" class="cancel-button">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { configManager } from '@/utils/config'
import { applyCSSVariables } from '@/utils/init'
import type { AIModel, AppSettings } from '@/types'

interface Emits {
  (e: 'close'): void
}

defineEmits<Emits>()

const aiModels = ref<AIModel[]>([])
const settings = reactive<AppSettings>({
  aiModels: [],
  activeChatModel: '',
  activeTranslateModel: '',
  translateTargetLang: 'zh',
  chatPrompt: '',
  translationPrompt: '',
  autoSaveSettings: true,
  enableSelectionTranslation: true,
  textSelectionColor: '#007bff',
  selectionOpacity: 30
})

const showModelForm = ref(false)
const editingModel = ref<AIModel | null>(null)
const modelForm = reactive({
  name: '',
  modelId: '',
  apiEndpoint: '',
  apiKey: '',
  supportsChat: true,
  supportsTranslation: true
})

const loadSettings = () => {
  const config = configManager.getConfig()
  aiModels.value = [...config.settings.aiModels]
  Object.assign(settings, config.settings)
}

const saveSettings = () => {
  configManager.updateSettings(settings)
  applyCSSVariables()
}

const addNewModel = () => {
  editingModel.value = null
  Object.assign(modelForm, {
    name: '',
    modelId: '',
    apiEndpoint: '',
    apiKey: '',
    supportsChat: true,
    supportsTranslation: true
  })
  showModelForm.value = true
}

const editModel = (model: AIModel) => {
  editingModel.value = model
  Object.assign(modelForm, model)
  showModelForm.value = true
}

const saveModel = () => {
  const model: AIModel = {
    id: editingModel.value?.id || `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: modelForm.name,
    modelId: modelForm.modelId,
    apiEndpoint: modelForm.apiEndpoint,
    apiKey: modelForm.apiKey,
    supportsChat: modelForm.supportsChat,
    supportsTranslation: modelForm.supportsTranslation
  }

  configManager.addAIModel(model)
  loadSettings()
  showModelForm.value = false
}

const cancelModelEdit = () => {
  showModelForm.value = false
  editingModel.value = null
}

const deleteModel = (modelId: string) => {
  if (confirm('确定要删除这个模型吗？')) {
    configManager.removeAIModel(modelId)
    loadSettings()
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-overlay {
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

.settings-modal {
  background: var(--surface-color);
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary-color);
}

.close-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary-color);
  transition: all 0.2s;
}

.close-button:hover {
  background: var(--hover-bg);
  color: var(--text-primary-color);
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.modal-content {
  padding: 24px;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  color: var(--text-primary-color);
  font-size: 18px;
}

.model-list {
  margin-bottom: 16px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 8px;
}

.model-info {
  flex: 1;
}

.model-name {
  font-weight: 600;
  color: var(--text-primary-color);
  margin-bottom: 4px;
}

.model-details {
  font-size: 14px;
  color: var(--text-secondary-color);
  display: flex;
  gap: 12px;
  align-items: center;
}

.model-capabilities {
  display: flex;
  gap: 4px;
}

.capability {
  background: var(--primary-color);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.model-actions {
  display: flex;
  gap: 8px;
}

.edit-button,
.delete-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.edit-button {
  background: var(--primary-color);
  color: white;
}

.edit-button:hover {
  background: var(--primary-hover-color);
}

.delete-button {
  background: #dc3545;
  color: white;
}

.delete-button:hover {
  background: #c82333;
}

.add-model-button {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.add-model-button:hover {
  background: var(--primary-hover-color);
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary-color);
  font-weight: 500;
}

.setting-item input,
.setting-item select,
.setting-item textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-background);
  color: var(--text-primary-color);
  font-family: inherit;
}

.setting-item input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
}

.setting-item input[type="color"] {
  width: 50px;
  height: 40px;
  padding: 4px;
}

.setting-item input[type="range"] {
  width: calc(100% - 50px);
  margin-right: 12px;
}

.model-form {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--surface-color);
  padding: 24px;
  border-radius: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary-color);
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-background);
  color: var(--text-primary-color);
}

.checkboxes {
  display: flex;
  gap: 16px;
}

.checkboxes label {
  display: flex;
  align-items: center;
  margin-bottom: 0;
}

.checkboxes input {
  width: auto;
  margin-right: 8px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.save-button,
.cancel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.save-button {
  background: var(--primary-color);
  color: white;
}

.save-button:hover {
  background: var(--primary-hover-color);
}

.cancel-button {
  background: var(--border-color);
  color: var(--text-primary-color);
}

.cancel-button:hover {
  background: var(--hover-bg);
}
</style>
