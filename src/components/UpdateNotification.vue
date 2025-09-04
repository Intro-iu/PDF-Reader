<template>
  <div v-if="showUpdateNotification" class="update-notification">
    <div class="update-content">
      <div class="update-header">
        <i class="icon-update">🔄</i>
        <h3>发现新版本</h3>
        <button class="close-btn" @click="closeNotification">×</button>
      </div>
      
      <div class="update-info">
        <p>
          当前版本: <span class="version current">v{{ updateInfo.currentVersion }}</span>
          → 最新版本: <span class="version latest">v{{ updateInfo.latestVersion }}</span>
        </p>
        
        <div v-if="updateInfo.releaseNotes" class="release-notes">
          <h4>更新内容:</h4>
          <div class="notes-content" v-html="formatReleaseNotes(updateInfo.releaseNotes)"></div>
        </div>
      </div>
      
      <div class="update-actions">
        <button class="btn btn-secondary" @click="skipThisVersion">跳过此版本</button>
        <button class="btn btn-primary" @click="downloadUpdate">下载更新</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { checkForUpdates, shouldCheckForUpdates, recordUpdateCheck, type UpdateInfo } from '../utils/updateChecker'

const showUpdateNotification = ref(false)
const updateInfo = ref<UpdateInfo>({
  hasUpdate: false,
  currentVersion: '',
  latestVersion: ''
})

// 检查更新
const checkUpdate = async () => {
  if (!shouldCheckForUpdates()) {
    return
  }
  
  try {
    const info = await checkForUpdates()
    recordUpdateCheck()
    
    if (info.hasUpdate && !isVersionSkipped(info.latestVersion)) {
      updateInfo.value = info
      showUpdateNotification.value = true
    }
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}

// 检查版本是否被跳过
const isVersionSkipped = (version: string): boolean => {
  const skippedVersions = JSON.parse(localStorage.getItem('skipped_versions') || '[]')
  return skippedVersions.includes(version)
}

// 跳过此版本
const skipThisVersion = () => {
  const skippedVersions = JSON.parse(localStorage.getItem('skipped_versions') || '[]')
  skippedVersions.push(updateInfo.value.latestVersion)
  localStorage.setItem('skipped_versions', JSON.stringify(skippedVersions))
  closeNotification()
}

// 下载更新
const downloadUpdate = () => {
  if (updateInfo.value.downloadUrl) {
    window.open(updateInfo.value.downloadUrl, '_blank')
  } else if (updateInfo.value.releaseUrl) {
    window.open(updateInfo.value.releaseUrl, '_blank')
  }
  closeNotification()
}

// 关闭通知
const closeNotification = () => {
  showUpdateNotification.value = false
}

// 格式化更新说明
const formatReleaseNotes = (notes: string): string => {
  // 简单的Markdown转HTML处理
  return notes
    .replace(/#{1,6}\s+(.*)/g, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
    .substring(0, 300) + (notes.length > 300 ? '...' : '')
}

onMounted(() => {
  // 延迟5秒后检查更新，避免影响应用启动
  setTimeout(checkUpdate, 5000)
})

// 暴露检查更新方法供手动调用
defineExpose({
  checkUpdate
})
</script>

<style scoped>
.update-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid #e1e5e9;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.update-content {
  padding: 20px;
}

.update-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.icon-update {
  font-size: 24px;
  margin-right: 12px;
}

.update-header h3 {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #95a5a6;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #6c757d;
}

.update-info {
  margin-bottom: 20px;
}

.update-info p {
  margin: 0 0 12px 0;
  color: #495057;
}

.version {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.version.current {
  background: #e9ecef;
  color: #6c757d;
}

.version.latest {
  background: #d4edda;
  color: #155724;
}

.release-notes {
  margin-top: 12px;
}

.release-notes h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.notes-content {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #6c757d;
  max-height: 120px;
  overflow-y: auto;
}

.notes-content :deep(h4) {
  margin: 0 0 4px 0;
  font-size: 13px;
  color: #495057;
}

.notes-content :deep(code) {
  background: #e9ecef;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.update-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}
</style>
