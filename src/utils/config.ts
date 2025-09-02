import type { AIModel, AppConfig } from '@/types';

class ConfigManager {
  private config: AppConfig;
  private readonly CONFIG_KEY = 'pdf-reader-config';

  constructor() {
    this.config = this.loadConfig();
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

  private loadConfig(): AppConfig {
    try {
      const saved = localStorage.getItem(this.CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultConfig(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
    return this.getDefaultConfig();
  }

  public saveConfig(): void {
    try {
      this.config.lastModified = new Date().toISOString();
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateSettings(updates: Partial<AppConfig['settings']>): void {
    this.config.settings = { ...this.config.settings, ...updates };
    if (this.config.settings.autoSaveSettings) {
      this.saveConfig();
    }
  }

  public addAIModel(model: AIModel): void {
    const existingIndex = this.config.settings.aiModels.findIndex((m: AIModel) => m.id === model.id);
    if (existingIndex >= 0) {
      this.config.settings.aiModels[existingIndex] = model;
    } else {
      this.config.settings.aiModels.push(model);
    }
    this.saveConfig();
  }

  public removeAIModel(modelId: string): void {
    this.config.settings.aiModels = this.config.settings.aiModels.filter((m: AIModel) => m.id !== modelId);
    if (this.config.settings.activeChatModel === modelId) {
      this.config.settings.activeChatModel = "";
    }
    if (this.config.settings.activeTranslateModel === modelId) {
      this.config.settings.activeTranslateModel = "";
    }
    this.saveConfig();
  }

  public getActiveModel(type: 'chat' | 'translate'): AIModel | null {
    const modelId = type === 'chat' 
      ? this.config.settings.activeChatModel 
      : this.config.settings.activeTranslateModel;
    
    return this.config.settings.aiModels.find((m: AIModel) => m.id === modelId) || null;
  }
}

export const configManager = new ConfigManager();
