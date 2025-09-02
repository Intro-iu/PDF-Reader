import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initializeApp, applyCSSVariables } from './utils/init'

// 初始化应用
initializeApp()
applyCSSVariables()

const app = createApp(App)
app.mount('#app')
