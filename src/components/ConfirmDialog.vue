<template>
  <div v-if="show" class="confirm-overlay" @click="handleOverlayClick">
    <div class="confirm-dialog" @click.stop>
      <div class="dialog-header">
        <h4>{{ title || '确认操作' }}</h4>
      </div>
      <div class="dialog-content">
        <p v-if="message">{{ message }}</p>
        <slot></slot>
        <p v-if="warning" class="warning">{{ warning }}</p>
      </div>
      <div class="dialog-actions">
        <button @click="handleCancel" class="cancel-btn">{{ cancelText || '取消' }}</button>
        <button @click="handleConfirm" class="confirm-btn" :class="{ 'danger': isDanger }">
          {{ confirmText || '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  title?: string
  message?: string
  warning?: string
  confirmText?: string
  cancelText?: string
  isDanger?: boolean
  closeOnOverlay?: boolean
}

interface Emits {
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'update:show', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  closeOnOverlay: true,
  isDanger: false
})

const emit = defineEmits<Emits>()

const handleConfirm = () => {
  emit('confirm')
  emit('update:show', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:show', false)
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleCancel()
  }
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.confirm-dialog {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  min-width: 320px;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: dialogAppear 0.2s ease-out;
}

@keyframes dialogAppear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  margin-bottom: 16px;
}

.dialog-header h4 {
  margin: 0;
  color: var(--text-primary-color);
  font-size: 18px;
  font-weight: 600;
}

.dialog-content {
  margin-bottom: 24px;
}

.dialog-content p {
  margin: 0 0 12px 0;
  color: var(--text-primary-color);
  line-height: 1.5;
}

.dialog-content p:last-child {
  margin-bottom: 0;
}

.warning {
  color: #f39c12 !important;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning::before {
  content: '⚠️';
  font-size: 16px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn, .confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 80px;
}

.cancel-btn {
  background: var(--border-color);
  color: var(--text-primary-color);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover {
  background: var(--text-secondary-color);
  color: var(--background-color);
}

.confirm-btn {
  background: var(--primary-color);
  color: white;
}

.confirm-btn:hover {
  background: var(--primary-hover-color);
}

.confirm-btn.danger {
  background: #e74c3c;
}

.confirm-btn.danger:hover {
  background: #c0392b;
}

/* 暗色主题适配 */
:root.dark .confirm-dialog {
  background: var(--surface-color);
  border-color: var(--border-color);
}
</style>
