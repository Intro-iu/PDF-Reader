<script setup lang="ts">
import { useNotification } from '../composables/useNotification';

const { notifications, removeNotification } = useNotification();
</script>

<template>
    <div class="notification-container">
        <TransitionGroup name="list" tag="div">
            <div 
                v-for="notification in notifications" 
                :key="notification.id" 
                :class="['notification', `notification-${notification.type}`]"
                @click="removeNotification(notification.id)"
            >
                {{ notification.message }}
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.notification {
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 250px;
    max-width: 400px;
}

.notification:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.notification-info { background-color: #007bff; }
.notification-success { background-color: #28a745; }
.notification-error { background-color: #dc3545; }

/* Transition styles */
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
</style>
