'''<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';

// 定义 emit，这样我们可以通知父组件关闭模态框
const emit = defineEmits(['close']);

// 定义与 Rust 端 AppConfig 结构匹配的接口
interface AppConfig {
  theme: string;
  always_on_top: boolean;
}

// 创建一个响应式引用来存储配置
const config = ref<AppConfig>({ theme: '', always_on_top: false });

// 组件加载时，从后端获取配置
onMounted(async () => {
  try {
    config.value = await invoke<AppConfig>('get_config');
  } catch (error) {
    console.error("Failed to get config:", error);
  }
});

// 保存设置时，将配置发送到后端
async function saveSettings() {
  try {
    await invoke('set_config', { config: config.value });
    alert('Settings saved!');
    // 保存后也关闭窗口
    emit('close');
  } catch (error) {
    console.error("Failed to save config:", error);
    alert('Failed to save settings.');
  }
}
</script>

<template>
  <!-- 添加一个蒙层 -->
  <div class="modal-overlay" @click="emit('close')">
    <!-- 阻止点击内容区域关闭模态框 -->
    <div class="modal-content" @click.stop>
      <h2>Settings</h2>
      <div class="form-group">
        <label for="theme">Theme</label>
        <input id="theme" v-model="config.theme" type="text" placeholder="e.g., dark, light" />
      </div>
      <div class="form-group">
        <label for="always-on-top">Always on Top</label>
        <input id="always-on-top" v-model="config.always_on_top" type="checkbox" />
      </div>
      <div class="modal-actions">
        <button @click="emit('close')">Cancel</button>
        <button @click="saveSettings" class="primary">Save & Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  padding: 20px;
  background-color: var(--surface-color);
  color: var(--text-primary-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-width: 400px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  color: var(--text-secondary-color);
}

input[type="text"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--input-border);
  background-color: var(--input-background);
  color: var(--text-primary-color);
  border-radius: 4px;
  box-sizing: border-box;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background-color: var(--surface-color);
  color: var(--text-primary-color);
  border-radius: 4px;
  cursor: pointer;
}

button.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

button:hover {
  opacity: 0.9;
}
</style>
''