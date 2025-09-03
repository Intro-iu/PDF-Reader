<template>
  <div class="pdf-viewer-container">
    <!-- PDF内容区域 -->
    <div class="pdf-content" @mouseup="handleTextSelection" @contextmenu="handleContextMenu">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else-if="isLoading" class="loading-message">
        正在加载 PDF...
      </div>
      
      <div v-else-if="!pdfDoc" class="welcome-message">
        请选择一个 PDF 文件开始阅读
      </div>
      
      <div v-else class="pdf-pages" ref="pdfPagesContainer" :class="{ 'pdf-dark-mode': pdfDarkMode }">
        <!-- PDF 页面将通过 JavaScript 动态创建 -->
      </div>
    </div>

    <!-- 右键上下文菜单 -->
    <div 
      v-if="contextMenu.show" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="handleTranslateAction">
        <svg class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
        翻译选中文本
      </div>
      <div class="context-menu-item" @click="handleChatAction">
        <svg class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        AI 分析
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="handleCopyAction">
        <svg class="menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
        复制文本
      </div>
    </div>

    <!-- 页面导航 -->
    <div v-if="pdfDoc && totalPages > 1" class="page-navigation">
      <div class="nav-controls">
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
      
      <!-- PDF缩放控制器 -->
      <div class="pdf-zoom-control">
        <div class="zoom-control-handle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
          </svg>
        </div>
        <button 
          class="fit-page-btn" 
          @click="fitToPage"
          title="适合页面大小"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 9h6v6h-6zm2 2v2h2v-2zm9-7h-6v2h4v4h2zm-2 16h-4v2h6v-6h-2zm-16-4h2v-4h-2zm0-6h2v-4h-2zm2-6h4v-2h-6v6h2z"/>
          </svg>
        </button>
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
        
        <!-- PDF 夜间模式切换 -->
        <button 
          class="pdf-dark-mode-toggle"
          @click="togglePdfDarkMode"
          :title="pdfDarkMode ? '关闭 PDF 夜间模式' : '开启 PDF 夜间模式'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="pdfDarkMode" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
            <path v-else d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { PdfManager } from '@/utils/pdf'
import type { OutlineItem } from '@/types'

const props = defineProps<{
  file: File | null
}>()

const emit = defineEmits<{
  'pdf-loaded': [{ totalPages: number }]
  'page-changed': [number]
  'text-selected': [string]
  'error': [string]
  'translate-text': [string]
  'chat-with-text': [string]
  'outline-loaded': [OutlineItem[]]
}>()

// PDF 相关
const pdfManager = new PdfManager()
const pdfDoc = ref<any>(null)
const pdfPagesContainer = ref<HTMLElement | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const pdfDarkMode = ref(false)
const currentScale = ref(1.0)
const minScale = ref(0.25)
const maxScale = ref(4.0)
const isLoading = ref(false)
const error = ref<string | null>(null)

// 缩放相关变量
const isRendering = ref(false)
const renderTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// 右键菜单相关
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0
})
const selectedTextForMenu = ref('')

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
    
    // 加载 PDF 目录
    try {
      const outline = await loadPdfOutline(pdfDocument.doc)
      console.log('PDF目录解析结果:', outline)
      emit('outline-loaded', outline)
    } catch (outlineError) {
      console.warn('加载 PDF 目录失败:', outlineError)
      emit('outline-loaded', []) // 发送空数组表示没有目录
    }
    
    // 等待 DOM 更新，确保 pdf-pages 容器已经渲染
    await nextTick()
    
    // 再次等待，确保容器完全可用
    setTimeout(async () => {
      await renderAllPages()
    }, 100)
    
  } catch (err: any) {
    console.error('PDF loading error:', err)
    error.value = err.message || '加载 PDF 失败'
    // emit('error', error.value)
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

const fitToPage = async () => {
  if (!pdfDoc.value || !pdfPagesContainer.value) return
  
  try {
    // 使用 pdfManager 获取第一页的尺寸
    const dimensions = await pdfManager.getPageDimensions(1)
    
    // 获取容器尺寸
    const container = pdfPagesContainer.value
    const containerWidth = container.clientWidth - 40 // 减去padding
    const containerHeight = container.clientHeight - 40 // 减去padding
    
    // 计算适合宽度和高度的缩放比例
    const scaleForWidth = containerWidth / dimensions.width
    const scaleForHeight = containerHeight / dimensions.height
    
    // 选择较小的缩放比例，确保整个页面都能显示
    const targetScale = Math.min(scaleForWidth, scaleForHeight, maxScale.value)
    
    // 确保不低于最小缩放比例
    const finalScale = Math.max(targetScale, minScale.value)
    
    // 应用新的缩放比例
    currentScale.value = finalScale
    queueRender(finalScale)
    
    console.log(`适合页面缩放: ${Math.round(finalScale * 100)}%`)
  } catch (error) {
    console.error('计算适合页面缩放时出错:', error)
  }
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

// 加载 PDF 目录
const loadPdfOutline = async (pdfDocument: any): Promise<OutlineItem[]> => {
  try {
    // 1. 首先尝试获取内嵌目录
    const outline = await pdfDocument.getOutline()
    if (outline && outline.length > 0) {
      console.log('找到内嵌目录，解析中...')
      return await parseEmbeddedOutline(outline, pdfDocument)
    }
    
    // 2. 如果没有内嵌目录，返回空数组，不自动生成智能目录
    console.log('未找到内嵌目录')
    return []
    
  } catch (error) {
    console.error('解析 PDF 目录失败:', error)
    return []
  }
}

// 解析内嵌目录
const parseEmbeddedOutline = async (outline: any[], pdfDocument: any): Promise<OutlineItem[]> => {
  const parseOutlineItem = async (item: any, level: number = 0): Promise<OutlineItem> => {
    let pageNum = 1
    
    // 尝试获取目标页面
    if (item.dest) {
      try {
        const dest = await pdfDocument.getDestination(item.dest)
        if (dest && dest[0]) {
          const pageRef = dest[0]
          const pageIndex = await pdfDocument.getPageIndex(pageRef)
          pageNum = pageIndex + 1 // PDF 页面索引从 0 开始，显示页码从 1 开始
        }
      } catch (err) {
        console.warn('无法获取目录项页面:', err)
      }
    }
    
    const outlineItem: OutlineItem = {
      id: `outline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title || '无标题',
      page: pageNum,
      level
    }
    
    // 递归处理子项
    if (item.items && item.items.length > 0) {
      outlineItem.children = []
      for (const child of item.items) {
        const childItem = await parseOutlineItem(child, level + 1)
        outlineItem.children.push(childItem)
      }
    }
    
    return outlineItem
  }
  
  const result: OutlineItem[] = []
  for (const item of outline) {
    const outlineItem = await parseOutlineItem(item)
    result.push(outlineItem)
  }
  
  return result
}

// 智能生成目录
const generateSmartOutlineItems = async (): Promise<OutlineItem[]> => {
  try {
    const smartOutline = await pdfManager.generateSmartOutline()
    
    // 转换为 OutlineItem 格式
    const outlineItems: OutlineItem[] = smartOutline.map(item => ({
      title: item.title,
      page: item.page,
      level: item.level,
      id: item.id
    }))
    
    console.log(`智能目录生成完成: ${outlineItems.length} 项`)
    return outlineItems
    
  } catch (error) {
    console.error('智能目录生成失败:', error)
    return []
  }
}

const handlePageInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const pageNum = parseInt(target.value)
  goToPage(pageNum)
}

const togglePdfDarkMode = () => {
  pdfDarkMode.value = !pdfDarkMode.value
  // 保存到本地存储
  localStorage.setItem('pdfDarkMode', pdfDarkMode.value.toString())
}

// 检查文本选择是否在textLayer中
const isSelectionInTextLayer = (selection: Selection): boolean => {
  if (!selection.rangeCount) return false
  
  const range = selection.getRangeAt(0)
  let currentElement: Node | null = range.commonAncestorContainer
  
  // 如果是文本节点，获取其父元素
  if (currentElement.nodeType === Node.TEXT_NODE) {
    currentElement = currentElement.parentElement
  }
  
  // 向上遍历DOM树，查找是否在textLayer中
  while (currentElement && currentElement !== document.body) {
    if (currentElement instanceof Element && currentElement.classList && currentElement.classList.contains('textLayer')) {
      return true
    }
    currentElement = currentElement.parentElement
  }
  
  return false
}

const handleTextSelection = () => {
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    const selectedText = selection.toString().trim()
    
    // 只有在textLayer中的文本选择才触发翻译
    if (isSelectionInTextLayer(selection)) {
      emit('text-selected', selectedText)
      selectedTextForMenu.value = selectedText
    }
  }
}

// 右键菜单处理
const handleContextMenu = (event: MouseEvent) => {
  const selection = window.getSelection()
  const selectedText = selection?.toString().trim()
  
  // 只有在textLayer中选中文本时才显示右键菜单
  if (selectedText && selection && isSelectionInTextLayer(selection)) {
    event.preventDefault()
    selectedTextForMenu.value = selectedText
    
    // 计算菜单位置，确保不超出屏幕边界
    const x = event.clientX
    const y = event.clientY
    const menuWidth = 200 // 预估菜单宽度
    const menuHeight = 120 // 预估菜单高度
    
    contextMenu.x = x + menuWidth > window.innerWidth ? x - menuWidth : x
    contextMenu.y = y + menuHeight > window.innerHeight ? y - menuHeight : y
    contextMenu.show = true
  }
}

const hideContextMenu = () => {
  contextMenu.show = false
  selectedTextForMenu.value = ''
}

// 处理点击事件，清空非textLayer的文本选择
const handleDocumentClick = (_event: MouseEvent) => {
  hideContextMenu()
  
  // 检查点击是否在textLayer外
  const selection = window.getSelection()
  if (selection && selection.toString().trim() && !isSelectionInTextLayer(selection)) {
    // 如果选择的文本不在textLayer中，清空选择并通知父组件
    selection.removeAllRanges()
    emit('text-selected', '')
  }
}

const handleTranslateAction = () => {
  if (selectedTextForMenu.value) {
    emit('translate-text', selectedTextForMenu.value)
  }
  hideContextMenu()
}

const handleChatAction = () => {
  if (selectedTextForMenu.value) {
    emit('chat-with-text', selectedTextForMenu.value)
  }
  hideContextMenu()
}

const handleCopyAction = async () => {
  if (selectedTextForMenu.value) {
    try {
      await navigator.clipboard.writeText(selectedTextForMenu.value)
      console.log('文本已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }
  hideContextMenu()
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
  
  // 恢复保存的PDF夜间模式设置
  const savedPdfDarkMode = localStorage.getItem('pdfDarkMode')
  if (savedPdfDarkMode) {
    pdfDarkMode.value = savedPdfDarkMode === 'true'
  }
  
  // 添加文本选择事件监听
  document.addEventListener('mouseup', handleTextSelection)
  // 添加全局点击事件监听器
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  // 清理事件监听
  document.removeEventListener('mouseup', handleTextSelection)
  document.removeEventListener('click', handleDocumentClick)
  
  // 清理定时器
  if (renderTimeout.value) {
    clearTimeout(renderTimeout.value)
  }
})

// 暴露给父组件的方法
defineExpose({
  goToPage,
  generateSmartOutline: generateSmartOutlineItems
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
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--input-background);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 220px;
  max-width: 100%;
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

.fit-page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary-color);
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s ease;
  min-width: 28px;
  height: 28px;
}

.fit-page-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary-color);
  border-color: var(--primary-color);
}

.fit-page-btn svg {
  width: 16px;
  height: 16px;
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

.pdf-dark-mode-toggle {
  background: none;
  border: none;
  color: var(--text-secondary-color);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.pdf-dark-mode-toggle:hover {
  background: var(--hover-color);
  color: var(--text-primary-color);
}

.pdf-dark-mode-toggle svg {
  width: 16px;
  height: 16px;
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
  position: relative;
  flex-wrap: wrap;
  min-height: 60px;
}

.page-navigation .nav-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-navigation .pdf-zoom-control {
  position: absolute;
  right: 16px;
  flex-shrink: 0;
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

/* 右键上下文菜单样式 */
.context-menu {
  position: fixed;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 180px;
  font-size: 14px;
  backdrop-filter: blur(10px);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  color: var(--text-primary-color);
  transition: background-color 0.2s ease;
}

.context-menu-item:hover {
  background-color: var(--hover-bg);
}

.context-menu-item .menu-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.8;
}

.context-menu-separator {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 8px;
}

/* PDF 夜间模式样式 */
.pdf-dark-mode {
  filter: invert(1) hue-rotate(180deg);
}

/* 检测并保持图片在夜间模式下相对正常 */
.pdf-dark-mode :deep(.pdf-page .pdf-image) {
  filter: invert(1) hue-rotate(180deg);
}

/* 响应式设计 */
@media (max-width: 900px) {
  .page-navigation .pdf-zoom-control {
    position: static;
    margin-top: 8px;
  }
  
  .page-navigation {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .page-navigation {
    padding: 12px;
  }
  
  .page-navigation .nav-controls {
    width: 100%;
    justify-content: center;
  }
  
  .page-navigation .pdf-zoom-control {
    width: 100%;
    min-width: auto;
  }
}

@media (max-width: 600px) {
  .pdf-zoom-control {
    min-width: 160px;
  }
  
  .zoom-label {
    min-width: 35px;
  }
}
</style>
