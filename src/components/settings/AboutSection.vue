<script setup lang="ts">
import { ref } from 'vue';
import { checkForUpdates } from '../../utils/updateChecker';
import { useNotification } from '../../composables/useNotification';

interface Props {
    currentVersion: string;
}

defineProps<Props>();
const { showNotification } = useNotification();

const checkingUpdate = ref(false);

function handleCheckUpdate() {
    checkingUpdate.value = true;
    checkForUpdates().then(updateInfo => {
        if (updateInfo.hasUpdate) {
            showNotification(`发现新版本 v${updateInfo.latestVersion}！`, 'success');
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
            showNotification('当前已是最新版本！', 'info');
        }
    }).catch(error => {
        console.error('检查更新失败:', error);
        showNotification('检查更新失败，请稍后重试', 'error');
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
                    <button type="button" class="outlined-button" @click="handleCheckUpdate" :disabled="checkingUpdate">
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
.settings-section { margin-bottom: 24px; }
h3 { font-size: 16px; font-weight: 500; margin-bottom: 16px; color: var(--md-sys-color-primary); padding-bottom: 8px; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.setting-group { display: flex; flex-direction: column; }
.setting-group label { font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--md-sys-color-on-surface-variant); }
.setting-group small { font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin-top: 8px; line-height: 1.4; opacity: 0.8; }
.version-info { display: flex; align-items: center; gap: 12px; }
.version-text { font-family: monospace; background: var(--md-sys-color-surface-container-highest); padding: 8px 12px; border-radius: 8px; font-size: 1rem; font-weight: 500; color: var(--md-sys-color-on-surface); border: 1px solid var(--md-sys-color-outline-variant); }
.app-info { margin-top: 8px; line-height: 1.6; }
.app-info p { margin: 4px 0; font-size: 14px; color: var(--md-sys-color-on-surface-variant); }
.app-info a { color: var(--md-sys-color-primary); text-decoration: none; }
.app-info a:hover { text-decoration: underline; }

.outlined-button { padding: 10px; border-radius: 20px; border: 1px solid var(--md-sys-color-outline); cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; background-color: transparent; color: var(--md-sys-color-primary); padding: 0 24px; }
.outlined-button:hover { background-color: var(--md-sys-color-surface-container-highest); }
.outlined-button:disabled { color: var(--md-sys-color-on-surface-variant); border-color: var(--md-sys-color-outline-variant); cursor: not-allowed; }
</style>