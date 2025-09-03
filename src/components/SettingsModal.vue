'''<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { reactive, onMounted, watch, ref } from 'vue';
import ConfirmDialog from './ConfirmDialog.vue';

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
const showPassword = ref(false);
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
    isModalOpen.value = true;
}

function handleFormSubmit() {
    if (editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey) {
        const newModel: AiModel = { ...editingModel, id: generateModelId() };
        settings.aiModels.push(newModel);
        isModalOpen.value = false;
    }
}

function deleteAiModel(modelId: string) {
    if (confirm('确定要删除这个模型配置吗？')) {
        settings.aiModels = settings.aiModels.filter(model => model.id !== modelId);
        if (settings.activeChatModel === modelId) settings.activeChatModel = '';
        if (settings.activeTranslateModel === modelId) settings.activeTranslateModel = '';
    }
}

function updateAiModelField(modelId: string, field: keyof AiModel, value: any) {
    const model = settings.aiModels.find(m => m.id === modelId);
    if (model) {
        (model as any)[field] = value;
    }
}

// --- 主题切换 ---
const themeIconLight = ref<HTMLElement | null>(null);
const themeIconDark = ref<HTMLElement | null>(null);

function updateThemeIcons() {
    if (themeIconLight.value && themeIconDark.value) {
        themeIconLight.value.style.display = props.theme === 'light' ? 'block' : 'none';
        themeIconDark.value.style.display = props.theme === 'dark' ? 'block' : 'none';
    }
}

function applyTheme(theme: string) {
    document.body.classList.toggle('light-mode', theme === 'light');
    if (themeIconLight.value && themeIconDark.value) {
        themeIconLight.value.style.display = theme === 'light' ? 'block' : 'none';
        themeIconDark.value.style.display = theme === 'dark' ? 'block' : 'none';
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
async function exportConfig() {
    // 导出功能现在是直接保存到应用配置目录，而不是下载文件
    await saveSettings(true);
    showNotification('配置已保存到应用目录', 'success');
}

async function importConfig() {
    showImportConfirmDialog.value = true;
}

async function confirmImportConfig() {
    await loadSettings();
    showNotification('配置已从文件加载', 'success');
    showImportConfirmDialog.value = false;
}

function cancelImportConfig() {
    showImportConfirmDialog.value = false;
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
                                        <button type="button" class="ai-model-delete" @click="deleteAiModel(model.id)">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                        </button>
                                    </div>
                                    <div class="ai-model-fields">
                                        <div class="ai-model-field"><label>模型名称</label><input type="text" :value="model.name" @change="updateAiModelField(model.id, 'name', $event.target.value)"></div>
                                        <div class="ai-model-field"><label>模型标识</label><input type="text" :value="model.modelId" placeholder="如: gpt-3.5-turbo" @change="updateAiModelField(model.id, 'modelId', $event.target.value)"></div>
                                        <div class="ai-model-field full-width"><label>API 端点</label><input type="url" :value="model.apiEndpoint" placeholder="https://api.example.com" @change="updateAiModelField(model.id, 'apiEndpoint', $event.target.value)"></div>
                                        <div class="ai-model-field full-width"><label>API 密钥</label><input type="password" :value="model.apiKey" placeholder="输入API密钥" @change="updateAiModelField(model.id, 'apiKey', $event.target.value)"></div>
                                    </div>
                                    <div class="ai-model-capabilities">
                                        <label class="capability-checkbox"><input type="checkbox" :checked="model.supportsChat" @change="updateAiModelField(model.id, 'supportsChat', $event.target.checked)"> 支持对话</label>
                                        <label class="capability-checkbox"><input type="checkbox" :checked="model.supportsTranslation" @change="updateAiModelField(model.id, 'supportsTranslation', $event.target.checked)"> 支持翻译</label>
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

                    <div class="settings-actions">
                        <button id="settings-reset" class="btn-secondary" @click="resetSettings">重置设置</button>
                        <button id="import-config" class="btn-secondary" @click="importConfig">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>
                            从文件加载
                        </button>
                        <button id="settings-save" class="btn-primary" @click="saveSettings(true)">保存设置到文件</button>
                    </div>
                </div>
            </div>

            <!-- 模型添加/编辑弹窗 -->
            <div v-if="isModalOpen" id="ai-model-modal" class="modal" @click.self="isModalOpen = false">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>
                            <svg class="header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7V10C2 16 6 20.9 12 22C18 20.9 22 16 22 10V7L12 2Z"/>
                            </svg>
                            添加AI模型
                        </h3>
                        <button class="close-btn" @click="isModalOpen = false" title="关闭">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                            </svg>
                        </button>
                    </div>

                    <form @submit.prevent="handleFormSubmit" class="modal-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-model-name">
                                    <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                                    </svg>
                                    模型名称
                                    <span class="required-star">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="modal-model-name" 
                                    v-model="editingModel.name" 
                                    required 
                                    placeholder="请输入模型名称"
                                    class="form-input"
                                >
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-model-id">
                                    <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                    </svg>
                                    模型标识
                                    <span class="required-star">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="modal-model-id" 
                                    v-model="editingModel.modelId" 
                                    required 
                                    placeholder="如: gpt-3.5-turbo, deepseek-chat"
                                    class="form-input"
                                >
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-api-endpoint">
                                    <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M10.59,13.41C11,13.8 11,14.4 10.59,14.81C10.2,15.2 9.6,15.2 9.19,14.81L7.05,12.67L9.19,10.53C9.6,10.12 10.2,10.12 10.59,10.53C11,10.94 11,11.54 10.59,11.95L10.59,13.41M14.81,13.41L13.41,14.81C13,15.2 12.4,15.2 12,14.81C11.6,14.4 11.6,13.8 12,13.41L14.14,11.27L12,9.13C11.6,8.72 11.6,8.12 12,7.71C12.4,7.3 13,7.3 13.41,7.71L15.55,9.85L13.41,12L14.81,13.41M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                    </svg>
                                    API端点
                                    <span class="required-star">*</span>
                                </label>
                                <input 
                                    type="url" 
                                    id="modal-api-endpoint" 
                                    v-model="editingModel.apiEndpoint" 
                                    required 
                                    placeholder="https://api.openai.com/v1/chat/completions"
                                    class="form-input"
                                >
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-api-key">
                                    <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 14C5.9 14 5 13.1 5 12S5.9 10 7 10 9 10.9 9 12 8.1 14 7 14M12.6 10C11.8 7.7 9.6 6 7 6C3.7 6 1 8.7 1 12S3.7 18 7 18C9.6 18 11.8 16.3 12.6 14H16V18H20V14H23V10H12.6Z"/>
                                    </svg>
                                    API密钥
                                    <span class="required-star">*</span>
                                </label>
                                <div class="password-input-container">
                                    <input 
                                        :type="showPassword ? 'text' : 'password'" 
                                        id="modal-api-key" 
                                        v-model="editingModel.apiKey" 
                                        required
                                        placeholder="请输入API密钥"
                                        class="form-input password-input"
                                    >
                                    <button 
                                        type="button" 
                                        class="password-toggle"
                                        @click="showPassword = !showPassword"
                                        :title="showPassword ? '隐藏密钥' : '显示密钥'"
                                    >
                                        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z"/>
                                        </svg>
                                        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="input-hint">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                                    </svg>
                                    您的API密钥将被安全保存，仅用于与AI服务通信
                                </div>
                            </div>
                        </div>

                        <div class="form-row capabilities-row">
                            <div class="capabilities-group">
                                <label class="capabilities-title">模型功能</label>
                                <div class="checkbox-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" v-model="editingModel.supportsChat" class="checkbox-input">
                                        <span class="checkbox-custom"></span>
                                        <svg class="capability-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9V7H18V9H6M14,11V13H6V11H14M16,15H6V17H16V15Z"/>
                                        </svg>
                                        支持对话
                                    </label>
                                    <label class="checkbox-label">
                                        <input type="checkbox" v-model="editingModel.supportsTranslation" class="checkbox-input">
                                        <span class="checkbox-custom"></span>
                                        <svg class="capability-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12.87,15.07L11.18,15.07L11.18,7.98L17.02,7.98L17.02,9.42L12.87,9.42V15.07M2.5,5V8H9.5V5H2.5M2.5,10V13H9.5V10H2.5M2.5,15V18H9.5V15H2.5M11.18,18.8V17.35H17.02V18.8H11.18Z"/>
                                        </svg>
                                        支持翻译
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button 
                                type="button" 
                                class="btn-cancel" 
                                @click="isModalOpen = false"
                            >
                                取消
                            </button>
                            <button 
                                type="submit" 
                                class="btn-confirm" 
                                :disabled="!(editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey)"
                            >
                                <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                                </svg>
                                确认添加
                            </button>
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
                message="这将覆盖当前设置，确定要从文件加载配置吗？"
                warning="当前的设置将被替换！"
                confirm-text="导入"
                :is-danger="true"
                @confirm="confirmImportConfig"
                @cancel="cancelImportConfig"
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
}

.ai-model-delete {
    background: none;
    border: none;
    color: var(--text-tertiary-color);
    cursor: pointer;
    padding: 4px;
}
.ai-model-delete:hover {
    color: var(--danger-color);
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
    gap: 12px;
    padding: 24px 0;
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
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1100;
    animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        backdrop-filter: blur(0px);
    }
    to {
        opacity: 1;
        backdrop-filter: blur(4px);
    }
}

.modal-content {
    background: var(--surface-color);
    border-radius: 12px;
    width: 90vw;
    max-width: 520px;
    position: relative;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color);
    overflow: hidden;
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from {
        transform: translateY(-20px) scale(0.95);
        opacity: 0;
    }
    to {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

.modal-header {
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, var(--surface-color) 0%, rgba(var(--primary-color-rgb), 0.05) 100%);
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary-color);
    display: flex;
    align-items: center;
    gap: 8px;
}

.header-icon {
    width: 20px;
    height: 20px;
    color: var(--primary-color);
}

.close-btn {
    background: none;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary-color);
    cursor: pointer;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: var(--hover-color);
    color: var(--text-primary-color);
}

.close-btn svg {
    width: 16px;
    height: 16px;
}

.modal-form {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary-color);
    display: flex;
    align-items: center;
    gap: 6px;
}

.input-icon {
    width: 16px;
    height: 16px;
    color: var(--text-secondary-color);
}

.required-star {
    color: var(--danger-color);
    font-weight: 600;
}

.form-input {
    padding: 12px 16px;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 14px;
    background: var(--input-background);
    color: var(--text-primary-color);
    transition: all 0.2s ease;
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.1);
}

.form-input::placeholder {
    color: var(--text-tertiary-color);
}

.password-input-container {
    position: relative;
}

.password-input {
    padding-right: 48px;
}

.password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary-color);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.password-toggle:hover {
    background: var(--hover-color);
    color: var(--text-primary-color);
}

.password-toggle svg {
    width: 16px;
    height: 16px;
}

.input-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary-color);
    margin-top: 4px;
}

.input-hint svg {
    width: 14px;
    height: 14px;
    color: var(--primary-color);
    flex-shrink: 0;
}

.capabilities-row {
    background: rgba(var(--primary-color-rgb), 0.05);
    border: 1px solid rgba(var(--primary-color-rgb), 0.1);
    border-radius: 8px;
    padding: 16px;
}

.capabilities-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.capabilities-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary-color);
    margin: 0;
}

.checkbox-group {
    display: flex;
    gap: 20px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary-color);
    transition: all 0.2s ease;
}

.checkbox-label:hover {
    color: var(--primary-color);
}

.checkbox-input {
    display: none;
}

.checkbox-custom {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    position: relative;
    transition: all 0.2s ease;
}

.checkbox-input:checked + .checkbox-custom {
    background: var(--primary-color);
    border-color: var(--primary-color);
}

.checkbox-input:checked + .checkbox-custom::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.capability-icon {
    width: 16px;
    height: 16px;
    color: var(--text-secondary-color);
}

.checkbox-label:hover .capability-icon {
    color: var(--primary-color);
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
}

.btn-cancel {
    padding: 10px 20px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--surface-color);
    color: var(--text-primary-color);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-cancel:hover {
    background: var(--hover-color);
    border-color: var(--text-secondary-color);
}

.btn-confirm {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: var(--primary-color);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
}

.btn-confirm:hover:not(:disabled) {
    background: var(--primary-hover-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
}

.btn-confirm:disabled {
    background: var(--disabled-color);
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
    box-shadow: none;
}

.btn-icon {
    width: 16px;
    height: 16px;
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

</style>

''