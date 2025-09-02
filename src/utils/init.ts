import { configManager } from './config'
import type { AIModel } from '@/types'

export const initializeApp = () => {
  // 检查是否需要添加默认的 AI 模型
  const config = configManager.getConfig()
  
  if (config.settings.aiModels.length === 0) {
    // 添加一个示例模型配置（用户需要替换为实际的 API key）
    const defaultModel: AIModel = {
      id: 'default_deepseek_model',
      name: 'DeepSeek Chat',
      modelId: 'deepseek-chat',
      apiEndpoint: 'https://api.deepseek.com/chat/completions',
      apiKey: '', // 用户需要在设置中填写
      supportsChat: true,
      supportsTranslation: true
    }
    
    configManager.addAIModel(defaultModel)
    configManager.updateSettings({
      activeChatModel: defaultModel.id,
      activeTranslateModel: defaultModel.id
    })
  }
  
  // 应用主题
  const savedTheme = localStorage.getItem('theme') || 'dark'
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode')
  }
}

export const applyCSSVariables = () => {
  const config = configManager.getConfig()
  const { textSelectionColor, selectionOpacity } = config.settings
  
  // 动态设置文本选择颜色
  const root = document.documentElement
  root.style.setProperty('--text-selection-color', textSelectionColor)
  root.style.setProperty('--text-selection-opacity', (selectionOpacity / 100).toString())
}
