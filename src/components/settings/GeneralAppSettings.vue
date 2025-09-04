<script setup lang="ts">
import { watch } from 'vue';

interface Props {
    autoSaveSettings: boolean;
    enableSelectionTranslation: boolean;
    textSelectionColor: string;
    selectionOpacity: number;
}

const props = defineProps<Props>();

const emit = defineEmits([
    'update:autoSaveSettings',
    'update:enableSelectionTranslation',
    'update:textSelectionColor',
    'update:selectionOpacity'
]);

function updateSelectionColor(color: string) {
    document.documentElement.style.setProperty('--text-selection-color', color);
}

function updateSelectionOpacity(opacity: number) {
    document.documentElement.style.setProperty('--text-selection-opacity', (opacity / 100).toString());
}

watch(() => props.textSelectionColor, (newColor) => updateSelectionColor(newColor));
watch(() => props.selectionOpacity, (newOpacity) => updateSelectionOpacity(newOpacity));

</script>

<template>
    <div class="settings-section">
        <h3>应用设置</h3>
        <div class="settings-grid">
            <div class="setting-group">
                <label class="checkbox-label">
                    <input 
                        type="checkbox" 
                        :checked="autoSaveSettings" 
                        @change="emit('update:autoSaveSettings', ($event.target as HTMLInputElement).checked)" 
                    />
                    <span class="checkmark"></span>
                    自动保存设置
                </label>
                <small>自动保存配置更改</small>
            </div>
            <div class="setting-group">
                <label class="checkbox-label">
                    <input 
                        type="checkbox" 
                        :checked="enableSelectionTranslation" 
                        @change="emit('update:enableSelectionTranslation', ($event.target as HTMLInputElement).checked)" 
                    />
                    <span class="checkmark"></span>
                    启用划选翻译
                </label>
                <small>选中文本时自动显示翻译选项</small>
            </div>
            <div class="setting-group">
                <label for="text-selection-color">文本选区颜色</label>
                <div class="color-picker-container">
                    <input 
                        type="color" 
                        id="text-selection-color" 
                        :value="textSelectionColor" 
                        @input="emit('update:textSelectionColor', ($event.target as HTMLInputElement).value)" 
                    />
                    <div class="color-preview-group">
                        <div v-for="color in ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14']" :key="color"
                             class="color-preset" 
                             :style="{ backgroundColor: color }"
                             :class="{ active: textSelectionColor === color }"
                             @click="emit('update:textSelectionColor', color)"></div>
                    </div>
                </div>
                <small>设置PDF文档中文本选择时的高亮颜色</small>
            </div>
            <div class="setting-group">
                <label for="selection-opacity">选区透明度</label>
                <div class="slider-container">
                    <input 
                        type="range" 
                        id="selection-opacity" 
                        min="10" 
                        max="80" 
                        step="5" 
                        :value="selectionOpacity" 
                        @input="emit('update:selectionOpacity', Number(($event.target as HTMLInputElement).value))" 
                    />
                    <span class="slider-value">{{ selectionOpacity }}%</span>
                </div>
                <small>调整文本选区的透明度（10% - 80%）</small>
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
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
    display: none;
}
.checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid var(--input-border);
    border-radius: 4px;
    background-color: var(--input-background);
    position: relative;
}
.checkmark::after {
    content: "";
    position: absolute;
    display: none;
    left: 5px;
    top: 1px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}
.checkbox-label input:checked ~ .checkmark {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}
.checkbox-label input:checked ~ .checkmark::after {
    display: block;
}
.color-picker-container {
    display: flex;
    align-items: center;
    gap: 12px;
}
input[type="color"] {
    -webkit-appearance: none;
    width: 40px;
    height: 40px;
    border: none;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
    background-color: transparent;
}
input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
}
input[type="color"]::-webkit-color-swatch {
    border: 2px solid var(--border-color);
    border-radius: 50%;
}
.color-preview-group {
    display: flex;
    gap: 8px;
}
.color-preset {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
}
.color-preset.active {
    border-color: var(--text-primary-color);
}
.slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
}
input[type="range"] {
    flex-grow: 1;
    -webkit-appearance: none;
    height: 6px;
    background: var(--input-background);
    border-radius: 3px;
    outline: none;
    border: 1px solid var(--border-color);
}
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    background: var(--primary-color);
    cursor: pointer;
    border-radius: 50%;
}
.slider-value {
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 40px;
    text-align: right;
}
</style>
