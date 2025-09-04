<script setup lang="ts">
import { ref } from 'vue';
import { checkForUpdates } from '../../utils/updateChecker';

interface Props {
    currentVersion: string;
}

defineProps<Props>();
const emit = defineEmits(['show-notification']);

const checkingUpdate = ref(false);

function handleCheckUpdate() {
    checkingUpdate.value = true;
    checkForUpdates().then(updateInfo => {
        if (updateInfo.hasUpdate) {
            emit('show-notification', `发现新版本 v${updateInfo.latestVersion}！`, 'success');
            const choice = confirm(
                `发现新版本 v${updateInfo.latestVersion}！\n\n` +
                `点击"确定"前往发布页查看详情\n` +
                `点击"取消"直接下载更新包`
            );
            if (choice) {
                const releaseUrl = updateInfo.releaseUrl || 'https://github.com/ZeroHzzzz/PDF-Reader/releases';
                window.open(releaseUrl, '_blank');
            } else {
                if (updateInfo.downloadUrl) {
                    window.open(updateInfo.downloadUrl, '_blank');
                } else {
                    const releaseUrl = updateInfo.releaseUrl || 'https://github.com/ZeroHzzzz/PDF-Reader/releases';
                    window.open(releaseUrl, '_blank');
                }
            }
        } else {
            emit('show-notification', '当前已是最新版本！', 'info');
        }
    }).catch(error => {
        console.error('检查更新失败:', error);
        emit('show-notification', '检查更新失败，请稍后重试', 'error');
    }).finally(() => {
        setTimeout(() => { checkingUpdate.value = false; }, 1000);
    });
}
</script>

<template>
    <div class="settings-section">
        <h3>关于</h3>
        <div class="settings-grid">
            <div class="setting-group">
                <label>应用版本</label>
                <div class="version-info">
                    <span class="version-text">{{ currentVersion }}</span>
                    <button type="button" class="btn-check-update" @click="handleCheckUpdate" :disabled="checkingUpdate">
                        {{ checkingUpdate ? '检查中...' : '检查更新' }}
                    </button>
                </div>
                <small>点击检查更新按钮查看是否有新版本可用</small>
            </div>
            <div class="setting-group">
                <label>开发信息</label>
                <div class="app-info">
                    <p>GitHub: <a href="https://github.com/ZeroHzzzz/PDF-Reader" target="_blank">ZeroHzzzz/PDF-Reader</a></p>
                    <p>技术栈: Vue 3 + Tauri + TypeScript</p>
                </div>
                <small>一个简洁的跨平台PDF阅读器</small>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Styles are copied from SettingsModal.vue */
.settings-section {
    margin-bottom: 40px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 24px;
}
.settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}
h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary-color);
}
.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
}
.setting-group {
    display: flex;
    flex-direction: column;
}
.setting-group label {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--text-secondary-color);
}
.setting-group small {
    font-size: 0.8rem;
    color: var(--text-tertiary-color);
    margin-top: 8px;
    line-height: 1.4;
}
.version-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}
.version-text {
    font-family: 'Courier New', monospace;
    background: var(--input-background);
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary-color);
    border: 1px solid var(--border-color);
}
.btn-check-update {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
}
.app-info {
    margin-top: 8px;
    line-height: 1.6;
}
.app-info p {
    margin: 4px 0;
    font-size: 0.9rem;
    color: var(--text-secondary-color);
}
.app-info a {
    color: var(--primary-color);
    text-decoration: none;
}
</style>
