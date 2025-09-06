<script setup lang="ts">
import { watch, computed } from 'vue';

interface Props {
    autoSaveSettings: boolean;
    enableSelectionTranslation: boolean;
    textSelectionColor: string;
    selectionOpacity: number;
    sourceColor: string;
}

const props = defineProps<Props>();

const emit = defineEmits([
    'update:autoSaveSettings',
    'update:enableSelectionTranslation',
    'update:textSelectionColor',
    'update:selectionOpacity',
    'update:sourceColor'
]);

function updateSelectionColor(color: string) {
    document.documentElement.style.setProperty('--text-selection-color', color);
}

function updateSelectionOpacity(opacity: number) {
    document.documentElement.style.setProperty('--text-selection-opacity', (opacity / 100).toString());
}

watch(() => props.textSelectionColor, (newColor) => updateSelectionColor(newColor));
    watch(() => props.selectionOpacity, (newOpacity) => emit('update:selectionOpacity', newOpacity));

watch(() => props.sourceColor, (newColor) => {
    emit('update:textSelectionColor', newColor);
});

const sliderPercentage = computed(() => {
  const min = 10;
  const max = 80;
  const value = props.selectionOpacity;
  return ((value - min) / (max - min)) * 100;
});

</script>

<template>
    <div class="settings-section">
        <h3>应用设置</h3>
        <div class="settings-grid">
            <div class="setting-group">
                <label for="selection-opacity">选区透明度</label>
                <div class="slider-container">
                    <div class="custom-slider-wrapper">
                        <div class="slider-track"></div>
                        <div class="slider-progress" :style="{ width: sliderPercentage + '%' }"></div>
                        <input 
                            type="range" 
                            id="selection-opacity" 
                            class="slider-input"
                            min="10" 
                            max="80" 
                            step="5" 
                            :value="selectionOpacity" 
                            @input="emit('update:selectionOpacity', Number(($event.target as HTMLInputElement).value))" 
                        />
                    </div>
                    <span class="slider-value">{{ selectionOpacity }}%</span>
                </div>
                <small>调整文本选区的透明度（10% - 80%）</small>
            </div>
        </div>
    </div>
    <div class="settings-section">
        <h3>主题定制</h3>
        <div class="settings-grid">
            <div class="setting-group">
                <label for="source-color">Material You 主色调</label>
                <div class="color-picker-container">
                    <input 
                        type="color" 
                        id="source-color" 
                        :value="sourceColor" 
                        @input="emit('update:sourceColor', ($event.target as HTMLInputElement).value)" 
                    />
                    <div class="color-preview-group">
                        <div v-for="color in ['#6750A4', '#0061A4', '#386A20', '#B3261E', '#795548', '#FF9800']" :key="color"
                             class="color-preset" 
                             :style="{ backgroundColor: color }"
                             :class="{ active: sourceColor === color }"
                             @click="emit('update:sourceColor', color)"></div>
                    </div>
                </div>
                <small>选择一个主色调，应用将根据它生成 Material You (M3) 风格的完整主题。</small>
                <small>此为本地配置，不会写入配置文件</small>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-section {
    margin-bottom: 24px;
}
.settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}
h3 {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 16px;
    color: var(--md-sys-color-primary);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
}
.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
}
.setting-group {
    display: flex;
    flex-direction: column;
}
.setting-group label {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--md-sys-color-on-surface-variant);
}
.setting-group small {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    margin-top: 8px;
    line-height: 1.4;
    opacity: 0.8;
}
.checkbox-label {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1rem;
    cursor: pointer;
    padding: 8px 0;
    color: var(--md-sys-color-on-surface);
}
.checkbox-label input[type="checkbox"] {
    display: none;
}
.checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid var(--md-sys-color-outline);
    border-radius: 4px;
    background-color: var(--md-sys-color-surface-container);
    position: relative;
    transition: all 0.2s ease;
}
.checkmark::after {
    content: "";
    position: absolute;
    display: none;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid var(--md-sys-color-on-primary);
    border-width: 0 3px 3px 0;
    transform: rotate(45deg);
}
.checkbox-label input:checked ~ .checkmark {
    background-color: var(--md-sys-color-primary);
    border-color: var(--md-sys-color-primary);
}
.checkbox-label input:checked ~ .checkmark::after {
    display: block;
}
.color-picker-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
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
    border: 2px solid var(--md-sys-color-outline);
    border-radius: 50%;
}
.color-preview-group {
    display: flex;
    gap: 8px;
}
.color-preset {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--md-sys-color-outline-variant);
    transition: all 0.2s ease;
}
.color-preset:hover {
    transform: scale(1.1);
}
.color-preset.active {
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 0 0 2px var(--md-sys-color-primary);
}
.slider-container {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
}
.custom-slider-wrapper {
    position: relative;
    flex-grow: 1;
    height: 20px; /* Clickable area */
    display: flex;
    align-items: center;
}
.slider-track, .slider-progress {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    border-radius: 2px;
    pointer-events: none; /* Allow clicks to go to the input */
}
.slider-track {
    width: 100%;
    background-color: var(--md-sys-color-surface-container-highest);
}
.slider-progress {
    background-color: var(--md-sys-color-primary);
    z-index: 1;
}
.slider-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    z-index: 3;
}
.slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--md-sys-color-primary);
    border-radius: 50%;
    position: relative;
    z-index: 4;
}
</style>
