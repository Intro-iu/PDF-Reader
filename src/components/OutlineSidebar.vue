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
          :style="{ marginLeft: `${item.level * 8}px` }"
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
  background-color: var(--md-sys-color-surface-container);
  border-right: 1px solid var(--md-sys-color-outline-variant);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, min-width 0.3s ease;
  width: v-bind('sidebarWidth + "px"');
  min-width: 200px;
  max-width: 400px;
}

.outline-sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 64px;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 400;
  color: var(--md-sys-color-on-surface);
  padding-left: 12px;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.collapse-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.collapse-btn svg {
  width: 24px;
  height: 24px;
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
  color: var(--md-sys-color-on-surface-variant);
  flex: 1;
}

.empty-icon {
  margin-bottom: 16px;
  color: var(--md-sys-color-secondary);
}

.empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-outline p {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--md-sys-color-on-surface);
}

.empty-outline small {
  font-size: 12px;
  margin-bottom: 16px;
}

.smart-generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.smart-generate-btn:hover:not(:disabled) {
  box-shadow: var(--md-sys-elevation-level1);
}

.smart-generate-btn:disabled {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  cursor: not-allowed;
}

.smart-generate-btn .btn-icon {
  width: 18px;
  height: 18px;
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.outline-item {
  cursor: pointer;
  padding: 8px 12px;
  margin: 2px 0;
  border-radius: 8px;
  transition: all 0.2s ease;
  color: var(--md-sys-color-on-surface-variant);
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
}

.outline-item:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.outline-item.active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-weight: 500;
}

.outline-item.active .item-page {
  background-color: var(--md-sys-color-secondary);
  color: var(--md-sys-color-on-secondary);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.item-title {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-page {
  font-size: 12px;
  font-weight: 500;
  min-width: 24px;
  text-align: center;
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 4px 8px;
  border-radius: 8px;
  flex-shrink: 0;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background-color: var(--md-sys-color-primary);
}
</style>
