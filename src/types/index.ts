// 定义应用的所有类型

export interface AIModel {
  id: string;
  name: string;
  modelId: string;
  apiEndpoint: string;
  apiKey: string;
  supportsChat: boolean;
  supportsTranslation: boolean;
}

export interface AppConfig {
  aiModels: AIModel[];
  activeChatModel: string;
  activeTranslateModel: string;
  translateTargetLang: string;
  chatPrompt: string;
  translationPrompt: string;
  autoSaveSettings: boolean;
  enableSelectionTranslation: boolean;
  textSelectionColor: string;
  selectionOpacity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface PdfViewerState {
  currentScale: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export interface SidebarState {
  isCollapsed: boolean;
  width: number;
  activeTab: 'translate' | 'chat';
}

export type Theme = 'light' | 'dark';

export interface TranslationState {
  selectedText: string;
  translatedText: string;
  isTranslating: boolean;
  autoTranslate: boolean;
  error: string | null;
}

export interface OutlineItem {
  title: string;
  page: number;
  level: number;
  id: string; // 智能生成目录的唯一标识，必需字段
  children?: OutlineItem[];
}

export interface HistoryItem {
  path: string;
  name: string;
  lastOpened: string;
  page?: number;
}

export interface TranslationHistoryItem {
  id: string;
  type: 'translation';
  originalText: string;
  result: string;
  targetLang: string;
  timestamp: number;
}

export interface ChatHistoryItem {
  id: string;
  type: 'chat';
  originalText: string;
  result: string;
  timestamp: number;
}

export type ActivityHistoryItem = TranslationHistoryItem | ChatHistoryItem;
