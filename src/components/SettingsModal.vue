<script setup lang="ts">
import { reactive, onMounted, watch, ref } from 'vue';
import { useConfig } from '../composables/useConfig';
import { useNotification } from '../composables/useNotification';
import ConfirmDialog from './ConfirmDialog.vue';
import AiModelsSettings from './settings/AiModelsSettings.vue';
import PromptSettings from './settings/PromptSettings.vue';
import GeneralAppSettings from './settings/GeneralAppSettings.vue';
import AboutSection from './settings/AboutSection.vue';

// --- 类型定义 ---
interface AiModel {
    id: string; name: string; modelId: string; apiEndpoint: string; apiKey: string; supportsChat: boolean; supportsTranslation: boolean;
}
interface AppConfig {
    aiModels: AiModel[]; activeChatModel: string; activeTranslateModel: string; translateTargetLang: string; autoSaveSettings: boolean; enableSelectionTranslation: boolean; textSelectionColor: string; selectionOpacity: number; chatPrompt: string; translationPrompt: string;
}
interface Props {
    theme?: 'light' | 'dark';
}

// --- 组件Props和Emits ---
const props = withDefaults(defineProps<Props>(), { theme: 'dark' });
const emit = defineEmits(['close', 'toggle-theme']);

// --- 核心状态 ---
const settings = reactive<AppConfig>({
    aiModels: [], activeChatModel: '', activeTranslateModel: '', translateTargetLang: 'zh', autoSaveSettings: true, enableSelectionTranslation: true, textSelectionColor: '#007bff', selectionOpacity: 30, chatPrompt: '你是一个专业的学术论文阅读助手。', translationPrompt: 'Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]'
});
const currentVersion = ref('1.0.4');

// --- Composables ---
const configManager = useConfig(settings);
const { showNotification } = useNotification();

// --- UI状态 ---
const showResetConfirmDialog = ref(false);
const showImportConfirmDialog = ref(false);
const selectedConfigFile = ref<string>('');

// --- 生命周期与监听 ---
onMounted(async () => {
    await handleLoadSettings();
    applySettingsToDOM();
    watch(() => props.theme, updateThemeIcons, { immediate: true });
    watch(settings, () => {
        if (settings.autoSaveSettings) {
            configManager.save();
        }
    }, { deep: true });
});

// --- 方法 (作为Composable的包装器，处理UI反馈) ---
async function handleLoadSettings() {
    try {
        await configManager.load();
        applySettingsToDOM();
    } catch (error) {
        console.error('加载配置失败:', error);
        showNotification('加载配置失败', 'error');
    }
}

async function handleSaveSettings() {
    try {
        await configManager.save();
        showNotification('设置已保存到文件', 'success');
    } catch (error) {
        console.error('保存配置失败:', error);
        showNotification('保存配置失败', 'error');
    }
}

async function handleExportSettings() {
    try {
        const success = await configManager.exportToFile();
        if (success) {
            showNotification('配置已导出到文件', 'success');
        }
    } catch (error) {
        console.error('导出配置文件失败:', error);
        showNotification('导出配置文件失败', 'error');
    }
}

async function handleImportSettings() {
    try {
        const success = await configManager.importFromFile();
        if (success) {
            await handleLoadSettings();
            showNotification('配置已从文件加载', 'success');
        }
    } catch (error) {
        console.error('导入配置文件失败:', error);
        showNotification('导入配置文件失败', 'error');
    }
}

function handleResetSettings() {
    showResetConfirmDialog.value = true;
}

function confirmResetSettings() {
    try {
        configManager.reset();
        applySettingsToDOM();
        showNotification('设置已重置为默认值', 'info');
    } catch (error) {
        showNotification('重置失败', 'error');
    }
    showResetConfirmDialog.value = false;
}

// --- UI & 其他方法 ---
function applySettingsToDOM() {
    document.documentElement.style.setProperty('--text-selection-color', settings.textSelectionColor);
    document.documentElement.style.setProperty('--text-selection-opacity', (settings.selectionOpacity / 100).toString());
}

const themeIconLight = ref<HTMLElement | null>(null);
const themeIconDark = ref<HTMLElement | null>(null);

function updateThemeIcons() {
    if (themeIconLight.value && themeIconDark.value) {
        themeIconLight.value.style.display = props.theme === 'light' ? 'block' : 'none';
        themeIconDark.value.style.display = props.theme === 'dark' ? 'block' : 'none';
    }
}

</script>

<template>
    <div class="modal-overlay" @click="emit('close')">
        <div id="app-container" @click.stop>
            <div id="toolbar">
                <div class="toolbar-left">
                    <button class="back-button" title="返回主页" @click="emit('close')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                        返回
                    </button>
                </div>
                <div class="toolbar-center">
                    <h1 class="page-title">设置</h1>
                </div>
                <div class="toolbar-right">
                    <button title="切换深色/浅色模式" @click="emit('toggle-theme')">
                        <svg ref="themeIconLight" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM12 3c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1zm0 16c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1v-1c0-.55-.45-1-1-1zM5.64 5.64c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zm12.72 12.72c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zM3 12c0 .55.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1zm16 0c0 .55.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1h-1c-.55 0-1 .45-1 1zm-9.36 5.36c.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.39.39-.39 1.02 0 1.41zm-1.41-12.72c.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.39.39-.39 1.02 0 1.41z" /></svg>
                        <svg ref="themeIconDark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9.37 5.51C9.19 6.15 9.1 6.82 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27C17.45 17.19 14.93 19 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49z" /></svg>
                    </button>
                </div>
            </div>

            <div id="settings-content">
                <div class="settings-container">
                    <AiModelsSettings v-model:models="settings.aiModels" v-model:activeChatModel="settings.activeChatModel" v-model:activeTranslateModel="settings.activeTranslateModel" />
                    <PromptSettings v-model:chatPrompt="settings.chatPrompt" v-model:translationPrompt="settings.translationPrompt" />
                    <GeneralAppSettings v-model:autoSaveSettings="settings.autoSaveSettings" v-model:enableSelectionTranslation="settings.enableSelectionTranslation" v-model:textSelectionColor="settings.textSelectionColor" v-model:selectionOpacity="settings.selectionOpacity" />
                    <AboutSection :current-version="currentVersion" />

                    <div class="settings-actions">
                        <button class="btn-secondary" @click="handleResetSettings">重置设置</button>
                        <button class="btn-secondary" @click="handleImportSettings">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M12,11L16,15L14.6,16.4L13,14.8V20H11V14.8L9.4,16.4L8,15L12,11Z"/></svg>
                            从文件加载
                        </button>
                        <button class="btn-primary" @click="handleSaveSettings">保存配置</button>
                        <button class="btn-primary" @click="handleExportSettings">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M12,19L8,15L9.4,13.6L11,15.2V10H13V15.2L14.6,13.6L16,15L12,19Z"/></svg>
                            导出配置到文件
                        </button>
                    </div>
                </div>
            </div>
            
            <ConfirmDialog v-model:show="showResetConfirmDialog" title="确认重置设置" message="确定要重置所有设置吗？此操作将恢复为默认设置并保存。" warning="此操作不可撤销！" confirm-text="重置" :is-danger="true" @confirm="confirmResetSettings" @cancel="showResetConfirmDialog = false" />
            <ConfirmDialog v-model:show="showImportConfirmDialog" title="确认导入配置" :message="`确定要从以下文件导入配置吗？

${selectedConfigFile}`" warning="当前的设置将被完全替换！" confirm-text="导入" :is-danger="true" @confirm="handleImportSettings" @cancel="showImportConfirmDialog = false" />
        </div>
    </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(5px); }
#app-container { width: 90vw; max-width: 800px; height: 90vh; background-color: var(--surface-color); color: var(--text-primary-color); border: 1px solid var(--border-color); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
#toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; height: 56px; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }
.toolbar-center { flex-grow: 1; text-align: center; }
.page-title { font-size: 1.2rem; font-weight: 600; margin: 0; }
#toolbar button { background: none; border: none; color: var(--text-secondary-color); cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
#toolbar .back-button { font-size: 0.9rem; gap: 6px; padding: 8px 12px; border-radius: 18px; }
#toolbar button:hover { background-color: var(--hover-color); color: var(--text-primary-color); }
#toolbar svg { width: 20px; height: 20px; }
#settings-content { flex-grow: 1; overflow-y: auto; padding: 24px; }
.settings-container { max-width: 100%; margin: 0 auto; }
.settings-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 24px 0; flex-wrap: wrap; border-top: 1px solid var(--border-color); margin-top: 24px; }
.btn-primary, .btn-secondary { padding: 10px 20px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; font-size: 0.9rem; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.btn-primary { background-color: var(--primary-color); color: white; border-color: var(--primary-color); }
.btn-secondary { background-color: var(--surface-secondary-color); color: var(--text-primary-color); border-color: var(--border-color); }
.btn-secondary:hover { background-color: var(--hover-color); }
</style>
