import { invoke } from '@tauri-apps/api/core';
import type { AIModel, AppConfig } from '@/types';

class ConfigManager {
  private config!: AppConfig;
  private isInitialized = false;

  private static instance: ConfigManager;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      // 使用新的 init_config 命令，确保配置文件存在
      this.config = await invoke<AppConfig>('init_config');
      this.isInitialized = true;
      console.log('配置文件加载/创建成功');
    } catch (error) {
      console.error('Failed to load/create config, using default:', error);
      this.config = this.getDefaultConfig();
      this.isInitialized = true;
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      aiModels: [],
      activeChatModel: "",
      activeTranslateModel: "",
      translateTargetLang: "zh",
      chatPrompt: "你是一个有用的助手。",
      translationPrompt: "",
      autoSaveSettings: true,
      enableSelectionTranslation: true,
      textSelectionColor: "#007bff",
      selectionOpacity: 30
    };
  }

  public async saveConfig(): Promise<void> {
    if (!this.isInitialized) {
      console.warn("Config not initialized, skipping save.");
      return;
    }
    try {
      await invoke('set_config', { config: this.config });
      console.log('配置文件保存成功');
    } catch (error) {
      console.error('Failed to save config to backend:', error);
    }
  }

  public getConfig(): AppConfig {
    if (!this.isInitialized) {
      console.warn("Attempted to get config before initialization. Returning default config.");
      return this.getDefaultConfig();
    }
    return { ...this.config };
  }

  public async reloadConfig(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  public async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    if (!this.isInitialized) return;
    this.config = { ...this.config, ...updates };
    if (this.config.autoSaveSettings) {
      await this.saveConfig();
    }
  }

  public async addAIModel(model: AIModel): Promise<void> {
    if (!this.isInitialized) return;
    const existingIndex = this.config.aiModels.findIndex((m: AIModel) => m.id === model.id);
    if (existingIndex >= 0) {
      this.config.aiModels[existingIndex] = model;
    } else {
      this.config.aiModels.push(model);
    }
    await this.saveConfig();
  }

  public async removeAIModel(modelId: string): Promise<void> {
    if (!this.isInitialized) return;
    this.config.aiModels = this.config.aiModels.filter((m: AIModel) => m.id !== modelId);
    if (this.config.activeChatModel === modelId) {
      this.config.activeChatModel = "";
    }
    if (this.config.activeTranslateModel === modelId) {
      this.config.activeTranslateModel = "";
    }
    await this.saveConfig();
  }

  public getActiveModel(type: 'chat' | 'translate'): AIModel | null {
    if (!this.isInitialized) {
      console.log('Config not initialized when getting active model');
      return null;
    }
    
    const modelId = type === 'chat' 
      ? this.config.activeChatModel 
      : this.config.activeTranslateModel;
    
    console.log(`Getting active ${type} model:`, {
      modelId,
      availableModels: this.config.aiModels.map(m => ({ id: m.id, name: m.name }))
    });
    
    const model = this.config.aiModels.find((m: AIModel) => m.id === modelId) || null;
    console.log(`Found ${type} model:`, model ? { id: model.id, name: model.name } : null);
    
    return model;
  }
}

export const configManager = ConfigManager.getInstance();
