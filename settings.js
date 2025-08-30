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
            selectionOpacity: 30
        };
        
        this.settings = this.loadSettings();
        this.initializeSettingsUI();
        this.bindSettingsEvents();
    }
    
    loadSettings() {
        try {
            // 首先尝试从localStorage读取（作为临时存储）
            const savedSettings = localStorage.getItem('pdfReaderSettings');
            if (savedSettings) {
                // 如果有localStorage数据，加载它但提示用户保存到文件
                const settings = { ...this.defaultSettings, ...JSON.parse(savedSettings) };
                // 清除localStorage，提示用户使用文件存储
                localStorage.removeItem('pdfReaderSettings');
                return settings;
            }
            return { ...this.defaultSettings };
        } catch (error) {
            console.error('加载设置失败:', error);
            return { ...this.defaultSettings };
        }
    }
    
    saveSettings(isManual = false) {
        // 自动保存只同步localStorage，手动保存才下载文件
        this.syncToLocalStorage();
        if (isManual) {
            return this.saveToConfigFile();
        }
        return true;
    }
    
    // 保存到配置文件的方法
    async saveToConfigFile() {
        try {
            // 创建配置文件内容
            const configData = {
                ...this.settings,
                lastModified: new Date().toISOString()
            };
            
            // 生成并下载配置文件
            const blob = new Blob([JSON.stringify(configData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.json'; // 简洁的文件名
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
        // 填充基本设置
        document.getElementById('auto-save-settings').checked = this.settings.autoSaveSettings;
        document.getElementById('enable-selection-translation').checked = this.settings.enableSelectionTranslation;
        
        // 初始化颜色选择器
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
        
        // 渲染AI模型列表
        this.renderAiModelsList();
        this.updateModelSelectors();
    }
    
    renderAiModelsList() {
        const container = document.getElementById('ai-models-list');
        
        if (this.settings.aiModels.length === 0) {
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="ai-model-fields">
                    <div class="ai-model-field">
                        <label>模型名称</label>
                        <input type="text" value="${model.name || ''}" 
                               onchange="settingsManager.updateAiModelField('${model.id}', 'name', this.value)">
                    </div>
                    <div class="ai-model-field">
                        <label>模型标识</label>
                        <input type="text" value="${model.modelId || ''}" 
                               placeholder="如: gpt-3.5-turbo"
                               onchange="settingsManager.updateAiModelField('${model.id}', 'modelId', this.value)">
                    </div>
                    <div class="ai-model-field full-width">
                        <label>API 端点</label>
                        <input type="url" value="${model.apiEndpoint || ''}" 
                               placeholder="https://api.example.com"
                               onchange="settingsManager.updateAiModelField('${model.id}', 'apiEndpoint', this.value)">
                    </div>
                    <div class="ai-model-field full-width">
                        <label>API 密钥</label>
                        <input type="password" value="${model.apiKey || ''}" 
                               placeholder="输入API密钥"
                               onchange="settingsManager.updateAiModelField('${model.id}', 'apiKey', this.value)">
                    </div>
                </div>
                <div class="ai-model-capabilities">
                    <label class="capability-checkbox">
                        <input type="checkbox" ${model.supportsChat ? 'checked' : ''} 
                               onchange="settingsManager.updateAiModelField('${model.id}', 'supportsChat', this.checked)">
                        支持对话
                    </label>
                    <label class="capability-checkbox">
                        <input type="checkbox" ${model.supportsTranslation ? 'checked' : ''} 
                               onchange="settingsManager.updateAiModelField('${model.id}', 'supportsTranslation', this.checked)">
                        支持翻译
                    </label>
                </div>
            </div>
        `).join('');
    }
    
    addAiModel() {
        const newModel = {
            id: this.generateModelId(),
            name: '新模型',
            modelId: '',
            apiEndpoint: '',
            apiKey: '',
            supportsChat: true,
            supportsTranslation: true
        };
        
        this.settings.aiModels.push(newModel);
        this.renderAiModelsList();
        this.updateModelSelectors();
        
        if (this.settings.autoSaveSettings) {
            this.saveSettings();
        }
    }
    
    deleteAiModel(modelId) {
        if (confirm('确定要删除这个模型配置吗？')) {
            this.settings.aiModels = this.settings.aiModels.filter(model => model.id !== modelId);
            
            // 如果删除的是当前选中的模型，清空选择
            if (this.settings.activeChatModel === modelId) {
                this.settings.activeChatModel = '';
            }
            if (this.settings.activeTranslateModel === modelId) {
                this.settings.activeTranslateModel = '';
            }
            
            this.renderAiModelsList();
            this.updateModelSelectors();
            
            if (this.settings.autoSaveSettings) {
                this.saveSettings();
            }
        }
    }
    
    updateAiModelField(modelId, field, value) {
        const model = this.settings.aiModels.find(m => m.id === modelId);
        if (model) {
            model[field] = value;
            this.updateModelSelectors();
            
            if (this.settings.autoSaveSettings) {
                this.saveSettings();
            }
        }
    }
    
    updateModelSelectors() {
        const chatSelect = document.getElementById('active-chat-model');
        const translateSelect = document.getElementById('active-translate-model');
        
        // 清空现有选项
        chatSelect.innerHTML = '<option value="">请选择模型</option>';
        translateSelect.innerHTML = '<option value="">请选择模型</option>';
        
        // 添加支持对话的模型
        this.settings.aiModels
            .filter(model => model.supportsChat && model.name && model.apiEndpoint)
            .forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === this.settings.activeChatModel) {
                    option.selected = true;
                }
                chatSelect.appendChild(option);
            });
        
        // 添加支持翻译的模型
        this.settings.aiModels
            .filter(model => model.supportsTranslation && model.name && model.apiEndpoint)
            .forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.id === this.settings.activeTranslateModel) {
                    option.selected = true;
                }
                translateSelect.appendChild(option);
            });
    }
    
    bindSettingsEvents() {
        const addModelButton = document.getElementById('add-ai-model');
        const saveButton = document.getElementById('settings-save');
        const resetButton = document.getElementById('settings-reset');
        const backButton = document.getElementById('back-button');
        const importButton = document.getElementById('import-config');
        const importFileInput = document.getElementById('import-config-file');
        
        // 返回按钮
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 添加AI模型
        addModelButton.addEventListener('click', () => {
            this.addAiModel();
        });
        
        // 模型选择器变化
        document.getElementById('active-chat-model').addEventListener('change', (e) => {
            this.updateSetting('activeChatModel', e.target.value);
        });
        
        document.getElementById('active-translate-model').addEventListener('change', (e) => {
            this.updateSetting('activeTranslateModel', e.target.value);
        });
        
        // 保存设置（现在直接保存到文件）
        saveButton.addEventListener('click', () => {
            this.collectAndSaveSettings(true); // 手动保存才下载文件
        });
        
        // 重置设置
        resetButton.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？这将恢复到默认值。')) {
                this.resetSettings();
                this.showNotification('设置已重置', 'info');
            }
        });
        
        // 导入配置
        importButton.addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', (e) => {
            this.importConfig(e.target.files[0]);
        });

        // 文本选择颜色设置
        const colorPicker = document.getElementById('text-selection-color');
        const colorPresets = document.querySelectorAll('.color-preset');
        const opacitySlider = document.getElementById('selection-opacity');
        const opacityValue = document.querySelector('.slider-value');

        // 颜色选择器变化
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            this.updateSelectionColor(color);
            this.updateColorPresetSelection(color);
            if (this.settings.autoSaveSettings) {
                this.settings.textSelectionColor = color;
                this.saveSettings();
            }
        });

        // 颜色预设点击
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                colorPicker.value = color;
                this.updateSelectionColor(color);
                this.updateColorPresetSelection(color);
                if (this.settings.autoSaveSettings) {
                    this.settings.textSelectionColor = color;
                    this.saveSettings();
                }
            });
        });

        // 透明度滑条变化
        opacitySlider.addEventListener('input', (e) => {
            const opacity = parseInt(e.target.value);
            opacityValue.textContent = `${opacity}%`;
            this.updateSelectionOpacity(opacity);
            if (this.settings.autoSaveSettings) {
                this.settings.selectionOpacity = opacity;
                this.saveSettings();
            }
        });
        
        // 自动保存设置变化
        const inputs = document.querySelectorAll('input:not([onchange]), select:not([onchange])');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (this.settings.autoSaveSettings) {
                    this.collectAndSaveSettings();
                }
            });
        });
    }
    
    collectAndSaveSettings(isManual = false) {
        this.settings.autoSaveSettings = document.getElementById('auto-save-settings').checked;
        this.settings.enableSelectionTranslation = document.getElementById('enable-selection-translation').checked;
        this.settings.activeChatModel = document.getElementById('active-chat-model').value;
        this.settings.activeTranslateModel = document.getElementById('active-translate-model').value;
        
        // 获取颜色选择器的值
        const colorPicker = document.getElementById('text-selection-color');
        const opacitySlider = document.getElementById('selection-opacity');
        
        if (colorPicker) {
            this.settings.textSelectionColor = colorPicker.value;
        }
        
        if (opacitySlider) {
            this.settings.selectionOpacity = parseInt(opacitySlider.value);
        }
        
        this.saveSettings(isManual);
    }

    // 更新文本选择颜色
    updateSelectionColor(color) {
        document.documentElement.style.setProperty('--text-selection-color', color);
        // 同步到localStorage供主页面使用
        this.syncToLocalStorage();
    }

    // 更新文本选择透明度
    updateSelectionOpacity(opacity) {
        const opacityValue = opacity / 100;
        document.documentElement.style.setProperty('--text-selection-opacity', opacityValue);
        // 同步到localStorage供主页面使用
        this.syncToLocalStorage();
    }

    // 同步设置到localStorage（供主页面实时使用）
    syncToLocalStorage() {
        try {
            localStorage.setItem('pdfReaderSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('同步设置到localStorage失败:', error);
        }
    }

    // 更新颜色预设的选中状态
    updateColorPresetSelection(selectedColor) {
        const colorPresets = document.querySelectorAll('.color-preset');
        colorPresets.forEach(preset => {
            if (preset.dataset.color === selectedColor) {
                preset.classList.add('active');
            } else {
                preset.classList.remove('active');
            }
        });
    }
    
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.initializeSettingsUI();
        this.saveSettings();
    }
    
    // 添加一个获取当前选中模型配置的方法
    getActiveModel(type) {
        const modelId = type === 'chat' ? this.settings.activeChatModel : this.settings.activeTranslateModel;
        return this.settings.aiModels.find(model => model.id === modelId);
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加通知样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10001',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });
        
        // 设置背景色
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动移除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    getSettings() {
        return { ...this.settings };
    }
    
    getSetting(key) {
        return this.settings[key];
    }
    
    // 从文件导入配置
    importConfig(file) {
        if (!file) return;
        
        // 检查文件类型
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            this.showNotification('请选择JSON格式的配置文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const configData = JSON.parse(e.target.result);
                
                // 验证配置文件格式
                if (!this.validateConfigFile(configData)) {
                    this.showNotification('配置文件格式不正确', 'error');
                    return;
                }
                
                // 备份当前设置
                const backupSettings = { ...this.settings };
                
                try {
                    // 导入设置
                    this.settings = { ...this.defaultSettings, ...configData.settings };
                    
                    // 更新UI
                    this.initializeSettingsUI();
                    
                    // 保存设置
                    this.saveSettings();
                    
                    this.showNotification('配置已导入', 'success');
                } catch (importError) {
                    // 如果导入失败，恢复备份
                    this.settings = backupSettings;
                    this.initializeSettingsUI();
                    console.error('导入配置时出错:', importError);
                    this.showNotification('导入配置时出错，已恢复原设置', 'error');
                }
            } catch (parseError) {
                console.error('解析配置文件失败:', parseError);
                this.showNotification('配置文件格式错误', 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('读取文件失败', 'error');
        };
        
        reader.readAsText(file);
        
        // 清空文件输入，以便可以重复导入同一文件
        document.getElementById('import-config-file').value = '';
    }
    
    // 验证配置文件格式
    validateConfigFile(configData) {
        // 检查基本结构
        if (!configData || typeof configData !== 'object') {
            return false;
        }
        
        // 检查是否有settings字段
        if (!configData.settings || typeof configData.settings !== 'object') {
            return false;
        }
        
        // 检查应用名称（可选）
        if (configData.appName && configData.appName !== 'PDF-Reader') {
            console.warn('配置文件可能来自其他应用，但仍尝试导入');
        }
        
        // 检查版本兼容性（可选）
        if (configData.version) {
            const version = configData.version;
            // 这里可以添加版本兼容性检查逻辑
            console.log(`导入配置文件版本: ${version}`);
        }
        
        return true;
    }
}

// --- 主题切换功能 ---
function initializeTheme() {
    const themeToggleButton = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    
    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            themeIconLight.style.display = 'block';
            themeIconDark.style.display = 'none';
        } else {
            document.body.classList.remove('light-mode');
            themeIconLight.style.display = 'none';
            themeIconDark.style.display = 'block';
        }
    }
    
    // 初始化主题
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    // 主题切换事件
    themeToggleButton.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    const settingsManager = new SettingsManager();
    
    // 将设置管理器暴露到全局作用域，供HTML中的onclick事件使用
    window.settingsManager = settingsManager;
});
