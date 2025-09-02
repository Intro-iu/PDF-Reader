import { invoke } from '@tauri-apps/api/core';
import type { AIModel, AppConfig } from '@/types';

class ConfigManager {
  private config!: AppConfig; // Use definite assignment assertion
  private isInitialized = false;

  // Private constructor to enforce singleton pattern
  private constructor() {}

  private static instance: ConfigManager;

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
      // Call the backend to get the config
      const backendConfig = await invoke<AppConfig>('get_config');
      this.config = this.transformBackendToFrontend(backendConfig);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load config from backend, using default:', error);
      // Fallback to default if backend fails
      this.config = this.getDefaultConfig();
      this.isInitialized = true;
    }
  }

  private transformBackendToFrontend(backendConfig: any): AppConfig {
    // The backend config is flat, the frontend expects a nested 'settings' object.
    // We need to transform it.
    const {
      aiModels,
      activeChatModel,
      activeTranslateModel,
      translateTargetLang,
      autoSaveSettings,
      enableSelectionTranslation,
      textSelectionColor,
      selectionOpacity,
      chatPrompt,
      translationPrompt,
      ...rest
    } = backendConfig;

    return {
      ...this.getDefaultConfig(), // Start with defaults to ensure all fields are present
      ...rest, // Add any other top-level fields from backend
      lastModified: new Date().toISOString(), // Set current timestamp
      settings: {
        aiModels,
        activeChatModel,
        activeTranslateModel,
        translateTargetLang,
        autoSaveSettings,
        enableSelectionTranslation,
        textSelectionColor,
        selectionOpacity,
        chatPrompt,
        translationPrompt,
      },
    };
  }

  private transformFrontendToBackend(frontendConfig: AppConfig): any {
    // Transform the nested frontend config back to a flat structure for the backend.
    const { settings, ...rest } = frontendConfig;
    // We don't need to send appName, version, lastModified to the backend
    return { ...settings };
  }

  private getDefaultConfig(): AppConfig {
    return {
      appName: "PDF-Reader",
      version: "2.0.0",
      lastModified: new Date().toISOString(),
      settings: {
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
      }
    };
  }

  public async saveConfig(): Promise<void> {
    if (!this.isInitialized) {
      console.warn("Config not initialized, skipping save.");
      return;
    }
    try {
      this.config.lastModified = new Date().toISOString();
      const backendConfig = this.transformFrontendToBackend(this.config);
      await invoke('set_config', { config: backendConfig });
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

  public async updateSettings(updates: Partial<AppConfig['settings']>): Promise<void> {
    this.config.settings = { ...this.config.settings, ...updates };
    if (this.config.settings.autoSaveSettings) {
      await this.saveConfig();
    }
  }

  public async addAIModel(model: AIModel): Promise<void> {
    const existingIndex = this.config.settings.aiModels.findIndex((m: AIModel) => m.id === model.id);
    if (existingIndex >= 0) {
      this.config.settings.aiModels[existingIndex] = model;
    } else {
      this.config.settings.aiModels.push(model);
    }
    await this.saveConfig();
  }

  public async removeAIModel(modelId: string): Promise<void> {
    this.config.settings.aiModels = this.config.settings.aiModels.filter((m: AIModel) => m.id !== modelId);
    if (this.config.settings.activeChatModel === modelId) {
      this.config.settings.activeChatModel = "";
    }
    if (this.config.settings.activeTranslateModel === modelId) {
      this.config.settings.activeTranslateModel = "";
    }
    await this.saveConfig();
  }

  public getActiveModel(type: 'chat' | 'translate'): AIModel | null {
    const modelId = type === 'chat' 
      ? this.config.settings.activeChatModel 
      : this.config.settings.activeTranslateModel;
    
    return this.config.settings.aiModels.find((m: AIModel) => m.id === modelId) || null;
  }
}

export const configManager = ConfigManager.getInstance();
