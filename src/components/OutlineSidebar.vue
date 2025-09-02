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
        <small>请打开包含目录的PDF文件</small>
      </div>

      <div v-else class="outline-list">
        <div 
          v-for="item in outlineItems" 
          :key="item.id"
          class="outline-item"
          :class="{ 'active': item.id === activeItemId }"
          :style="{ paddingLeft: `${12 + item.level * 16}px` }"
          @click="goToPage(item)"
        >
          <div class="item-content">
            <span class="item-title">{{ item.title }}</span>
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
  id: string
  title: string
  page: number
  level: number
}

interface Props {
  outlineData?: OutlineItem[]
  currentPage?: number
  isCollapsed?: boolean
  width?: number
}

interface Emits {
  (e: 'go-to-page', page: number): void
  (e: 'toggle-collapse', collapsed: boolean): void
  (e: 'width-changed', width: number): void
}

const props = withDefaults(defineProps<Props>(), {
  outlineData: () => [],
  currentPage: 1,
  isCollapsed: false,
  width: 250
})

const emit = defineEmits<Emits>()

const isCollapsed = ref(props.isCollapsed)
const sidebarWidth = ref(props.width)
const isResizing = ref(false)

const outlineItems = computed(() => props.outlineData || [])

const activeItemId = computed(() => {
  if (!props.currentPage || outlineItems.value.length === 0) return null
  
  // 找到当前页面对应的目录项
  let activeItem = null
  for (let i = outlineItems.value.length - 1; i >= 0; i--) {
    if (outlineItems.value[i].page <= props.currentPage) {
      activeItem = outlineItems.value[i]
      break
    }
  }
  return activeItem?.id || null
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
  emit('toggle-collapse', isCollapsed.value)
}

const goToPage = (item: OutlineItem) => {
  emit('go-to-page', item.page)
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
  color: var(--text-primary);
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
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
  color: var(--text-secondary);
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
  color: var(--text-primary);
}

.empty-outline small {
  font-size: 12px;
  color: var(--text-secondary);
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.outline-item {
  cursor: pointer;
  padding: 8px 12px;
  margin: 0 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  border-left: 2px solid transparent;
}

.outline-item:hover {
  background: var(--border-color);
}

.outline-item.active {
  background: var(--primary-color);
  color: white;
  border-left-color: var(--primary-hover-color);
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.item-title {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-page {
  font-size: 11px;
  opacity: 0.7;
  font-weight: 500;
  min-width: 20px;
  text-align: right;
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
  background: var(--text-secondary);
}
</style>
