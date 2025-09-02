import { invoke } from '@tauri-apps/api/core'
import { configManager } from './config'
import type { AIModel } from '@/types'

export const initializeApp = async () => {
  // 确保配置已经初始化完成
  await configManager.initialize()
  
  // 检查配置文件是否存在
  const configFileExists = await invoke<boolean>('config_file_exists')
  
  // 只有在配置文件不存在时，才初始化默认配置
  if (!configFileExists) {
    console.log('Config file does not exist, initializing default configuration...')
    
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
    
    await configManager.addAIModel(defaultModel)
    await configManager.updateConfig({
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
  const { textSelectionColor, selectionOpacity } = config
  
  // 动态设置文本选择颜色
  const root = document.documentElement
  root.style.setProperty('--text-selection-color', textSelectionColor)
  root.style.setProperty('--text-selection-opacity', (selectionOpacity / 100).toString())
}
