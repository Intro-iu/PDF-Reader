import { ref } from 'vue';

export type NotificationType = 'info' | 'success' | 'error';

interface Notification {
    id: number;
    message: string;
    type: NotificationType;
    duration: number;
}

const notifications = ref<Notification[]>([]);

export function useNotification() {

    const showNotification = (message: string, type: NotificationType = 'info', duration: number = 3000) => {
        const id = Date.now() + Math.random();
        
        notifications.value.push({
            id,
            message,
            type,
            duration
        });

        setTimeout(() => {
            removeNotification(id);
        }, duration);
    };

    const removeNotification = (id: number) => {
        const index = notifications.value.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications.value.splice(index, 1);
        }
    };

    return {
        notifications,
        showNotification,
        removeNotification
    };
}
