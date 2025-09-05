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
.settings-section { margin-bottom: 24px; }
h3 { font-size: 16px; font-weight: 500; margin-bottom: 16px; color: var(--md-sys-color-primary); padding-bottom: 8px; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
.section-description { font-size: 14px; color: var(--md-sys-color-on-surface-variant); margin-bottom: 16px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.setting-group { display: flex; flex-direction: column; }
.setting-group label { font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--md-sys-color-on-surface-variant); }
.setting-group small { font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin-top: 8px; line-height: 1.4; opacity: 0.8; }
textarea { width: 100%; padding: 12px 16px; border: 1px solid var(--md-sys-color-outline); background-color: var(--md-sys-color-surface-container-highest); color: var(--md-sys-color-on-surface); border-radius: 8px; font-size: 1rem; box-sizing: border-box; resize: vertical; min-height: 100px; transition: all 0.2s ease; }
textarea:focus { border-color: var(--md-sys-color-primary); box-shadow: 0 0 0 2px var(--md-sys-color-primary-container); outline: none; }
code { background-color: var(--md-sys-color-surface-variant); color: var(--md-sys-color-on-surface-variant); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
</style>
