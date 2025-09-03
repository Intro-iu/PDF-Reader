<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button @click="selectFile" class="custom-file-upload">
        选择 PDF 文件
      </button>
      <!-- 保留隐藏的input作为浏览器环境的fallback -->
      <input 
        type="file" 
        id="file-input" 
        accept=".pdf" 
        @change="handleFileSelect"
        ref="fileInput"
        style="display: none;"
      >
    </div>
    
    <div class="toolbar-center">
      <div v-if="pdfInfo.totalPages > 0" class="page-info">
        第 {{ pdfInfo.currentPage }} 页，共 {{ pdfInfo.totalPages }} 页
      </div>
    </div>
    
    <div class="toolbar-right">
      <a href="#" @click.prevent="openSettings" class="settings-link" title="设置">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      </a>
      
      <button @click="toggleTheme" class="theme-toggle" title="切换深色/浅色模式">
        <svg v-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM12 3c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1zm0 16c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1s1-.45 1-1v-1c0-.55-.45-1-1-1zM5.64 5.64c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zm12.72 12.72c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l.71.71c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-.71-.71zM3 12c0 .55.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1zm16 0c0 .55.45 1 1 1h1c.55 0 1-.45 1-1s-.45-1-1-1h-1c-.55 0-1 .45-1 1zm-9.36 5.36c.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.39.39-.39 1.02 0 1.41zm-1.41-12.72c.39.39 1.02.39 1.41 0l.71-.71c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.39.39-.39-1.02 0-1.41z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.37 5.51C9.19 6.15 9.1 6.82 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27C17.45 17.19 14.93 19 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PdfViewerState, Theme } from '@/types'

interface Props {
  theme: Theme
  pdfInfo: PdfViewerState
}

interface Emits {
  (e: 'file-selected', file: File, filePath?: string): void
  (e: 'toggle-theme'): void
  (e: 'open-settings'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()

const selectFile = async () => {
  // 检查是否在Tauri环境中
  if (window.__TAURI_INTERNALS__) {
    try {
      // 动态导入Tauri APIs
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      
      // 使用Tauri的文件选择对话框
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'PDF文件',
          extensions: ['pdf']
        }]
      })
      
      if (selected) {
        const filePath = selected as string
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown.pdf'
        
        // 读取文件内容
        const fileData = await readFile(filePath)
        
        // 创建File对象
        const file = new File([fileData], fileName, { type: 'application/pdf' })
        
        // 发出事件，同时传递File对象和文件路径
        emit('file-selected', file, filePath)
      }
    } catch (err) {
      console.error('Tauri文件选择失败，回退到浏览器方式:', err)
      // 回退到浏览器的文件选择器
      fileInput.value?.click()
    }
  } else {
    // 浏览器环境，使用标准的文件输入
    fileInput.value?.click()
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type === 'application/pdf') {
    emit('file-selected', file)
  }
}

const toggleTheme = () => {
  emit('toggle-theme')
}

const openSettings = () => {
  emit('open-settings')
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  padding: 10px 24px;
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  align-items: center;
  z-index: 100;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  flex: 1;
}

.toolbar-center {
  justify-content: center;
}

.toolbar-right {
  justify-content: flex-end;
  gap: 8px;
}

.custom-file-upload {
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
  text-decoration: none;
  outline: none;
}

.custom-file-upload:hover {
  background-color: var(--primary-hover-color);
}

.custom-file-upload:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.3);
}

#file-input {
  display: none;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary-color);
  font-weight: 500;
}

.settings-link,
.theme-toggle {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  color: var(--text-primary-color);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.settings-link:hover,
.theme-toggle:hover {
  background-color: var(--hover-bg);
  border-color: var(--primary-color);
}

.settings-link svg,
.theme-toggle svg {
  width: 18px;
  height: 18px;
}
</style>
