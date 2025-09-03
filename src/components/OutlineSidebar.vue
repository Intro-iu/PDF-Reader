<template>
  <div class="outline-sidebar" :class="{ 'collapsed': isCollapsed }">
    <!-- 侧栏头部 -->
    <div class="sidebar-header">
      <h3 v-if="!isCollapsed">目录</h3>
      <button 
        @click="toggleCollapse" 
        class="collapse-btn"
        :title="isCollapsed ? '展开目录' : '收起目录'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="isCollapsed" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
          <path v-else d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z"/>
        </svg>
      </button>
    </div>

    <!-- 目录内容 -->
    <div v-if="!isCollapsed" class="outline-content">
      <div v-if="outlineItems.length === 0" class="empty-outline">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
          </svg>
        </div>
        <p>无目录信息</p>
        <small>尝试智能生成目录导航</small>
        <button 
          @click="generateSmartOutline" 
          class="smart-generate-btn"
          :disabled="isGenerating || !props.hasPdfFile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
            <path d="M9,4V6H21V4H9M9,14H21V12H9V14M9,20V18H21V20H9M5,6V4H3V6H1V8H3V10H5V8H7V6H5M5,14H7V12H5V10H3V12H1V14H3V16H5V14M5,18V16H3V18H1V20H3V22H5V20H7V18H5Z"/>
          </svg>
          <span v-if="!isGenerating && props.hasPdfFile">智能生成目录</span>
          <span v-else-if="isGenerating">生成中...</span>
          <span v-else>请先打开PDF文件</span>
        </button>
      </div>

      <div v-else class="outline-list">
        <div 
          v-for="(item, index) in outlineItems" 
          :key="item.id || `outline-${index}-${item.page}-${item.level}`"
          class="outline-item"
          :class="{ 
            'active': (item.id || `outline-${index}-${item.page}-${item.level}`) === activeItemId,
            'smart-generated': !!item.id,
            [`level-${item.level}`]: true
          }"
          :style="{ paddingLeft: `${8 + item.level * 20}px` }"
          @click="goToPage(item)"
        >
          <div class="item-content">
            <span class="item-title" :title="item.title">{{ item.title }}</span>
            <span class="item-page">{{ item.page }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 调整宽度的拖拽条 -->
    <div 
      v-if="!isCollapsed"
      class="resize-handle"
      @mousedown="startResize"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface OutlineItem {
  id?: string // 智能生成目录会有id
  title: string
  page: number
  level: number
}

interface Props {
  outlineData?: OutlineItem[]
  currentPage?: number
  isCollapsed?: boolean
  width?: number
  hasPdfFile?: boolean
}

interface Emits {
  (e: 'go-to-page', page: number): void
  (e: 'toggle-collapse', collapsed: boolean): void
  (e: 'width-changed', width: number): void
  (e: 'generate-smart-outline'): void
}

const props = withDefaults(defineProps<Props>(), {
  outlineData: () => [],
  currentPage: 1,
  isCollapsed: false,
  width: 250,
  hasPdfFile: false
})

const emit = defineEmits<Emits>()

const isCollapsed = ref(props.isCollapsed)
const sidebarWidth = ref(props.width)
const isResizing = ref(false)
const isGenerating = ref(false)

const outlineItems = computed(() => props.outlineData || [])

const activeItemId = computed(() => {
  if (!props.currentPage || outlineItems.value.length === 0) return null
  
  // 找到当前页面对应的目录项
  let activeItem = null
  let activeIndex = -1
  for (let i = outlineItems.value.length - 1; i >= 0; i--) {
    if (outlineItems.value[i].page <= props.currentPage) {
      activeItem = outlineItems.value[i]
      activeIndex = i
      break
    }
  }
  return activeItem?.id || `outline-${activeIndex}-${activeItem?.page}-${activeItem?.level}` || null
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('toggle-collapse', isCollapsed.value)
}

const goToPage = (item: OutlineItem) => {
  emit('go-to-page', item.page)
}

const generateSmartOutline = async () => {
  isGenerating.value = true
  try {
    emit('generate-smart-outline')
  } finally {
    // 延迟重置状态，让用户看到加载状态
    setTimeout(() => {
      isGenerating.value = false
    }, 1000)
  }
}

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const resize = (e: MouseEvent) => {
  if (!isResizing.value) return
  
  const newWidth = Math.max(200, Math.min(400, e.clientX))
  sidebarWidth.value = newWidth
  emit('width-changed', newWidth)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.outline-sidebar {
  position: relative;
  background: var(--surface-color);
  border-right: 1px solid var(--border-color);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  width: v-bind('sidebarWidth + "px"');
  min-width: 200px;
  max-width: 400px;
}

.outline-sidebar.collapsed {
  width: 40px;
  min-width: 40px;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 48px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary-color);
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary-color);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: var(--border-color);
  color: var(--text-primary-color);
}

.collapse-btn svg {
  width: 16px;
  height: 16px;
}

.outline-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-outline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--text-secondary-color);
  flex: 1;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-outline p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-primary-color);
}

.empty-outline small {
  font-size: 12px;
  color: var(--text-secondary-color);
  margin-bottom: 16px;
}

.smart-generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 32px;
}

.smart-generate-btn:hover:not(:disabled) {
  background: var(--primary-hover-color);
  transform: translateY(-1px);
}

.smart-generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.smart-generate-btn .btn-icon {
  width: 14px;
  height: 14px;
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.outline-item {
  cursor: pointer;
  padding: 6px 8px;
  margin: 1px 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  border-left: 2px solid transparent;
  color: var(--text-primary-color);
  position: relative;
}

/* 不同层级的样式 */
.outline-item.level-0 {
  font-weight: 600;
  font-size: 13px;
  background: rgba(var(--primary-color-rgb), 0.05);
}

.outline-item.level-1 {
  font-weight: 500;
  font-size: 13px;
}

.outline-item.level-2 {
  font-weight: 400;
  font-size: 12px;
  opacity: 0.95;
}

.outline-item.level-3 {
  font-weight: 400;
  font-size: 12px;
  opacity: 0.9;
}

.outline-item:hover {
  background: var(--border-color);
}

.outline-item.active {
  background: var(--primary-color);
  color: white;
  border-left-color: var(--primary-hover-color);
}

/* 智能生成目录的特殊样式 */
.outline-item.smart-generated {
  border-left: 2px solid rgba(var(--primary-color-rgb), 0.3);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 智能生成目录的统一字体调整 */
.outline-item.smart-generated.level-0 {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.outline-item.smart-generated.level-1 {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.outline-item.smart-generated.level-2 {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  opacity: 0.95;
}

.outline-item.smart-generated.level-3 {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
  opacity: 0.9;
}

.outline-item.smart-generated:before {
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background: var(--primary-color);
  border-radius: 50%;
  opacity: 0.6;
}

.item-content {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-height: 1.3em;
  width: 100%;
}

.item-title {
  flex: 1;
  font-size: inherit;
  line-height: inherit;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  display: block;
  margin-right: 8px;
  font-weight: inherit;
  color: inherit;
  /* 移除高度限制，让文本完全显示 */
}

.item-page {
  font-size: 10px;
  opacity: 0.7;
  font-weight: 500;
  min-width: 18px;
  text-align: right;
  background: rgba(var(--text-secondary-color-rgb, 128, 128, 128), 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-left: auto;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: var(--primary-color);
}

.outline-list::-webkit-scrollbar {
  width: 6px;
}

.outline-list::-webkit-scrollbar-track {
  background: transparent;
}

.outline-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.outline-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary-color);
}
</style>
