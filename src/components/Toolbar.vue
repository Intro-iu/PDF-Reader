<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button @click="selectFile" class="custom-file-upload">
        选择 PDF 文件
      </button>
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
      <div v-if="pdfInfo.totalPages > 0" class="nav-controls">
        <div class="page-input-container">
          <input 
            type="number" 
            :value="pdfInfo.currentPage"
            :min="1"
            :max="pdfInfo.totalPages"
            @change="handlePageInput"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
            class="page-input"
          >
          <span class="page-total">/ {{ pdfInfo.totalPages }}</span>
        </div>
      </div>
    </div>
    
    <div class="toolbar-right">
      <button type="button" @click="openSettings" class="settings-link" title="设置">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      </button> 
      <button @click="toggleTheme" class="theme-toggle" title="切换深色/浅色模式">
        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PdfViewerState } from '@/types'

interface Props {
  isDark: boolean
  pdfInfo: PdfViewerState
}

interface Emits {
  (e: 'file-selected', file: File, filePath?: string): void
  (e: 'toggle-theme'): void
  (e: 'open-settings'): void
  (e: 'go-to-page', page: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const fileInput = ref<HTMLInputElement>()

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.pdfInfo.totalPages) {
    emit('go-to-page', page)
  }
}

const handlePageInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.value) return
  const pageNum = parseInt(target.value)
  goToPage(pageNum)
  target.blur()
}

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
  console.log('Toolbar openSettings called')
  emit('open-settings')
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  padding: 10px 24px;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  align-items: center;
  z-index: 100;
  height: 64px;
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
  padding: 10px 24px;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
  outline: none;
  box-shadow: var(--md-sys-elevation-level1);
}

.custom-file-upload:hover {
  box-shadow: var(--md-sys-elevation-level2);
  background-color: color-mix(in srgb, var(--md-sys-color-primary), var(--md-sys-color-on-primary) 8%);
}

.custom-file-upload:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
}

#file-input {
  display: none;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--md-sys-color-surface-container-high);
  padding: 4px;
  border-radius: 20px;
}

.nav-button {
  padding: 8px 16px;
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-button:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.nav-button:disabled {
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.5;
  cursor: not-allowed;
}

.page-input-container {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.page-input {
  width: 50px;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  text-align: center;
  font-size: 14px;
}

.page-input:focus {
  outline: none;
  background-color: var(--md-sys-color-surface-container-highest);
}

.page-total {
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 500;
  font-size: 14px;
}

.settings-link,
.theme-toggle {
  background: var(--md-sys-color-surface-container-highest);
  border: none;
  border-radius: 28px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  padding: 8px;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  width: 40px;
  height: 40px;
  overflow: hidden;
  position: relative;
}

.settings-link:hover,
.theme-toggle:hover {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.settings-link svg,
.theme-toggle svg {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: background 0.2s;
}
</style>
