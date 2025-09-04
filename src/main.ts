import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initializeApp } from './utils/init'
import { configManager } from './utils/config'
import { initializeTheme } from './utils/material-theme'

async function main() {
  // 初始化配置管理器
  await configManager.initialize();
  
  // 初始化并应用M3主题
  initializeTheme();
  
  // 初始化应用（平台检测等）
  await initializeApp();
  
  const app = createApp(App)
  app.mount('#app')
}

main();