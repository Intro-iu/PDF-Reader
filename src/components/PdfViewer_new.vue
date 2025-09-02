<template>
  <div class="pdf-viewer-container">
    <!-- PDF缩放控制器 -->
    <div v-if="pdfDoc" class="pdf-zoom-control">
      <div class="zoom-control-handle">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
        </svg>
      </div>
      <div class="zoom-slider-container">
        <input 
          type="range" 
          class="zoom-slider" 
          :min="minScale * 100"
          :max="maxScale * 100"
          :value="currentScale * 100"
          @input="handleZoomChange"
        >
        <span class="zoom-label">{{ Math.round(currentScale * 100) }}%</span>
      </div>
    </div>

    <!-- PDF内容区域 -->
    <div class="pdf-content" @mouseup="handleTextSelection">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else-if="isLoading" class="loading-message">
        正在加载 PDF...
      </div>
      
      <div v-else-if="!pdfDoc" class="welcome-message">
        请选择一个 PDF 文件开始阅读
      </div>
      
      <div v-else class="pdf-pages" ref="pdfPagesContainer">
        <!-- PDF 页面将通过 JavaScript 动态创建 -->
      </div>
    </div>

    <!-- 页面导航 -->
    <div v-if="pdfDoc && totalPages > 1" class="page-navigation">
      <button 
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage <= 1"
        class="nav-button"
      >
        上一页
      </button>
      
      <div class="page-input-container">
        <input 
          type="number" 
          :value="currentPage"
          :min="1"
          :max="totalPages"
          @input="handlePageInput"
          class="page-input"
        >
        <span class="page-total">/ {{ totalPages }}</span>
      </div>
      
      <button 
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="nav-button"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { PdfManager } from '@/utils/pdf'

const props = defineProps<{
  file: File | null
}>()

const emit = defineEmits<{
  'pdf-loaded': [{ totalPages: number }]
  'page-changed': [number]
  'text-selected': [string]
  'error': [string]
}>()

// PDF 相关
const pdfManager = new PdfManager()
const pdfDoc = ref<any>(null)
const pdfPagesContainer = ref<HTMLElement | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const currentScale = ref(1.0)
const minScale = ref(0.25)
const maxScale = ref(4.0)
const isLoading = ref(false)
const error = ref<string | null>(null)

// 缩放相关变量
const isRendering = ref(false)
const renderTimeout = ref<NodeJS.Timeout | null>(null)

const loadPdf = async (file: File) => {
  if (!file) return

  isLoading.value = true
  error.value = null

  try {
    const pdfDocument = await pdfManager.loadDocument(file)
    pdfDoc.value = pdfDocument.doc
    totalPages.value = pdfDocument.numPages
    currentPage.value = 1
    
    emit('pdf-loaded', { totalPages: pdfDocument.numPages })
    
    // 等待 DOM 更新，确保 pdf-pages 容器已经渲染
    await nextTick()
    
    // 再次等待，确保容器完全可用
    setTimeout(async () => {
      await renderAllPages()
    }, 100)
    
  } catch (err: any) {
    console.error('PDF loading error:', err)
    error.value = err.message || '加载 PDF 失败'
    emit('error', error.value)
  } finally {
    isLoading.value = false
  }
}

// 立即应用CSS缩放预览
const applyInstantZoom = (scale: number) => {
  const container = pdfPagesContainer.value
  if (!container) return
  
  const pageContainers = container.querySelectorAll('.pdf-page')
  if (pageContainers.length === 0) return
  
  // 计算当前显示比例与目标比例的差异
  const cssScale = scale / currentScale.value
  
  pageContainers.forEach(pageContainer => {
    const element = pageContainer as HTMLElement
    element.style.transform = `scale(${cssScale})`
    element.style.transformOrigin = 'center top'
    element.style.transition = 'transform 0.1s ease-out'
  })
}

// 清除CSS缩放预览效果
const clearInstantZoom = () => {
  const container = pdfPagesContainer.value
  if (!container) return
  
  const pageContainers = container.querySelectorAll('.pdf-page')
  pageContainers.forEach(pageContainer => {
    const element = pageContainer as HTMLElement
    element.style.transform = ''
    element.style.transformOrigin = ''
    element.style.transition = ''
  })
}

// 智能渲染队列管理
const queueRender = (scale: number) => {
  // 清空之前的渲染请求
  if (renderTimeout.value) {
    clearTimeout(renderTimeout.value)
  }
  
  // 立即应用CSS预览缩放
  applyInstantZoom(scale)
  
  // 延迟实际渲染，避免频繁缩放时的性能问题
  renderTimeout.value = setTimeout(() => {
    handleScaleChange(scale)
  }, 300)
}

// 处理缩放变化
const handleScaleChange = async (scale: number) => {
  if (!pdfDoc.value || isRendering.value) return
  
  console.log(`缩放变化: ${scale}, 更新页面尺寸`)
  
  // 清除CSS预览效果
  clearInstantZoom()
  
  // 更新缩放值
  currentScale.value = scale
  pdfManager.setScale(scale)
  
  // 更新容器的缩放因子
  const container = pdfPagesContainer.value
  if (container) {
    container.style.setProperty('--scale-factor', scale.toString())
  }
  
  // 重新渲染所有页面
  await renderAllPages()
}

const renderAllPages = async () => {
  if (isRendering.value) return
  
  console.log('开始渲染页面，总页数:', totalPages.value)
  isRendering.value = true
  
  try {
    // 等待 DOM 更新完成
    await nextTick()
    
    let container = pdfPagesContainer.value
    
    // 如果容器还没有找到，等待一下再试
    if (!container) {
      console.warn('PDF 页面容器未找到，等待 DOM 更新...')
      await new Promise(resolve => setTimeout(resolve, 200))
      await nextTick()
      container = pdfPagesContainer.value
    }
    
    if (!container) {
      console.error('PDF 页面容器未找到')
      error.value = 'PDF 容器初始化失败'
      return
    }
    
    console.log('找到 PDF 页面容器:', container)
    
    // 清空容器
    container.innerHTML = ''
    
    // 设置缩放因子到容器上
    container.style.setProperty('--scale-factor', currentScale.value.toString())
    
    for (let pageNum = 1; pageNum <= totalPages.value; pageNum++) {
      // 创建页面容器
      const pageDiv = document.createElement('div')
      pageDiv.className = 'pdf-page'
      pageDiv.setAttribute('data-page', pageNum.toString())
      container.appendChild(pageDiv)
      
      try {
        console.log(`开始渲染页面 ${pageNum}`)
        await pdfManager.renderPage(pageNum, pageDiv, currentScale.value)
        console.log(`页面 ${pageNum} 渲染完成`)
      } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err)
      }
    }
  } finally {
    isRendering.value = false
  }
}

const handleZoomChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newScale = parseInt(target.value) / 100
  
  // 使用智能队列渲染
  queueRender(newScale)
}

const goToPage = (pageNum: number) => {
  if (pageNum >= 1 && pageNum <= totalPages.value) {
    currentPage.value = pageNum
    emit('page-changed', pageNum)
    
    // 滚动到指定页面
    const container = pdfPagesContainer.value
    if (container) {
      const pageElement = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
}

const handlePageInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const pageNum = parseInt(target.value)
  goToPage(pageNum)
}

const handleTextSelection = () => {
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    const selectedText = selection.toString().trim()
    emit('text-selected', selectedText)
  }
}

// 监听文件变化
watch(() => props.file, (newFile) => {
  if (newFile) {
    loadPdf(newFile)
  }
}, { immediate: true })

onMounted(() => {
  minScale.value = pdfManager.getMinScale()
  maxScale.value = pdfManager.getMaxScale()
  
  // 添加文本选择事件监听
  document.addEventListener('mouseup', handleTextSelection)
})

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('mouseup', handleTextSelection)
  
  // 清理定时器
  if (renderTimeout.value) {
    clearTimeout(renderTimeout.value)
  }
})
</script>

<style scoped>
.pdf-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.pdf-zoom-control {
  position: absolute;
  top: 20px;
  right: 20px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.zoom-control-handle {
  display: flex;
  align-items: center;
  color: var(--text-secondary-color);
}

.zoom-control-handle svg {
  width: 18px;
  height: 18px;
}

.zoom-slider-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.zoom-slider {
  flex: 1;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.zoom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
}

.zoom-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.zoom-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary-color);
  min-width: 35px;
  text-align: center;
}

.pdf-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: var(--background-color);
}

.pdf-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.error-message,
.loading-message,
.welcome-message {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary-color);
  font-size: 16px;
}

.error-message {
  color: var(--error-color);
}

.page-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
}

.nav-button {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.nav-button:hover:not(:disabled) {
  background: var(--primary-hover-color);
}

.nav-button:disabled {
  background: var(--border-color);
  cursor: not-allowed;
}

.page-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-background);
  color: var(--text-primary-color);
  text-align: center;
}

.page-total {
  color: var(--text-secondary-color);
  font-weight: 500;
}

/* 文本层样式 */
:deep(.textLayer) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  color: transparent;
  white-space: nowrap;
  cursor: text;
  overflow: hidden;
}

:deep(.textLayer > span) {
  color: transparent;
  position: absolute;
  white-space: nowrap;
  transform-origin: 0% 0%;
}

:deep(.textLayer ::selection) {
  background: rgba(0, 123, 255, 0.3);
}

/* PDF 页面容器 */
:deep(.pdf-page) {
  position: relative;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.pdf-page canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
