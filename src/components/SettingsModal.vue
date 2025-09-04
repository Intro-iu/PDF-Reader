'''<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { reactive, onMounted, watch, ref } from 'vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { checkForUpdates } from '../utils/updateChecker';
import axios from 'axios';

// --- 类型定义 ---
interface Props {
    theme?: 'light' | 'dark';
}

interface AiModel {
    id: string;
    name: string;
    modelId: string;
    apiEndpoint: string;
    apiKey: string;
    supportsChat: boolean;
    supportsTranslation: boolean;
}

interface AppConfig {
    aiModels: AiModel[];
    activeChatModel: string;
    activeTranslateModel: string;
    translateTargetLang: string;
    autoSaveSettings: boolean;
    enableSelectionTranslation: boolean;
    textSelectionColor: string;
    selectionOpacity: number;
    chatPrompt: string;
    translationPrompt: string;
}

// --- 响应式状态 ---
const settings = reactive<AppConfig>({
    aiModels: [],
    activeChatModel: '',
    activeTranslateModel: '',
    translateTargetLang: 'zh',
    autoSaveSettings: true,
    enableSelectionTranslation: true,
    textSelectionColor: '#007bff',
    selectionOpacity: 30,
    chatPrompt: '你是一个专业的学术论文阅读助手。',
    translationPrompt: 'Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]'
});

const isModalOpen = ref(false);
const editingModel = reactive<Omit<AiModel, 'id'>>({
    name: '',
    modelId: '',
    apiEndpoint: '',
    apiKey: '',
    supportsChat: true,
    supportsTranslation: true
});

// 重置确认对话框状态
const showResetConfirmDialog = ref(false);
const showImportConfirmDialog = ref(false);
const showDeleteModelConfirmDialog = ref(false);
const modelToDelete = ref<string | null>(null);
const checkingUpdate = ref(false);
const currentVersion = ref('1.0.4');

// 模型测试相关状态
const testingModels = ref<Set<string>>(new Set());
const testingNewModel = ref(false);

const emit = defineEmits(['close', 'toggle-theme']);

const props = withDefaults(defineProps<Props>(), {
    theme: 'dark'
});

// --- 生命周期钩子 ---
onMounted(async () => {
    await loadSettings();
    updateThemeIcons();
    watch(() => props.theme, () => {
        updateThemeIcons();
    });
    watch(settings, () => {
        if (settings.autoSaveSettings) {
            saveSettings();
        }
    }, { deep: true });
});

// --- 方法 ---
async function loadSettings() {
    try {
        const loadedConfig = await invoke<AppConfig>('get_config');
        Object.assign(settings, loadedConfig);
        applySettingsToDOM();
    } catch (error) {
        console.error('从后端加载配置失败:', error);
        showNotification('加载配置失败', 'error');
    }
}

async function saveSettings(isManual = false) {
    try {
        await invoke('set_config', { config: JSON.parse(JSON.stringify(settings)) });
        if (isManual) {
            showNotification('设置已保存到文件', 'success');
        }
    } catch (error) {
        console.error('保存配置到后端失败:', error);
        showNotification('保存配置失败', 'error');
    }
}

async function exportSettings() {
    try {
        // 打开文件保存对话框
        const filePath = await save({
            filters: [{
                name: 'JSON配置文件',
                extensions: ['json']
            }],
            defaultPath: 'pdf-reader-config.json'
        });

        if (filePath) {
            // 导出配置到指定文件
            await invoke('export_config_to_file', { 
                filePath: filePath,
                config: JSON.parse(JSON.stringify(settings))
            });
            showNotification('配置已导出到文件', 'success');
        }
    } catch (error) {
        console.error('导出配置文件失败:', error);
        showNotification('导出配置文件失败', 'error');
    }
}

function resetSettings() {
    showResetConfirmDialog.value = true;
}

function confirmResetSettings() {
    const defaultConfig = {
        aiModels: [],
        activeChatModel: '',
        activeTranslateModel: '',
        translateTargetLang: 'zh',
        autoSaveSettings: true,
        enableSelectionTranslation: true,
        textSelectionColor: '#007bff',
        selectionOpacity: 30,
        chatPrompt: '你是一个专业的学术论文阅读助手。',
        translationPrompt: 'Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]'
    };
    Object.assign(settings, defaultConfig);
    saveSettings(true); // 重置后立即保存到后端
    applySettingsToDOM();
    showNotification('设置已重置为默认值', 'info');
    showResetConfirmDialog.value = false;
}

function cancelResetSettings() {
    showResetConfirmDialog.value = false;
}

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
        settings.aiModels.push(newModel);
        testingNewModel.value = false;
        isModalOpen.value = false;
    }
}

function deleteAiModel(modelId: string) {
    // 设置要删除的模型ID并显示确认对话框
    modelToDelete.value = modelId;
    showDeleteModelConfirmDialog.value = true;
}

function confirmDeleteModel() {
    if (!modelToDelete.value) return;
    
    const modelId = modelToDelete.value;
    
    // 找到要删除的模型
    const model = settings.aiModels.find(m => m.id === modelId);
    if (!model) {
        console.warn('模型不存在:', modelId);
        showDeleteModelConfirmDialog.value = false;
        modelToDelete.value = null;
        return;
    }

    console.log('删除模型:', model.name, modelId);
    
    // 从数组中移除模型
    settings.aiModels = settings.aiModels.filter(m => m.id !== modelId);
    
    // 如果删除的是当前选中的模型，需要清空相关设置
    if (settings.activeChatModel === modelId) {
        settings.activeChatModel = '';
    }
    if (settings.activeTranslateModel === modelId) {
        settings.activeTranslateModel = '';
    }
    
    showNotification(`模型 "${model.name || '未命名模型'}" 已删除`, 'success');
    showDeleteModelConfirmDialog.value = false;
    modelToDelete.value = null;
}

function cancelDeleteModel() {
    console.log('用户取消删除模型');
    showDeleteModelConfirmDialog.value = false;
    modelToDelete.value = null;
}

function updateAiModelField(modelId: string, field: keyof AiModel, value: any) {
    const model = settings.aiModels.find(m => m.id === modelId);
    if (model) {
        (model as any)[field] = value;
    }
}

// 测试AI模型连接
async function testAiModel(modelId?: string) {
    let modelConfig;
    
    if (modelId) {
        // 测试现有模型
        modelConfig = settings.aiModels.find(m => m.id === modelId);
        if (!modelConfig) {
            showNotification('模型不存在', 'error');
            return;
        }
        testingModels.value.add(modelId);
    } else {
        // 测试新模型（添加时）
        modelConfig = editingModel;
        testingNewModel.value = true;
    }
    
    // 检查必要字段
    if (!modelConfig.apiEndpoint || !modelConfig.apiKey || !modelConfig.modelId) {
        const message = '请填写完整的API配置信息';
        showNotification(message, 'error');
        if (modelId) {
            testingModels.value.delete(modelId);
        } else {
            testingNewModel.value = false;
        }
        return;
    }
    
    try {
        // 构建测试请求
        const requestData = {
            model: modelConfig.modelId,
            messages: [
                { role: 'user', content: '测试连接，请回复"连接成功"' }
            ],
            max_tokens: 10,
            temperature: 0.1
        };
        
        console.log('Testing AI model:', modelConfig.name, requestData);
        
        const response = await axios.post(modelConfig.apiEndpoint, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${modelConfig.apiKey}`
            },
            timeout: 60000
        });
        
        if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
            console.log('Test response:', response.data);
            const message = `${modelConfig.name || '模型'} 连接测试成功`;
            showNotification(message, 'success');
        } else {
            console.error('Test failed: Response format error');
            const message = `${modelConfig.name || '模型'} 响应格式异常`;
            showNotification(message, 'error');
        }
    } catch (error: any) {
        console.error('Test error:', error);
        
        // 更详细的错误信息
        let errorMessage = `${modelConfig.name || '模型'} 测试失败: `;
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorMessage += '请求超时（60秒），请检查网络连接或API服务状态';
        } else if (error.response) {
            // API返回了错误状态码
            if (error.response.status === 401) {
                errorMessage += 'API密钥无效';
            } else if (error.response.status === 429) {
                errorMessage += 'API调用次数超限';
            } else if (error.response.status >= 500) {
                errorMessage += 'API服务器错误';
            } else {
                errorMessage += `API错误 (${error.response.status})`;
            }
        } else if (error.request) {
            errorMessage += '网络连接失败，请检查网络设置';
        } else {
            errorMessage += error.message || '未知错误';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        if (modelId) {
            testingModels.value.delete(modelId);
        } else {
            testingNewModel.value = false;
        }
    }
}

// 获取测试结果状态

// --- 主题切换 ---
const themeIconLight = ref<HTMLElement | null>(null);
const themeIconDark = ref<HTMLElement | null>(null);

function updateThemeIcons() {
    if (themeIconLight.value && themeIconDark.value) {
        themeIconLight.value.style.display = props.theme === 'light' ? 'block' : 'none';
        themeIconDark.value.style.display = props.theme === 'dark' ? 'block' : 'none';
    }
}

function toggleTheme() {
    emit('toggle-theme');
}

// --- DOM 操作 & 样式更新 ---
function applySettingsToDOM() {
    updateSelectionColor(settings.textSelectionColor);
    updateSelectionOpacity(settings.selectionOpacity);
}

function updateSelectionColor(color: string) {
    document.documentElement.style.setProperty('--text-selection-color', color);
}

function updateSelectionOpacity(opacity: number) {
    document.documentElement.style.setProperty('--text-selection-opacity', (opacity / 100).toString());
}

watch(() => settings.textSelectionColor, (newColor) => updateSelectionColor(newColor));
watch(() => settings.selectionOpacity, (newOpacity) => updateSelectionOpacity(newOpacity));

const notification = ref({ show: false, message: '', type: 'info' });
function showNotification(message: string, type = 'info') {
    notification.value = { show: true, message, type };
    setTimeout(() => {
        notification.value.show = false;
    }, 3000);
}

// --- 文件导入/导出 (现在通过Tauri后端处理，前端只触发) ---
async function importConfig() {
    try {
        // 打开文件选择对话框
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'JSON配置文件',
                extensions: ['json']
            }]
        });

        if (selected && typeof selected === 'string') {
            // 用户选择了文件，显示确认对话框
            showImportConfirmDialog.value = true;
            selectedConfigFile.value = selected;
        }
    } catch (error) {
        console.error('打开文件选择对话框失败:', error);
        showNotification('打开文件选择对话框失败', 'error');
    }
}

const selectedConfigFile = ref<string>('');

async function confirmImportConfig() {
    try {
        if (selectedConfigFile.value) {
            // 调用后端API导入指定文件的配置
            await invoke('import_config_from_file', { filePath: selectedConfigFile.value });
            await loadSettings();
            showNotification('配置已从文件加载', 'success');
        }
    } catch (error) {
        console.error('导入配置文件失败:', error);
        showNotification('导入配置文件失败', 'error');
    } finally {
        showImportConfirmDialog.value = false;
        selectedConfigFile.value = '';
    }
}

function cancelImportConfig() {
    showImportConfirmDialog.value = false;
}

function handleCheckUpdate() {
    checkingUpdate.value = true;
    
    checkForUpdates().then(updateInfo => {
        if (updateInfo.hasUpdate) {
            // 显示更新通知
            showNotification(`发现新版本 v${updateInfo.latestVersion}！`, 'success');
            
            // 创建更新选择对话框
            const choice = confirm(
                `发现新版本 v${updateInfo.latestVersion}！\n\n` +
                `点击"确定"前往发布页查看详情\n` +
                `点击"取消"直接下载更新包`
            );
            
            if (choice) {
                // 前往发布页
                const releaseUrl = updateInfo.releaseUrl || 'https://github.com/ZeroHzzzz/PDF-Reader/releases';
                window.open(releaseUrl, '_blank');
            } else {
                // 直接下载
                if (updateInfo.downloadUrl) {
                    window.open(updateInfo.downloadUrl, '_blank');
                } else {
                    // 如果没有直接下载链接，还是跳转到发布页
                    const releaseUrl = updateInfo.releaseUrl || 'https://github.com/ZeroHzzzz/PDF-Reader/releases';
                    window.open(releaseUrl, '_blank');
                }
            }
        } else {
            showNotification('当前已是最新版本！', 'info');
        }
    }).catch(error => {
        console.error('检查更新失败:', error);
        showNotification('检查更新失败，请稍后重试', 'error');
    }).finally(() => {
        // 延迟重置状态，给用户反馈
        setTimeout(() => {
            checkingUpdate.value = false;
        }, 1000);
    });
}

</script>

<template>
    <div class="modal-overlay" @click="emit('close')">
        <div id="app-container" @click.stop>
            <div id="toolbar">
                <div class="toolbar-left">
                    <button id="back-button" class="back-button" title="返回主页" @click="emit('close')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        返回
                    </button>
                </div>
                <div class="toolbar-center">
                    <h1 class="page-title">设置</h1>
                </div>
                <div class="toolbar-right">
                    <button id="theme-toggle" title="切换深色/浅色模式" @click="toggleTheme">
                        <svg ref="themeIconLight" id="theme-icon-light" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM12 3c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1zm0 16c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1v-1c0-.55-.45-1-1-1zM5.64 5.64c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zm12.72 12.72c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zM3 12c0 .55.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1zm16 0c0 .55.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1h-1c-.55 0-1 .45-1 1zm-9.36 5.36c.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.39.39-.39 1.02 0 1.41zm-1.41-12.72c.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.39.39-.39 1.02 0 1.41z" />
                        </svg>
                        <svg ref="themeIconDark" id="theme-icon-dark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9.37 5.51C9.19 6.15 9.1 6.82 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27C17.45 17.19 14.93 19 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div id="settings-content">
                <div class="settings-container">
                    <div class="settings-section">
                        <h3>AI 模型配置</h3>
                        <div class="ai-models-container">
                            <div class="ai-models-header">
                                <p class="section-description">配置不同的AI模型用于对话和翻译功能</p>
                                <button type="button" id="add-ai-model" class="btn-add" @click="openAddModelModal">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                    </svg>
                                    添加模型
                                </button>
                            </div>
                            <div id="ai-models-list">
                                <div v-if="!settings.aiModels || settings.aiModels.length === 0" class="empty-models-message">
                                    <p>还没有配置任何AI模型</p>
                                    <p>点击"添加模型"按钮开始配置</p>
                                </div>
                                <div v-else v-for="model in settings.aiModels" :key="model.id" class="ai-model-item" :data-model-id="model.id">
                                    <div class="ai-model-header">
                                        <span class="ai-model-name">{{ model.name || '未命名模型' }}</span>
                                        <div class="ai-model-actions">
                                            <button type="button" class="btn-test-header" @click="testAiModel(model.id)" 
                                                    :disabled="!(model.modelId && model.apiEndpoint && model.apiKey) || testingModels.has(model.id)"
                                                    :title="testingModels.has(model.id) ? '测试中...' : '测试连接'">
                                                <span v-if="testingModels.has(model.id)">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
                                                        <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                                                        <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
                                                    </svg>
                                                </span>
                                                <span v-else>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
                                                    </svg>
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
                                <select id="active-chat-model" v-model="settings.activeChatModel">
                                    <option value="">请选择模型</option>
                                    <option v-for="model in settings.aiModels.filter(m => m.supportsChat && m.name && m.apiEndpoint)" :key="model.id" :value="model.id">{{ model.name }}</option>
                                </select>
                                <small>选择用于AI对话的模型</small>
                            </div>
                            <div class="setting-group">
                                <label for="active-translate-model">翻译模型</label>
                                <select id="active-translate-model" v-model="settings.activeTranslateModel">
                                    <option value="">请选择模型</option>
                                    <option v-for="model in settings.aiModels.filter(m => m.supportsTranslation && m.name && m.apiEndpoint)" :key="model.id" :value="model.id">{{ model.name }}</option>
                                </select>
                                <small>选择用于文本翻译的模型</small>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>提示词配置</h3>
                        <p class="section-description">为AI对话和翻译功能自定义系统级提示词（System Prompt）。</p>
                        <div class="settings-grid">
                            <div class="setting-group">
                                <label for="chat-prompt">AI 对话提示词</label>
                                <textarea id="chat-prompt" rows="4" placeholder="例如：你是一个专业的学术论文阅读助手。" v-model="settings.chatPrompt"></textarea>
                                <small>自定义系统级提示词，将在每次对话时被发送给AI模型。</small>
                            </div>
                            <div class="setting-group">
                                <label for="translation-prompt">划词翻译提示词</label>
                                <textarea id="translation-prompt" rows="4" placeholder="例如：Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]" v-model="settings.translationPrompt"></textarea>
                                <small>为划词翻译功能设置提示词。可使用占位符 <code>[SELECTED_TEXT]</code> 和 <code>[TARGET_LANG]</code>。</small>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>应用设置</h3>
                        <div class="settings-grid">
                            <div class="setting-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="auto-save-settings" v-model="settings.autoSaveSettings" />
                                    <span class="checkmark"></span>
                                    自动保存设置
                                </label>
                                <small>自动保存配置更改</small>
                            </div>
                            <div class="setting-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="enable-selection-translation" v-model="settings.enableSelectionTranslation" />
                                    <span class="checkmark"></span>
                                    启用划选翻译
                                </label>
                                <small>选中文本时自动显示翻译选项</small>
                            </div>
                            <div class="setting-group">
                                <label for="text-selection-color">文本选区颜色</label>
                                <div class="color-picker-container">
                                    <input type="color" id="text-selection-color" v-model="settings.textSelectionColor" />
                                    <div class="color-preview-group">
                                        <div v-for="color in ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14']" :key="color"
                                             class="color-preset" :data-color="color" :style="{ backgroundColor: color }"
                                             :class="{ active: settings.textSelectionColor === color }"
                                             @click="settings.textSelectionColor = color"></div>
                                    </div>
                                </div>
                                <small>设置PDF文档中文本选择时的高亮颜色</small>
                            </div>
                            <div class="setting-group">
                                <label for="selection-opacity">选区透明度</label>
                                <div class="slider-container">
                                    <input type="range" id="selection-opacity" min="10" max="80" value="30" step="5" v-model.number="settings.selectionOpacity" />
                                    <span class="slider-value">{{ settings.selectionOpacity }}%</span>
                                </div>
                                <small>调整文本选区的透明度（10% - 80%）</small>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h3>关于</h3>
                        <div class="settings-grid">
                            <div class="setting-group">
                                <label>应用版本</label>
                                <div class="version-info">
                                    <span class="version-text">{{ currentVersion }}</span>
                                    <button type="button" class="btn-check-update" @click="handleCheckUpdate" :disabled="checkingUpdate">
                                        {{ checkingUpdate ? '检查中...' : '检查更新' }}
                                    </button>
                                </div>
                                <small>点击检查更新按钮查看是否有新版本可用</small>
                            </div>
                            <div class="setting-group">
                                <label>开发信息</label>
                                <div class="app-info">
                                    <p>GitHub: <a href="https://github.com/ZeroHzzzz/PDF-Reader" target="_blank">ZeroHzzzz/PDF-Reader</a></p>
                                    <p>技术栈: Vue 3 + Tauri + TypeScript</p>
                                </div>
                                <small>一个简洁的跨平台PDF阅读器</small>
                            </div>
                        </div>
                    </div>

                    <div class="settings-actions">
                        <button id="settings-reset" class="btn-secondary" @click="resetSettings">重置设置</button>
                        <button id="import-config" class="btn-secondary" @click="importConfig">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M12,11L16,15L14.6,16.4L13,14.8V20H11V14.8L9.4,16.4L8,15L12,11Z"/></svg>
                            从文件加载
                        </button>
                        <button id="settings-save" class="btn-primary" @click="saveSettings(true)">保存配置</button>
                        <button id="export-config" class="btn-primary" @click="exportSettings">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M12,19L8,15L9.4,13.6L11,15.2V10H13V15.2L14.6,13.6L16,15L12,19Z"/></svg>
                            导出配置到文件
                        </button>
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
                        
                        <!-- 测试模型连接 -->
                        <div class="form-group test-section">
                            <div class="button-group">
                                <button type="button" class="btn-test" @click="testAiModel()" 
                                        :disabled="!(editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey) || testingNewModel">
                                    <span v-if="testingNewModel">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
                                            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
                                            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
                                        </svg>
                                        测试中...
                                    </span>
                                    <span v-else>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
                                        </svg>
                                        测试连接
                                    </span>
                                </button>
                                <button type="submit" class="btn-confirm" :disabled="!(editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey)">确认添加</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- 通知 -->
            <div v-if="notification.show" :class="`notification notification-${notification.type}`">
                {{ notification.message }}
            </div>

            <!-- 重置设置确认对话框 -->
            <ConfirmDialog
                v-model:show="showResetConfirmDialog"
                title="确认重置设置"
                message="确定要重置所有设置吗？此操作将恢复为默认设置并保存。"
                warning="此操作不可撤销！"
                confirm-text="重置"
                :is-danger="true"
                @confirm="confirmResetSettings"
                @cancel="cancelResetSettings"
            />

            <!-- 导入配置确认对话框 -->
            <ConfirmDialog
                v-model:show="showImportConfirmDialog"
                title="确认导入配置"
                :message="`确定要从以下文件导入配置吗？\n\n${selectedConfigFile}`"
                warning="当前的设置将被完全替换！"
                confirm-text="导入"
                :is-danger="true"
                @confirm="confirmImportConfig"
                @cancel="cancelImportConfig"
            />

            <!-- 删除模型确认对话框 -->
            <ConfirmDialog
                v-model:show="showDeleteModelConfirmDialog"
                title="确认删除模型"
                :message="`确定要删除模型 '${modelToDelete ? settings.aiModels?.find(m => m.id === modelToDelete)?.name || '未命名模型' : ''}' 吗？`"
                warning="此操作不可撤销！"
                confirm-text="删除"
                :is-danger="true"
                @confirm="confirmDeleteModel"
                @cancel="cancelDeleteModel"
            />
        </div>
    </div>
</template>

<style scoped>
/* --- Base Modal Layout --- */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}

#app-container {
    width: 90vw;
    max-width: 800px;
    height: 90vh;
    background-color: var(--surface-color);
    color: var(--text-primary-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

/* --- Toolbar --- */
#toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 56px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.toolbar-center {
    flex-grow: 1;
    text-align: center;
}

.page-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
}

#back-button, #theme-toggle {
    background: none;
    border: none;
    color: var(--text-secondary-color);
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}
#back-button {
    font-size: 0.9rem;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 18px;
}
#back-button:hover, #theme-toggle:hover {
    background-color: var(--hover-color);
    color: var(--text-primary-color);
}
#back-button svg, #theme-toggle svg {
    width: 20px;
    height: 20px;
}

/* --- Settings Content --- */
#settings-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 24px;
}

.settings-container {
    max-width: 100%;
    margin: 0 auto;
}

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

.settings-section h3 {
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

/* --- Form Elements --- */
input[type="text"], input[type="url"], input[type="password"], select, textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--input-border);
    background-color: var(--input-background);
    color: var(--text-primary-color);
    border-radius: 6px;
    font-size: 0.9rem;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color-translucent);
}

textarea {
    resize: vertical;
    min-height: 80px;
}

/* --- AI Model Configuration --- */
.ai-models-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
.ai-models-header .section-description {
    margin-bottom: 0;
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
.btn-add svg {
    width: 16px;
    height: 16px;
}

.empty-models-message {
    text-align: center;
    padding: 32px;
    background-color: var(--surface-secondary-color);
    border-radius: 8px;
    border: 1px dashed var(--border-color);
}
.empty-models-message p {
    margin: 4px 0;
    color: var(--text-secondary-color);
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

.btn-test-header {
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    background-color: var(--surface-secondary-color);
    color: var(--text-primary-color);
    border-color: var(--border-color);
    transition: background-color 0.2s ease;
}

.btn-test-header:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.btn-test-header:disabled {
    background-color: var(--disabled-color);
    color: var(--text-tertiary-color);
    cursor: not-allowed;
    border-color: var(--disabled-color);
}

.ai-model-delete {
    background: none;
    border: none;
    color: var(--text-tertiary-color);
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    transition: all 0.2s ease;
}
.ai-model-delete:hover {
    color: var(--danger-color);
    background-color: rgba(239, 68, 68, 0.1);
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

.capability-checkbox, .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    cursor: pointer;
}

/* --- Custom Checkbox --- */
.checkbox-label input[type="checkbox"] {
    display: none;
}
.checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid var(--input-border);
    border-radius: 4px;
    background-color: var(--input-background);
    position: relative;
    transition: background-color 0.2s, border-color 0.2s;
}
.checkmark::after {
    content: "";
    position: absolute;
    display: none;
    left: 5px;
    top: 1px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}
.checkbox-label input:checked ~ .checkmark {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}
.checkbox-label input:checked ~ .checkmark::after {
    display: block;
}

/* --- Color Picker & Slider --- */
.color-picker-container {
    display: flex;
    align-items: center;
    gap: 12px;
}
input[type="color"] {
    -webkit-appearance: none;
    width: 40px;
    height: 40px;
    border: none;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
    background-color: transparent;
}
input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
}
input[type="color"]::-webkit-color-swatch {
    border: 2px solid var(--border-color);
    border-radius: 50%;
}

.color-preview-group {
    display: flex;
    gap: 8px;
}
.color-preset {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.2s, border-color 0.2s;
}
.color-preset:hover {
    transform: scale(1.1);
}
.color-preset.active {
    border-color: var(--text-primary-color);
}

.slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
}
input[type="range"] {
    flex-grow: 1;
    -webkit-appearance: none;
    height: 6px;
    background: var(--input-background);
    border-radius: 3px;
    outline: none;
    border: 1px solid var(--border-color);
}
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--primary-color);
    cursor: pointer;
    border-radius: 50%;
}
.slider-value {
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 40px;
    text-align: right;
}

/* --- Action Buttons --- */
.settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 24px 0;
    flex-wrap: wrap;
}
.btn-primary, .btn-secondary, .btn-confirm {
    padding: 10px 20px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.btn-primary {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}
.btn-secondary {
    background-color: var(--surface-secondary-color);
    color: var(--text-primary-color);
    border-color: var(--border-color);
}
.btn-secondary:hover {
    background-color: var(--hover-color);
}

/* --- Add Model Modal --- */
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
.modal-content h3 {
    margin-top: 0;
    margin-bottom: 24px;
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
.close:hover {
    color: var(--text-primary-color);
}
.form-group {
    margin-bottom: 16px;
}
.required-star {
    color: var(--danger-color);
    margin-left: 4px;
}
.btn-confirm {
    width: 100%;
    padding: 10px 20px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    transition: background-color 0.2s ease;
}

.btn-confirm:hover:not(:disabled) {
    background-color: var(--primary-color-hover);
    border-color: var(--primary-color-hover);
}

.btn-confirm:disabled {
    background-color: var(--disabled-color);
    color: var(--text-tertiary-color);
    cursor: not-allowed;
    border-color: var(--disabled-color);
}

/* --- Test Buttons and Results --- */
.btn-test {
    padding: 10px 20px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background-color: var(--surface-secondary-color);
    color: var(--text-primary-color);
    border-color: var(--border-color);
    margin-bottom: 0;
    transition: background-color 0.2s ease;
}

.btn-test:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.btn-test:disabled {
    background-color: var(--disabled-color);
    color: var(--text-tertiary-color);
    cursor: not-allowed;
    border-color: var(--disabled-color);
}

.btn-test-small {
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: var(--surface-secondary-color);
    color: var(--text-primary-color);
    border-color: var(--border-color);
    transition: background-color 0.2s ease;
}

.btn-test-small:hover:not(:disabled) {
    background-color: var(--hover-color);
}

.btn-test-small:disabled {
    background-color: var(--disabled-color);
    color: var(--text-tertiary-color);
    cursor: not-allowed;
    border-color: var(--disabled-color);
}

.test-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
    margin-top: 16px;
}

.button-group {
    display: flex;
    gap: 12px;
    align-items: center;
}

.button-group .btn-test {
    flex: 1;
    margin-bottom: 0;
    min-width: 120px;
}

.button-group .btn-confirm {
    flex: 1;
    min-width: 120px;
}

.ai-model-test {
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    margin-top: 8px;
}

/* 旋转动画 */
@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* --- Notification --- */
.notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 6px;
    color: white;
    z-index: 2000;
    font-size: 0.9rem;
}
.notification-info { background-color: #007bff; }
.notification-success { background-color: #28a745; }
.notification-error { background-color: #dc3545; }

/* --- Version and App Info Styles --- */
.version-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}

.version-text {
    font-family: 'Courier New', monospace;
    background: var(--input-background);
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary-color);
    border: 1px solid var(--border-color);
}

.btn-check-update {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.btn-check-update:hover:not(:disabled) {
    background: var(--primary-color-hover);
    transform: translateY(-1px);
}

.btn-check-update:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.app-info {
    margin-top: 8px;
    line-height: 1.6;
}

.app-info p {
    margin: 4px 0;
    font-size: 0.9rem;
    color: var(--text-secondary-color);
}

.app-info a {
    color: var(--primary-color);
    text-decoration: none;
    transition: color 0.2s;
}

.app-info a:hover {
    color: var(--primary-color-hover);
    text-decoration: underline;
}

</style>

''