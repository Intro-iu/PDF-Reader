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
            <div class="section-header">
                <p class="section-description">配置不同的AI模型用于对话和翻译功能</p>
                <button type="button" class="filled-button" @click="openAddModelModal">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                    添加模型
                </button>
            </div>
            <div class="models-list">
                <div v-if="!models || models.length === 0" class="empty-list-placeholder">
                    <p>还没有配置任何AI模型</p>
                    <small>点击"添加模型"按钮开始配置</small>
                </div>
                <div v-else v-for="model in models" :key="model.id" class="model-item" :data-model-id="model.id">
                    <div class="model-item-header">
                        <span class="model-name">{{ model.name || '未命名模型' }}</span>
                        <div class="model-actions">
                            <button type="button" class="icon-button" @click="testAiModel(model.id)" :disabled="!(model.modelId && model.apiEndpoint && model.apiKey) || testingModels.has(model.id)" :title="testingModels.has(model.id) ? '测试中...' : '测试连接'">
                                <svg v-if="testingModels.has(model.id)" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="spin"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/></svg>
                                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg>
                            </button>
                            <button type="button" class="icon-button" @click="deleteAiModel(model.id)" title="删除模型">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="model-fields">
                        <div class="form-field"><label>模型名称</label><input type="text" :value="model.name" @change="updateAiModelField(model.id, 'name', ($event.target as HTMLInputElement)?.value || '')"></div>
                        <div class="form-field"><label>模型标识</label><input type="text" :value="model.modelId" placeholder="如: gpt-3.5-turbo" @change="updateAiModelField(model.id, 'modelId', ($event.target as HTMLInputElement)?.value || '')"></div>
                        <div class="form-field full-width"><label>API 端点</label><input type="url" :value="model.apiEndpoint" placeholder="https://api.example.com" @change="updateAiModelField(model.id, 'apiEndpoint', ($event.target as HTMLInputElement)?.value || '')"></div>
                        <div class="form-field full-width"><label>API 密钥</label><input type="password" :value="model.apiKey" placeholder="输入API密钥" @change="updateAiModelField(model.id, 'apiKey', ($event.target as HTMLInputElement)?.value || '')"></div>
                    </div>
                    <div class="model-capabilities">
                        <label class="capability-checkbox"><input type="checkbox" :checked="model.supportsChat" @change="updateAiModelField(model.id, 'supportsChat', ($event.target as HTMLInputElement)?.checked || false)"> <span class="checkmark"></span> 支持对话</label>
                        <label class="capability-checkbox"><input type="checkbox" :checked="model.supportsTranslation" @change="updateAiModelField(model.id, 'supportsTranslation', ($event.target as HTMLInputElement)?.checked || false)"> <span class="checkmark"></span> 支持翻译</label>
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
    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>添加AI模型</h3>
                <button class="icon-button" @click="isModalOpen = false" title="关闭">&times;</button>
            </div>
            <form @submit.prevent="handleFormSubmit" class="modal-form">
                <div class="form-field">
                    <label for="modal-model-name">模型名称<span class="required-star">*</span></label>
                    <input type="text" id="modal-model-name" v-model="editingModel.name" required>
                </div>
                <div class="form-field">
                    <label for="modal-model-id">模型标识<span class="required-star">*</span></label>
                    <input type="text" id="modal-model-id" v-model="editingModel.modelId" required placeholder="如: gpt-3.5-turbo">
                </div>
                <div class="form-field">
                    <label for="modal-api-endpoint">API端点<span class="required-star">*</span></label>
                    <input type="url" id="modal-api-endpoint" v-model="editingModel.apiEndpoint" required placeholder="https://api.example.com">
                </div>
                <div class="form-field">
                    <label for="modal-api-key">API密钥<span class="required-star">*</span></label>
                    <input type="password" id="modal-api-key" v-model="editingModel.apiKey" required>
                </div>
                <div class="form-field">
                    <label class="capability-checkbox"><input type="checkbox" v-model="editingModel.supportsChat"> <span class="checkmark"></span> 支持对话</label>
                    <label class="capability-checkbox"><input type="checkbox" v-model="editingModel.supportsTranslation"> <span class="checkmark"></span> 支持翻译</label>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="outlined-button" @click="testAiModel()" :disabled="!(editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey) || testingNewModel">
                        <svg v-if="testingNewModel" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="spin"><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/></svg>
                        <span v-else>测试连接</span>
                    </button>
                    <button type="submit" class="filled-button" :disabled="!(editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey)">确认添加</button>
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
/* Common styles from GeneralAppSettings */
.settings-section { margin-bottom: 24px; }
h3 { font-size: 16px; font-weight: 500; margin-bottom: 16px; color: var(--md-sys-color-primary); padding-bottom: 8px; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
.section-description { font-size: 14px; color: var(--md-sys-color-on-surface-variant); margin-bottom: 16px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.setting-group { display: flex; flex-direction: column; }
.setting-group label, .form-field label { font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--md-sys-color-on-surface-variant); }
.setting-group small { font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin-top: 8px; line-height: 1.4; opacity: 0.8; }
input[type="text"], input[type="url"], input[type="password"], select { width: 100%; padding: 12px 16px; border: 1px solid var(--md-sys-color-outline); background-color: var(--md-sys-color-surface-container-highest); color: var(--md-sys-color-on-surface); border-radius: 8px; font-size: 1rem; box-sizing: border-box; transition: all 0.2s ease; }
input:focus, select:focus { border-color: var(--md-sys-color-primary); box-shadow: 0 0 0 2px var(--md-sys-color-primary-container); outline: none; }
select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1em; }

/* Component-specific styles */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.models-list { display: flex; flex-direction: column; gap: 16px; }
.empty-list-placeholder { text-align: center; padding: 32px; background-color: var(--md-sys-color-surface-container); border-radius: 12px; border: 1px dashed var(--md-sys-color-outline-variant); }
.empty-list-placeholder p { margin: 0 0 8px; color: var(--md-sys-color-on-surface); }
.empty-list-placeholder small { color: var(--md-sys-color-on-surface-variant); }
.model-item { background-color: var(--md-sys-color-surface-container-high); border: 1px solid var(--md-sys-color-outline-variant); border-radius: 12px; padding: 16px; }
.model-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.model-name { font-weight: 500; color: var(--md-sys-color-on-surface); }
.model-actions { display: flex; align-items: center; gap: 4px; }
.model-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-field.full-width { grid-column: 1 / -1; }
.model-capabilities { margin-top: 16px; display: flex; gap: 24px; }
.capability-checkbox { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; color: var(--md-sys-color-on-surface-variant); }
.capability-checkbox input[type="checkbox"] { display: none; }
.checkmark { width: 18px; height: 18px; border: 2px solid var(--md-sys-color-outline); border-radius: 4px; background-color: var(--md-sys-color-surface-container); position: relative; transition: all 0.2s ease; }
.checkmark::after { content: ""; position: absolute; display: none; left: 5px; top: 1px; width: 5px; height: 10px; border: solid var(--md-sys-color-on-primary); border-width: 0 2px 2px 0; transform: rotate(45deg); }
.capability-checkbox input:checked ~ .checkmark { background-color: var(--md-sys-color-primary); border-color: var(--md-sys-color-primary); }
.capability-checkbox input:checked ~ .checkmark::after { display: block; }

/* Modal styles */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1100; backdrop-filter: blur(2px); }
.modal-dialog { background: var(--md-sys-color-surface-container-high); padding: 24px; border-radius: 28px; width: 90vw; max-width: 500px; position: relative; box-shadow: var(--md-sys-elevation-level3); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h3 { margin: 0; font-size: 22px; font-weight: 400; }
.modal-form { display: flex; flex-direction: column; gap: 16px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
.required-star { color: var(--md-sys-color-error); margin-left: 4px; }

/* Button Styles */
.filled-button, .outlined-button, .icon-button { padding: 10px; border-radius: 20px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; }
.filled-button { background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); padding: 0 24px; }
.filled-button:hover { box-shadow: var(--md-sys-elevation-level1); }
.filled-button:disabled { background-color: var(--md-sys-color-surface-container-highest); color: var(--md-sys-color-on-surface-variant); cursor: not-allowed; }
.outlined-button { background-color: transparent; color: var(--md-sys-color-primary); border: 1px solid var(--md-sys-color-outline); padding: 0 24px; }
.outlined-button:hover { background-color: var(--md-sys-color-surface-container-highest); }
.icon-button { background: transparent; color: var(--md-sys-color-on-surface-variant); width: 40px; padding: 0; border-radius: 50%; }
.icon-button:hover { background-color: var(--md-sys-color-surface-container-highest); }
.icon-button svg { width: 20px; height: 20px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>