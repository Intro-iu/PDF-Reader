<script setup lang="ts">

interface Props {
    chatPrompt: string;
    translationPrompt: string;
}

defineProps<Props>();
const emit = defineEmits(['update:chatPrompt', 'update:translationPrompt']);

</script>

<template>
    <div class="settings-section">
        <h3>提示词配置</h3>
        <p class="section-description">为AI对话和翻译功能自定义系统级提示词（System Prompt）。</p>
        <div class="settings-grid">
            <div class="setting-group">
                <label for="chat-prompt">AI 对话提示词</label>
                <textarea 
                    id="chat-prompt" 
                    rows="4" 
                    placeholder="例如：你是一个专业的学术论文阅读助手。" 
                    :value="chatPrompt" 
                    @input="emit('update:chatPrompt', ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
                <small>自定义系统级提示词，将在每次对话时被发送给AI模型。</small>
            </div>
            <div class="setting-group">
                <label for="translation-prompt">划词翻译提示词</label>
                <textarea 
                    id="translation-prompt" 
                    rows="4" 
                    placeholder="例如：Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]" 
                    :value="translationPrompt" 
                    @input="emit('update:translationPrompt', ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
                <small>为划词翻译功能设置提示词。可使用占位符 <code>[SELECTED_TEXT]</code> 和 <code>[TARGET_LANG]</code>。</small>
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
h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary-color);
}
.section-description {
    font-size: 0.9rem;
    color: var(--text-secondary-color);
    margin-bottom: 16px;
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
textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--input-border);
    background-color: var(--input-background);
    color: var(--text-primary-color);
    border-radius: 6px;
    font-size: 0.9rem;
    box-sizing: border-box;
    resize: vertical;
    min-height: 80px;
}
</style>
