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
            pdfZoomLevel: 1
        };
        
        this.settings = this.loadSettings();
        this.initializeSettingsUI();
        this.bindSettingsEvents();
    }
    
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('pdfReaderSettings');
            return savedSettings ? { ...this.defaultSettings, ...JSON.parse(savedSettings) } : { ...this.defaultSettings };
        } catch (error) {
            console.error('加载设置失败:', error);
            return { ...this.defaultSettings };
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('pdfReaderSettings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
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
        document.getElementById('translate-target-lang').value = this.settings.translateTargetLang;
        document.getElementById('auto-save-settings').checked = this.settings.autoSaveSettings;
        document.getElementById('enable-selection-translation').checked = this.settings.enableSelectionTranslation;
        document.getElementById('pdf-zoom-level').value = this.settings.pdfZoomLevel;
        
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
        
        // 保存设置
        saveButton.addEventListener('click', () => {
            this.collectAndSaveSettings();
            this.showNotification('设置已保存', 'success');
        });
        
        // 重置设置
        resetButton.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？这将恢复到默认值。')) {
                this.resetSettings();
                this.showNotification('设置已重置', 'info');
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
    
    collectAndSaveSettings() {
        this.settings.translateTargetLang = document.getElementById('translate-target-lang').value;
        this.settings.autoSaveSettings = document.getElementById('auto-save-settings').checked;
        this.settings.enableSelectionTranslation = document.getElementById('enable-selection-translation').checked;
        this.settings.pdfZoomLevel = parseFloat(document.getElementById('pdf-zoom-level').value);
        this.settings.activeChatModel = document.getElementById('active-chat-model').value;
        this.settings.activeTranslateModel = document.getElementById('active-translate-model').value;
        
        this.saveSettings();
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
