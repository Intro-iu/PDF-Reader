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
    isDark: boolean;
    sourceColor: string;
}

// --- 组件Props和Emits ---
const props = defineProps<Props>();
const emit = defineEmits(['close', 'update-theme']);

// --- 核心状态 ---
const settings = reactive<AppConfig>({
    aiModels: [], activeChatModel: '', activeTranslateModel: '', translateTargetLang: 'zh', autoSaveSettings: true, enableSelectionTranslation: true, textSelectionColor: '#007bff', selectionOpacity: 30, chatPrompt: '你是一个专业的学术论文阅读助手。', translationPrompt: 'Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]'
});
const currentVersion = ref('1.0.4');
const localSourceColor = ref(props.sourceColor);

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
});

watch(() => props.sourceColor, (newVal) => {
    localSourceColor.value = newVal;
});

watch(localSourceColor, (newColor) => {
    emit('update-theme', newColor, props.isDark);
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
        emit('close');
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

function toggleTheme() {
    emit('update-theme', localSourceColor.value, !props.isDark);
}

</script>

<template>
    <div class="modal-overlay" @click="emit('close')">
        <div class="settings-dialog" @click.stop>
            <div class="dialog-header">
                <button class="icon-button" title="返回" @click="emit('close')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                </button>
                <h2 class="dialog-title">设置</h2>
                <button class="icon-button" title="切换主题" @click="toggleTheme">
                  <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/></svg>
                </button>
            </div>

            <div class="dialog-content">
                <div class="settings-container">
                    <AiModelsSettings v-model:models="settings.aiModels" v-model:activeChatModel="settings.activeChatModel" v-model:activeTranslateModel="settings.activeTranslateModel" />
                    <PromptSettings v-model:chatPrompt="settings.chatPrompt" v-model:translationPrompt="settings.translationPrompt" />
                    <GeneralAppSettings 
                        v-model:autoSaveSettings="settings.autoSaveSettings" 
                        v-model:enableSelectionTranslation="settings.enableSelectionTranslation" 
                        v-model:textSelectionColor="settings.textSelectionColor" 
                        v-model:selectionOpacity="settings.selectionOpacity"
                        v-model:sourceColor="localSourceColor"
                    />
                    <AboutSection :current-version="currentVersion" />
                </div>
            </div>
            
            <div class="dialog-actions">
                <div class="action-group">
                    <button class="text-button" @click="handleResetSettings">重置设置</button>
                    <button class="text-button" @click="handleImportSettings">导入</button>
                    <button class="text-button" @click="handleExportSettings">导出</button>
                </div>
                <div class="action-group">
                    <button class="outlined-button" @click="emit('close')">取消</button>
                    <button class="filled-button" @click="handleSaveSettings">保存</button>
                </div>
            </div>
            
            <ConfirmDialog v-model:show="showResetConfirmDialog" title="确认重置设置" message="确定要重置所有设置吗？此操作将恢复为默认设置并保存。" warning="此操作不可撤销！" confirm-text="重置" :is-danger="true" @confirm="confirmResetSettings" @cancel="showResetConfirmDialog = false" />
            <ConfirmDialog v-model:show="showImportConfirmDialog" title="确认导入配置" :message="`确定要从以下文件导入配置吗？\n\n${selectedConfigFile}`" warning="当前的设置将被完全替换！" confirm-text="导入" :is-danger="true" @confirm="handleImportSettings" @cancel="showImportConfirmDialog = false" />
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}
.settings-dialog {
    width: 90vw;
    max-width: 900px;
    height: 90vh;
    max-height: 800px;
    background-color: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    border-radius: 28px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: var(--md-sys-elevation-level3);
    animation: dialog-appear 0.3s ease-out;
}
@keyframes dialog-appear {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
.dialog-header {
    display: flex;
    align-items: center;
    padding: 12px 12px 12px 24px;
    flex-shrink: 0;
    gap: 16px;
}
.dialog-title {
    font-size: 22px;
    font-weight: 400;
    margin: 0;
    flex: 1;
}
.dialog-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 0 24px;
}
.dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
    flex-shrink: 0;
}
.action-group {
    display: flex;
    gap: 8px;
}

/* M3 Button Styles */
.icon-button, .text-button, .filled-button, .outlined-button {
    padding: 10px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
}
.icon-button {
    background: transparent;
    color: var(--md-sys-color-on-surface-variant);
    width: 40px;
    padding: 0;
    border-radius: 50%;
}
.icon-button:hover {
    background-color: var(--md-sys-color-surface-container-highest);
}
.icon-button svg {
    width: 24px;
    height: 24px;
}
.text-button {
    background: transparent;
    color: var(--md-sys-color-primary);
    padding: 0 12px;
}
.text-button:hover {
    background-color: var(--md-sys-color-surface-container-highest);
}
.filled-button {
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    padding: 0 24px;
}
.filled-button:hover {
    box-shadow: var(--md-sys-elevation-level1);
}
.outlined-button {
    background-color: transparent;
    color: var(--md-sys-color-primary);
    border: 1px solid var(--md-sys-color-outline);
    padding: 0 24px;
}
.outlined-button:hover {
    background-color: var(--md-sys-color-surface-container-highest);
}
</style>
