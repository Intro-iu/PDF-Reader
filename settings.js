// --- 设置功能 ---
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            aiModels: [],
            activeChatModel: '',
            activeTranslateModel: '',
            translateTargetLang: 'zh',
            autoSaveSettings: true,
            enableSelectionTranslation: true,
            textSelectionColor: '#007bff',
            selectionOpacity: 30,
            chatPrompt: '',
            translationPrompt: ''
        };
        
        this.settings = this.loadSettings();
        this.initializeSettingsUI();
        this.bindSettingsEvents();
    }
    
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('pdfReaderSettings');
            if (savedSettings) {
                return { ...this.defaultSettings, ...JSON.parse(savedSettings) };
            }
            return { ...this.defaultSettings };
        } catch (error) {
            console.error('加载设置失败:', error);
            return { ...this.defaultSettings };
        }
    }
    
    saveSettings(isManual = false) {
        this.syncToLocalStorage();
        if (isManual) {
            return this.saveToConfigFile();
        }
        return true;
    }
    
    async saveToConfigFile() {
        try {
            const configData = {
                appName: 'PDF-Reader',
                version: '1.0.0',
                lastModified: new Date().toISOString(),
                settings: { ...this.settings }
            };
            
            const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.json';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('配置已保存到 config.json', 'success');
            return true;
        } catch (error) {
            console.error('保存配置文件失败:', error);
            this.showNotification('保存配置文件失败: ' + error.message, 'error');
            return false;
        }
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        if (this.settings.autoSaveSettings) {
            this.saveSettings();
        }
    }
    
    generateModelId() {
        return 'model_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    initializeSettingsUI() {
        const autoSaveSettings = document.getElementById('auto-save-settings');
        const enableSelectionTranslation = document.getElementById('enable-selection-translation');
        const chatPrompt = document.getElementById('chat-prompt');
        const translationPrompt = document.getElementById('translation-prompt');
        
        if (autoSaveSettings) autoSaveSettings.checked = this.settings.autoSaveSettings;
        if (enableSelectionTranslation) enableSelectionTranslation.checked = this.settings.enableSelectionTranslation;
        if (chatPrompt) chatPrompt.value = this.settings.chatPrompt || '';
        if (translationPrompt) translationPrompt.value = this.settings.translationPrompt || '';

        const colorPicker = document.getElementById('text-selection-color');
        const opacitySlider = document.getElementById('selection-opacity');
        const opacityValue = document.querySelector('.slider-value');
        
        if (colorPicker) {
            colorPicker.value = this.settings.textSelectionColor || '#007bff';
            this.updateSelectionColor(colorPicker.value);
            this.updateColorPresetSelection(colorPicker.value);
        }
        
        if (opacitySlider && opacityValue) {
            const opacity = this.settings.selectionOpacity || 30;
            opacitySlider.value = opacity;
            opacityValue.textContent = `${opacity}%`;
            this.updateSelectionOpacity(opacity);
        }
        
        this.renderAiModelsList();
        this.updateModelSelectors();
    }
    
    renderAiModelsList() {
        const container = document.getElementById('ai-models-list');
        if (!this.settings.aiModels || this.settings.aiModels.length === 0) {
            container.innerHTML = `
                <div class="empty-models-message">
                    <p>还没有配置任何AI模型</p>
                    <p>点击"添加模型"按钮开始配置</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.settings.aiModels.map(model => `
            <div class="ai-model-item" data-model-id="${model.id}">
                <div class="ai-model-header">
                    <span class="ai-model-name">${model.name || '未命名模型'}</span>
                    <button type="button" class="ai-model-delete" onclick="settingsManager.deleteAiModel('${model.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="ai-model-fields">
                    <div class="ai-model-field"><label>模型名称</label><input type="text" value="${model.name || ''}" onchange="settingsManager.updateAiModelField('${model.id}', 'name', this.value)"></div>
                    <div class="ai-model-field"><label>模型标识</label><input type="text" value="${model.modelId || ''}" placeholder="如: gpt-3.5-turbo" onchange="settingsManager.updateAiModelField('${model.id}', 'modelId', this.value)"></div>
                    <div class="ai-model-field full-width"><label>API 端点</label><input type="url" value="${model.apiEndpoint || ''}" placeholder="https://api.example.com" onchange="settingsManager.updateAiModelField('${model.id}', 'apiEndpoint', this.value)"></div>
                    <div class="ai-model-field full-width"><label>API 密钥</label><input type="password" value="${model.apiKey || ''}" placeholder="输入API密钥" onchange="settingsManager.updateAiModelField('${model.id}', 'apiKey', this.value)"></div>
                </div>
                <div class="ai-model-capabilities">
                    <label class="capability-checkbox"><input type="checkbox" ${model.supportsChat ? 'checked' : ''} onchange="settingsManager.updateAiModelField('${model.id}', 'supportsChat', this.checked)"> 支持对话</label>
                    <label class="capability-checkbox"><input type="checkbox" ${model.supportsTranslation ? 'checked' : ''} onchange="settingsManager.updateAiModelField('${model.id}', 'supportsTranslation', this.checked)"> 支持翻译</label>
                </div>
            </div>
        `).join('');
    }
    
    addAiModel() {
        const newModel = { id: this.generateModelId(), name: '新模型', modelId: '', apiEndpoint: '', apiKey: '', supportsChat: true, supportsTranslation: true };
        if (!this.settings.aiModels) {
            this.settings.aiModels = [];
        }
        this.settings.aiModels.push(newModel);
        this.renderAiModelsList();
        this.updateModelSelectors();
        if (this.settings.autoSaveSettings) { this.saveSettings(); }
    }
    
    deleteAiModel(modelId) {
        if (confirm('确定要删除这个模型配置吗？')) {
            this.settings.aiModels = this.settings.aiModels.filter(model => model.id !== modelId);
            if (this.settings.activeChatModel === modelId) { this.settings.activeChatModel = ''; }
            if (this.settings.activeTranslateModel === modelId) { this.settings.activeTranslateModel = ''; }
            this.renderAiModelsList();
            this.updateModelSelectors();
            if (this.settings.autoSaveSettings) { this.saveSettings(); }
        }
    }
    
    updateAiModelField(modelId, field, value) {
        const model = this.settings.aiModels.find(m => m.id === modelId);
        if (model) {
            model[field] = value;
            this.updateModelSelectors();
            if (this.settings.autoSaveSettings) { this.saveSettings(); }
        }
    }
    
    updateModelSelectors() {
        const chatSelect = document.getElementById('active-chat-model');
        const translateSelect = document.getElementById('active-translate-model');
        chatSelect.innerHTML = '<option value="">请选择模型</option>';
        translateSelect.innerHTML = '<option value="">请选择模型</option>';
        
        if (this.settings.aiModels) {
            this.settings.aiModels.filter(model => model.supportsChat && model.name && model.apiEndpoint).forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === this.settings.activeChatModel) { option.selected = true; }
                chatSelect.appendChild(option);
            });
            this.settings.aiModels.filter(model => model.supportsTranslation && model.name && model.apiEndpoint).forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === this.settings.activeTranslateModel) { option.selected = true; }
                translateSelect.appendChild(option);
            });
        }
    }
    
    bindSettingsEvents() {
        // 返回按钮
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => { window.location.href = 'index.html'; });
        }
        
        // 弹窗相关事件
        const modal = document.getElementById('ai-model-modal');
        const openBtn = document.getElementById('add-ai-model');
        const closeBtn = document.getElementById('close-ai-model-modal');
        const form = document.getElementById('ai-model-form');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        
        if (!modal || !openBtn || !closeBtn || !form || !confirmBtn) {
            console.error('设置页面的必要元素未找到');
            return;
        }
        
        // 打开弹窗
        openBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            form.reset();
            confirmBtn.disabled = true;
        });
        
        // 关闭弹窗
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        
        // 表单校验
        form.addEventListener('input', () => {
            const name = document.getElementById('modal-model-name').value.trim();
            const modelId = document.getElementById('modal-model-id').value.trim();
            const endpoint = document.getElementById('modal-api-endpoint').value.trim();
            const apiKey = document.getElementById('modal-api-key').value.trim();
            confirmBtn.disabled = !(name && modelId && endpoint && apiKey);
        });
        
        // 确认添加
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newModel = {
                id: this.generateModelId(),
                name: document.getElementById('modal-model-name').value.trim(),
                modelId: document.getElementById('modal-model-id').value.trim(),
                apiEndpoint: document.getElementById('modal-api-endpoint').value.trim(),
                apiKey: document.getElementById('modal-api-key').value.trim(),
                supportsChat: document.getElementById('modal-supports-chat').checked,
                supportsTranslation: document.getElementById('modal-supports-translation').checked
            };
            if (!this.settings.aiModels) this.settings.aiModels = [];
            this.settings.aiModels.push(newModel);
            this.renderAiModelsList();
            this.updateModelSelectors();
            modal.style.display = 'none';
        });
        document.getElementById('active-chat-model').addEventListener('change', (e) => this.updateSetting('activeChatModel', e.target.value));
        document.getElementById('active-translate-model').addEventListener('change', (e) => this.updateSetting('activeTranslateModel', e.target.value));
        document.getElementById('settings-save').addEventListener('click', () => this.collectAndSaveSettings(true));
        document.getElementById('settings-reset').addEventListener('click', () => { if (confirm('确定要重置所有设置吗？')) { this.resetSettings(); this.showNotification('设置已重置', 'info'); } });
        document.getElementById('import-config').addEventListener('click', () => document.getElementById('import-config-file').click());
        document.getElementById('import-config-file').addEventListener('change', (e) => this.importConfig(e.target.files[0]));

        const colorPicker = document.getElementById('text-selection-color');
        const opacitySlider = document.getElementById('selection-opacity');
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            this.updateSelectionColor(color);
            this.updateColorPresetSelection(color);
            if (this.settings.autoSaveSettings) { this.settings.textSelectionColor = color; this.saveSettings(); }
        });
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                colorPicker.value = color;
                this.updateSelectionColor(color);
                this.updateColorPresetSelection(color);
                if (this.settings.autoSaveSettings) { this.settings.textSelectionColor = color; this.saveSettings(); }
            });
        });
        opacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            document.querySelector('.slider-value').textContent = `${opacity}%`;
            this.updateSelectionOpacity(opacity);
            if (this.settings.autoSaveSettings) { this.settings.selectionOpacity = opacity; this.saveSettings(); }
        });
        
        document.querySelectorAll('input[type="checkbox"], #chat-prompt, #translation-prompt').forEach(input => {
            input.addEventListener('change', () => { if (this.settings.autoSaveSettings) { this.collectAndSaveSettings(); } });
        });
    }
    
    collectAndSaveSettings(isManual = false) {
        this.settings.autoSaveSettings = document.getElementById('auto-save-settings').checked;
        this.settings.enableSelectionTranslation = document.getElementById('enable-selection-translation').checked;
        this.settings.activeChatModel = document.getElementById('active-chat-model').value;
        this.settings.activeTranslateModel = document.getElementById('active-translate-model').value;
        this.settings.chatPrompt = document.getElementById('chat-prompt').value;
        this.settings.translationPrompt = document.getElementById('translation-prompt').value;
        this.settings.textSelectionColor = document.getElementById('text-selection-color').value;
        this.settings.selectionOpacity = parseInt(document.getElementById('selection-opacity').value);
        this.saveSettings(isManual);
    }

    updateSelectionColor(color) {
        document.documentElement.style.setProperty('--text-selection-color', color);
        this.syncToLocalStorage();
    }

    updateSelectionOpacity(opacity) {
        const opacityValue = opacity / 100;
        document.documentElement.style.setProperty('--text-selection-opacity', opacityValue);
        this.syncToLocalStorage();
    }

    syncToLocalStorage() {
        try {
            localStorage.setItem('pdfReaderSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('同步设置到localStorage失败:', error);
        }
    }

    updateColorPresetSelection(selectedColor) {
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.toggle('active', preset.dataset.color === selectedColor);
        });
    }
    
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.initializeSettingsUI();
        this.saveSettings();
    }
    
    importConfig(file) {
        if (!file) return;
        if (!file.type.includes('json')) { this.showNotification('请选择JSON格式的配置文件', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const configData = JSON.parse(e.target.result);
                if (!this.validateConfigFile(configData)) { this.showNotification('配置文件格式不正确', 'error'); return; }
                this.settings = { ...this.defaultSettings, ...configData.settings };
                this.initializeSettingsUI();
                this.saveSettings();
                this.showNotification('配置已成功导入', 'success');
            } catch (parseError) {
                this.showNotification('解析配置文件失败', 'error');
            }
        };
        reader.readAsText(file);
        document.getElementById('import-config-file').value = '';
    }
    
    validateConfigFile(configData) {
        return configData && typeof configData.settings === 'object';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => { notification.remove(); }, 3000);
    }
}

function initializeTheme() {
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    
    function applyTheme(theme) {
        document.body.classList.toggle('light-mode', theme === 'light');
        themeIconLight.style.display = theme === 'light' ? 'block' : 'none';
        themeIconDark.style.display = theme === 'dark' ? 'block' : 'none';
    }
    
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    themeToggleButton.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('light-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 只在设置页面初始化主题和设置管理器
    if (document.getElementById('settings-content')) {
        initializeTheme();
        window.settingsManager = new SettingsManager();
    }
});