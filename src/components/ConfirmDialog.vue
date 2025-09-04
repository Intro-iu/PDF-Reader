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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.confirm-dialog {
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: 28px;
  padding: 24px;
  min-width: 280px;
  max-width: 560px;
  box-shadow: var(--md-sys-elevation-level3);
  animation: dialogAppear 0.2s ease-out;
}

@keyframes dialogAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.dialog-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--md-sys-color-on-surface);
}

.dialog-header h4 {
  margin: 0;
  font-size: 24px;
  font-weight: 400;
  line-height: 32px;
}

.dialog-content {
  margin-bottom: 24px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}

.dialog-content p {
  margin: 0 0 12px 0;
}

.dialog-content p:last-child {
  margin-bottom: 0;
}

.warning {
  color: var(--md-sys-color-error);
  font-weight: 500;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-btn, .confirm-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.cancel-btn {
  background-color: transparent;
  color: var(--md-sys-color-primary);
  border: 1px solid var(--md-sys-color-outline);
}

.cancel-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.confirm-btn {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.confirm-btn:hover {
  box-shadow: var(--md-sys-elevation-level1);
}

.confirm-btn.danger {
  background-color: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
}

.confirm-btn.danger:hover {
  background-color: color-mix(in srgb, var(--md-sys-color-error), #fff 10%);
}
</style>
