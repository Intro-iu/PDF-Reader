<script setup lang="ts">
import { ref, reactive } from 'vue';
import axios from 'axios';
import ConfirmDialog from '../ConfirmDialog.vue';
import { useNotification } from '../../composables/useNotification';

// --- 类型定义 ---
interface AiModel {
    id: string;
    name: string;
    modelId: string;
    apiEndpoint: string;
    apiKey: string;
    supportsChat: boolean;
    supportsTranslation: boolean;
}

interface Props {
    models: AiModel[];
    activeChatModel: string;
    activeTranslateModel: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:models', 'update:activeChatModel', 'update:activeTranslateModel']);
const { showNotification } = useNotification();

// --- 响应式状态 ---
const isModalOpen = ref(false);
const editingModel = reactive<Omit<AiModel, 'id'>>({
    name: '',
    modelId: '',
    apiEndpoint: '',
    apiKey: '',
    supportsChat: true,
    supportsTranslation: true
});

const showDeleteModelConfirmDialog = ref(false);
const modelToDelete = ref<string | null>(null);
const testingModels = ref<Set<string>>(new Set());
const testingNewModel = ref(false);

// --- 方法 ---
function generateModelId() {
    return 'model_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function openAddModelModal() {
    Object.assign(editingModel, {
        name: '', modelId: '', apiEndpoint: '', apiKey: '',
        supportsChat: true, supportsTranslation: true
    });
    testingNewModel.value = false;
    isModalOpen.value = true;
}

function handleFormSubmit() {
    if (editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey) {
        const newModel: AiModel = { ...editingModel, id: generateModelId() };
        const updatedModels = [...props.models, newModel];
        emit('update:models', updatedModels);
        testingNewModel.value = false;
        isModalOpen.value = false;
    }
}

function deleteAiModel(modelId: string) {
    modelToDelete.value = modelId;
    showDeleteModelConfirmDialog.value = true;
}

function confirmDeleteModel() {
    if (!modelToDelete.value) return;
    const modelId = modelToDelete.value;
    const model = props.models.find(m => m.id === modelId);
    if (!model) return;

    const updatedModels = props.models.filter(m => m.id !== modelId);
    emit('update:models', updatedModels);

    if (props.activeChatModel === modelId) {
        emit('update:activeChatModel', '');
    }
    if (props.activeTranslateModel === modelId) {
        emit('update:activeTranslateModel', '');
    }

    showNotification(`模型 "${model.name || '未命名模型'}" 已删除`, 'success');
    showDeleteModelConfirmDialog.value = false;
    modelToDelete.value = null;
}

function cancelDeleteModel() {
    showDeleteModelConfirmDialog.value = false;
    modelToDelete.value = null;
}

function updateAiModelField(modelId: string, field: keyof AiModel, value: any) {
    const updatedModels = props.models.map(m => {
        if (m.id === modelId) {
            return { ...m, [field]: value };
        }
        return m;
    });
    emit('update:models', updatedModels);
}

async function testAiModel(modelId?: string) {
    let modelConfig;
    if (modelId) {
        modelConfig = props.models.find(m => m.id === modelId);
        if (!modelConfig) {
            showNotification('模型不存在', 'error');
            return;
        }
        testingModels.value.add(modelId);
    } else {
        modelConfig = editingModel;
        testingNewModel.value = true;
    }

    if (!modelConfig.apiEndpoint || !modelConfig.apiKey || !modelConfig.modelId) {
        showNotification('请填写完整的API配置信息', 'error');
        if (modelId) testingModels.value.delete(modelId);
        else testingNewModel.value = false;
        return;
    }

    try {
        const requestData = {
            model: modelConfig.modelId,
            messages: [{ role: 'user', content: '测试连接，请回复"连接成功"' }],
            max_tokens: 10,
            temperature: 0.1
        };
        const response = await axios.post(modelConfig.apiEndpoint, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${modelConfig.apiKey}`
            },
            timeout: 60000
        });

        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
            showNotification(`${modelConfig.name || '模型'} 连接测试成功`, 'success');
        } else {
            showNotification(`${modelConfig.name || '模型'} 响应格式异常`, 'error');
        }
    } catch (error: any) {
        let errorMessage = `${modelConfig.name || '模型'} 测试失败: `;
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorMessage += '请求超时（60秒）';
        } else if (error.response) {
            if (error.response.status === 401) errorMessage += 'API密钥无效';
            else if (error.response.status === 429) errorMessage += 'API调用次数超限';
            else if (error.response.status >= 500) errorMessage += 'API服务器错误';
            else errorMessage += `API错误 (${error.response.status})`;
        } else if (error.request) {
            errorMessage += '网络连接失败';
        } else {
            errorMessage += error.message || '未知错误';
        }
        showNotification(errorMessage, 'error');
    } finally {
        if (modelId) testingModels.value.delete(modelId);
        else testingNewModel.value = false;
    }
}
</script>

<template>
    <div class="settings-section">
        <h3>AI 模型配置</h3>
        <div class="ai-models-container">
            <div class="ai-models-header">
                <p class="section-description">配置不同的AI模型用于对话和翻译功能</p>
                <button type="button" id="add-ai-model" class="btn-add" @click="openAddModelModal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                    添加模型
                </button>
            </div>
            <div id="ai-models-list">
                <div v-if="!models || models.length === 0" class="empty-models-message">
                    <p>还没有配置任何AI模型</p>
                    <p>点击"添加模型"按钮开始配置</p>
                </div>
                <div v-else v-for="model in models" :key="model.id" class="ai-model-item" :data-model-id="model.id">
                    <div class="ai-model-header">
                        <span class="ai-model-name">{{ model.name || '未命名模型' }}</span>
                        <div class="ai-model-actions">
                            <button type="button" class="btn-test-header" @click="testAiModel(model.id)" :disabled="!(model.modelId && model.apiEndpoint && model.apiKey) || testingModels.has(model.id)" :title="testingModels.has(model.id) ? '测试中...' : '测试连接'">
                                <span v-if="testingModels.has(model.id)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/></svg>
                                </span>
                                <span v-else>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg>
                                </span>
                            </button>
                            <button type="button" class="ai-model-delete" @click="deleteAiModel(model.id)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="ai-model-fields">
                        <div class="ai-model-field"><label>模型名称</label><input type="text" :value="model.name" @change="updateAiModelField(model.id, 'name', ($event.target as HTMLInputElement)?.value || '')"></div>
                        <div class="ai-model-field"><label>模型标识</label><input type="text" :value="model.modelId" placeholder="如: gpt-3.5-turbo" @change="updateAiModelField(model.id, 'modelId', ($event.target as HTMLInputElement)?.value || '')"></div>
                        <div class="ai-model-field full-width"><label>API 端点</label><input type="url" :value="model.apiEndpoint" placeholder="https://api.example.com" @change="updateAiModelField(model.id, 'apiEndpoint', ($event.target as HTMLInputElement)?.value || '')"></div>
                        <div class="ai-model-field full-width"><label>API 密钥</label><input type="password" :value="model.apiKey" placeholder="输入API密钥" @change="updateAiModelField(model.id, 'apiKey', ($event.target as HTMLInputElement)?.value || '')"></div>
                    </div>
                    <div class="ai-model-capabilities">
                        <label class="capability-checkbox"><input type="checkbox" :checked="model.supportsChat" @change="updateAiModelField(model.id, 'supportsChat', ($event.target as HTMLInputElement)?.checked || false)"> 支持对话</label>
                        <label class="capability-checkbox"><input type="checkbox" :checked="model.supportsTranslation" @change="updateAiModelField(model.id, 'supportsTranslation', ($event.target as HTMLInputElement)?.checked || false)"> 支持翻译</label>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="settings-section">
        <h3>当前使用的模型</h3>
        <div class="settings-grid">
            <div class="setting-group">
                <label for="active-chat-model">对话模型</label>
                <select id="active-chat-model" :value="activeChatModel" @change="emit('update:activeChatModel', ($event.target as HTMLSelectElement).value)">
                    <option value="">请选择模型</option>
                    <option v-for="model in models.filter(m => m.supportsChat && m.name && m.apiEndpoint)" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
                <small>选择用于AI对话的模型</small>
            </div>
            <div class="setting-group">
                <label for="active-translate-model">翻译模型</label>
                <select id="active-translate-model" :value="activeTranslateModel" @change="emit('update:activeTranslateModel', ($event.target as HTMLSelectElement).value)">
                    <option value="">请选择模型</option>
                    <option v-for="model in models.filter(m => m.supportsTranslation && m.name && m.apiEndpoint)" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
                <small>选择用于文本翻译的模型</small>
            </div>
        </div>
    </div>

    <!-- 模型添加/编辑弹窗 -->
    <div v-if="isModalOpen" id="ai-model-modal" class="modal" @click.self="isModalOpen = false">
        <div class="modal-content">
            <span class="close" @click="isModalOpen = false">&times;</span>
            <h3>添加AI模型</h3>
            <form @submit.prevent="handleFormSubmit">
                <div class="form-group">
                    <label for="modal-model-name">模型名称<span class="required-star">*</span></label>
                    <input type="text" id="modal-model-name" v-model="editingModel.name" required>
                </div>
                <div class="form-group">
                    <label for="modal-model-id">模型标识<span class="required-star">*</span></label>
                    <input type="text" id="modal-model-id" v-model="editingModel.modelId" required placeholder="如: gpt-3.5-turbo">
                </div>
                <div class="form-group">
                    <label for="modal-api-endpoint">API端点<span class="required-star">*</span></label>
                    <input type="url" id="modal-api-endpoint" v-model="editingModel.apiEndpoint" required placeholder="https://api.example.com">
                </div>
                <div class="form-group">
                    <label for="modal-api-key">API密钥<span class="required-star">*</span></label>
                    <input type="password" id="modal-api-key" v-model="editingModel.apiKey" required>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" v-model="editingModel.supportsChat"> 支持对话</label>
                    <label><input type="checkbox" v-model="editingModel.supportsTranslation"> 支持翻译</label>
                </div>
                
                <div class="form-group test-section">
                    <div class="button-group">
                        <button type="button" class="btn-test" @click="testAiModel()" :disabled="!(editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey) || testingNewModel">
                            <span v-if="testingNewModel">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/></svg>
                                测试中...
                            </span>
                            <span v-else>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg>
                                测试连接
                            </span>
                        </button>
                        <button type="submit" class="btn-confirm" :disabled="!(editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey)">确认添加</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- 删除模型确认对话框 -->
    <ConfirmDialog
        v-model:show="showDeleteModelConfirmDialog"
        title="确认删除模型"
        :message="`确定要删除模型 '${modelToDelete ? models.find(m => m.id === modelToDelete)?.name || '未命名模型' : ''}' 吗？`"
        warning="此操作不可撤销！"
        confirm-text="删除"
        :is-danger="true"
        @confirm="confirmDeleteModel"
        @cancel="cancelDeleteModel"
    />
</template>

<style scoped>
/* Styles are copied from SettingsModal.vue, only including relevant parts */
.settings-section {
    margin-bottom: 40px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 24px;
}
.settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}
h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary-color);
}
.section-description {
    font-size: 0.9rem;
    color: var(--text-secondary-color);
    margin-bottom: 16px;
}
.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
}
.setting-group {
    display: flex;
    flex-direction: column;
}
.setting-group label, .ai-model-field label {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--text-secondary-color);
}
.setting-group small {
    font-size: 0.8rem;
    color: var(--text-tertiary-color);
    margin-top: 8px;
    line-height: 1.4;
}
input[type="text"], input[type="url"], input[type="password"], select {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--input-border);
    background-color: var(--input-background);
    color: var(--text-primary-color);
    border-radius: 6px;
    font-size: 0.9rem;
    box-sizing: border-box;
}
.ai-models-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
.btn-add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
}
.empty-models-message {
    text-align: center;
    padding: 32px;
    background-color: var(--surface-secondary-color);
    border-radius: 8px;
    border: 1px dashed var(--border-color);
}
.ai-model-item {
    background-color: var(--surface-secondary-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 16px;
    padding: 16px;
}
.ai-model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
.ai-model-name {
    font-weight: 600;
    flex: 1;
}
.ai-model-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.btn-test-header, .ai-model-delete {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.ai-model-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
.ai-model-field.full-width {
    grid-column: 1 / -1;
}
.ai-model-capabilities {
    margin-top: 16px;
    display: flex;
    gap: 16px;
}
.capability-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    cursor: pointer;
}
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1100;
}
.modal-content {
    background: var(--surface-color);
    padding: 24px;
    border-radius: 8px;
    width: 90vw;
    max-width: 450px;
    position: relative;
}
.close {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    font-weight: bold;
    color: var(--text-tertiary-color);
    cursor: pointer;
}
.form-group {
    margin-bottom: 16px;
}
.required-star {
    color: var(--danger-color);
    margin-left: 4px;
}
.button-group {
    display: flex;
    gap: 12px;
    align-items: center;
}
.btn-test, .btn-confirm {
    flex: 1;
    padding: 10px 20px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.btn-test {
    background-color: var(--surface-secondary-color);
    color: var(--text-primary-color);
    border-color: var(--border-color);
}
.btn-confirm {
    background-color: var(--primary-color);
    color: white;
}
</style>