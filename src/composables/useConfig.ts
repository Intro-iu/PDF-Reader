import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { reactive } from 'vue';

// 默认配置
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

// 定义配置类型，与 SettingsModal.vue 中保持一致
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

export function useConfig(settings: AppConfig) {

    // 从后端加载配置
    const load = async () => {
        const loadedConfig = await invoke<AppConfig>('get_config');
        Object.assign(settings, loadedConfig);
    };

    // 保存配置到后端
    const saveConfig = async () => {
        await invoke('set_config', { config: JSON.parse(JSON.stringify(settings)) });
    };

    // 导出配置到文件
    const exportToFile = async () => {
        const filePath = await save({
            filters: [{ name: 'JSON配置文件', extensions: ['json'] }],
            defaultPath: 'pdf-reader-config.json'
        });
        if (filePath) {
            await invoke('export_config_to_file', { 
                filePath: filePath,
                config: JSON.parse(JSON.stringify(settings))
            });
            return true; // 表示成功
        }
        return false; // 用户取消
    };

    // 从文件导入配置
    const importFromFile = async () => {
        const selected = await open({
            multiple: false,
            filters: [{ name: 'JSON配置文件', extensions: ['json'] }]
        });
        if (typeof selected === 'string') {
            await invoke('import_config_from_file', { filePath: selected });
            await load(); // 导入后立即重新加载
            return true; // 表示成功
        }
        return false; // 用户取消
    };

    // 重置为默认配置
    const reset = () => {
        Object.assign(settings, defaultConfig);
        saveConfig(); // 重置后立即保存
    };

    return {
        load,
        save: saveConfig,
        exportToFile,
        importFromFile,
        reset
    };
}
