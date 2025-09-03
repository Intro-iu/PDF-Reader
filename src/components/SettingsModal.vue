'''<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { reactive, onMounted, watch, ref } from 'vue';

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
    if (confirm('确定要重置所有设置吗？此操作将恢复为默认设置并保存。')) {
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
    }
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
    // 导入现在是从应用配置目录加载
    if (confirm('这将覆盖当前设置，确定要从文件加载配置吗？')) {
        await loadSettings();
        showNotification('配置已从文件加载', 'success');
    }
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
                        <button type="submit" class="btn-confirm" :disabled="!(editingModel.name && editingModel.modelId && editingModel.apiEndpoint && editingModel.apiKey)">确认添加</button>
                    </form>
                </div>
            </div>
            
            <!-- 通知 -->
            <div v-if="notification.show" :class="`notification notification-${notification.type}`">
                {{ notification.message }}
            </div>
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
    background-color: var(--primary-color);
    color: white;
}
.btn-confirm:disabled {
    background-color: var(--disabled-color);
    cursor: not-allowed;
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