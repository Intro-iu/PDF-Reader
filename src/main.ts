import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initializeApp, applyCSSVariables } from './utils/init'
import { configManager } from './utils/config'

async function main() {
  // 初始化应用
  await configManager.initialize();
  initializeApp();
  applyCSSVariables();
  
  const app = createApp(App)
  app.mount('#app')
}

main();
