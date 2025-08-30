pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- DOM Elements ---
const fileInput = document.getElementById('file-input');
const pdfViewer = document.getElementById('pdf-viewer');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const tabsContainer = document.querySelector('.sidebar-tabs');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const themeToggleButton = document.getElementById('theme-toggle');
const themeIconLight = document.getElementById('theme-icon-light');
const themeIconDark = document.getElementById('theme-icon-dark');

// Translate Panel Elements
const selectedTextContainer = document.getElementById('selected-text');

// Chat Panel Elements
const chatWelcomeView = document.getElementById('chat-welcome-view');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send');
const newChatButton = document.getElementById('new-chat-btn');

// --- Theme Switching ---
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

themeToggleButton.addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

// --- Sidebar & Tabs Logic ---
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.classList.toggle('collapsed');
});

tabsContainer.addEventListener('click', (e) => {
    const clickedTab = e.target.closest('.tab-button');
    if (!clickedTab) return;
    tabButtons.forEach(button => button.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));
    clickedTab.classList.add('active');
    document.getElementById(clickedTab.dataset.tab).classList.add('active');
});

// --- PDF & Selection Logic ---
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    const reader = new FileReader();
    reader.onload = (event) => renderPdf(event.target.result);
    reader.readAsArrayBuffer(file);
});

pdfViewer.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
        selectedTextContainer.textContent = selection;
        chatInput.value = `请帮我分析这段内容:"${selection}"`;
        document.querySelector('.tab-button[data-tab="chat-panel"]').click();
        chatInput.focus();
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    }
});

// --- VSC Copilot-style Chat Logic ---
function handleUserChat() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Hide welcome view if it exists
    const welcomeView = document.getElementById('chat-welcome-view');
    if (welcomeView) {
        welcomeView.remove();
    }

    const responseBody = addChatTurn(userMessage);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSendButton.disabled = true;

    // Show typing indicator
    showTypingIndicator(responseBody);

    setTimeout(() => {
        hideTypingIndicator(responseBody);
        const botResponse = generateCopilotResponse(userMessage);
        streamResponse(responseBody, botResponse);
    }, Math.random() * 1000 + 800); // Random delay between 800ms-1800ms
}

function generateCopilotResponse(userMessage) {
    const responses = [
        "基于您提供的文档内容，我可以为您分析以下几个要点：\n\n1. 这段内容的主要概念和核心思想\n2. 相关的技术细节或理论背景\n3. 可能的应用场景或实际意义\n\n需要我详细解释其中的某个方面吗？",
        "我理解您想了解这部分内容。让我来帮您梳理一下：\n\n这段文字主要讨论了...\n\n从技术角度来看，这涉及到...\n\n如果您有更具体的问题，请随时告诉我！",
        "这是一个很好的问题！根据文档内容，我可以为您提供以下见解：\n\n• 核心概念解析\n• 实际应用价值\n• 相关技术要点\n\n您希望我深入探讨哪个方面呢？"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function showTypingIndicator(targetElement) {
    targetElement.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    targetElement.classList.add('typing');
}

function hideTypingIndicator(targetElement) {
    targetElement.classList.remove('typing');
    targetElement.innerHTML = '';
}

chatSendButton.addEventListener('click', handleUserChat);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserChat();
    }
});

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

// --- New Chat Functionality ---
newChatButton.addEventListener('click', startNewChat);

function startNewChat() {
    // Clear all chat messages
    chatMessages.innerHTML = '';
    
    // Show welcome view again
    chatMessages.appendChild(createWelcomeView());
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Re-enable send button
    chatSendButton.disabled = false;
    
    // Focus on input
    chatInput.focus();
    
    // Add a subtle animation
    chatMessages.style.opacity = '0';
    setTimeout(() => {
        chatMessages.style.opacity = '1';
    }, 100);
}

function createWelcomeView() {
    const welcomeView = document.createElement('div');
    welcomeView.id = 'chat-welcome-view';
    welcomeView.innerHTML = `
        <div class="welcome-icon">🤖</div>
        <h3>GitHub Copilot</h3>
        <p class="welcome-subtitle">我是您的AI编程助手，可以帮您分析文档内容、回答问题</p>
        <div class="welcome-actions">
            <div class="welcome-tip">💡 选择文档中的文本即可快速提问</div>
        </div>
    `;
    return welcomeView;
}

function addChatTurn(userMessage) {
    const turnElement = document.createElement('div');
    turnElement.className = 'chat-turn';

    // User Prompt
    const promptHtml = `
        <div class="prompt-message">
            <div class="message-header">
                <div class="avatar-icon user-icon">👤</div>
                <span class="author-name">You</span>
            </div>
            <div class="message-body"><p>${escapeHtml(userMessage)}</p></div>
        </div>
    `;

    // Bot Response Shell
    const responseHtml = `
        <div class="response-message">
            <div class="message-header">
                <div class="avatar-icon bot-icon">🤖</div>
                <span class="author-name">GitHub Copilot</span>
            </div>
            <div class="message-body"></div>
        </div>
    `;

    turnElement.innerHTML = promptHtml + responseHtml;
    chatMessages.appendChild(turnElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Return the element where the bot's response will be streamed
    return turnElement.querySelector('.response-message .message-body');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function streamResponse(targetElement, fullMessage) {
    targetElement.classList.add('streaming');
    let currentText = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < fullMessage.length) {
            currentText += fullMessage[i];
            targetElement.textContent = currentText;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            i++;
        } else {
            targetElement.classList.remove('streaming');
            clearInterval(interval);
            chatSendButton.disabled = false;
        }
    }, 25);
}

// --- Initialize App ---
function initializeApp() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // Ensure welcome view is shown on page load
    if (chatMessages.children.length === 0) {
        chatMessages.appendChild(createWelcomeView());
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

// --- Initial PDF Rendering ---
async function renderPdf(data) {
    pdfViewer.innerHTML = '<p>正在加载 PDF...</p>';
    try {
        const pdf = await pdfjsLib.getDocument(data).promise;
        pdfViewer.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.style.width = `${viewport.width}px`;
            pageContainer.style.height = `${viewport.height}px`;
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            pageContainer.append(canvas, textLayerDiv);
            pdfViewer.appendChild(pageContainer);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({ textContent, container: textLayerDiv, viewport, textDivs: [] });
        }
    } catch (error) {
        console.error('PDF渲染出错:', error);
        pdfViewer.innerHTML = `<p>加载 PDF 出错: ${error.message}</p>`;
    }
}

// --- 设置功能 ---
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            aiApiEndpoint: '',
            aiApiKey: '',
            aiModel: 'gpt-3.5-turbo',
            translateApiEndpoint: '',
            translateApiKey: '',
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
    
    initializeSettingsUI() {
        // 填充设置表单
        document.getElementById('ai-api-endpoint').value = this.settings.aiApiEndpoint;
        document.getElementById('ai-api-key').value = this.settings.aiApiKey;
        document.getElementById('ai-model').value = this.settings.aiModel;
        document.getElementById('translate-api-endpoint').value = this.settings.translateApiEndpoint;
        document.getElementById('translate-api-key').value = this.settings.translateApiKey;
        document.getElementById('translate-target-lang').value = this.settings.translateTargetLang;
        document.getElementById('auto-save-settings').checked = this.settings.autoSaveSettings;
        document.getElementById('enable-selection-translation').checked = this.settings.enableSelectionTranslation;
        document.getElementById('pdf-zoom-level').value = this.settings.pdfZoomLevel;
    }
    
    bindSettingsEvents() {
        const modal = document.getElementById('settings-modal');
        const settingsToggle = document.getElementById('settings-toggle');
        const modalClose = document.getElementById('modal-close');
        const saveButton = document.getElementById('settings-save');
        const resetButton = document.getElementById('settings-reset');
        
        // 打开设置模态框
        settingsToggle.addEventListener('click', () => {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
        
        // 关闭设置模态框
        const closeModal = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
        
        modalClose.addEventListener('click', closeModal);
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeModal();
            }
        });
        
        // 保存设置
        saveButton.addEventListener('click', () => {
            this.collectAndSaveSettings();
            closeModal();
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
        const inputs = modal.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (this.settings.autoSaveSettings) {
                    this.collectAndSaveSettings();
                }
            });
        });
    }
    
    collectAndSaveSettings() {
        this.settings.aiApiEndpoint = document.getElementById('ai-api-endpoint').value.trim();
        this.settings.aiApiKey = document.getElementById('ai-api-key').value.trim();
        this.settings.aiModel = document.getElementById('ai-model').value;
        this.settings.translateApiEndpoint = document.getElementById('translate-api-endpoint').value.trim();
        this.settings.translateApiKey = document.getElementById('translate-api-key').value.trim();
        this.settings.translateTargetLang = document.getElementById('translate-target-lang').value;
        this.settings.autoSaveSettings = document.getElementById('auto-save-settings').checked;
        this.settings.enableSelectionTranslation = document.getElementById('enable-selection-translation').checked;
        this.settings.pdfZoomLevel = parseFloat(document.getElementById('pdf-zoom-level').value);
        
        this.saveSettings();
    }
    
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.initializeSettingsUI();
        this.saveSettings();
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

// 初始化设置管理器
const settingsManager = new SettingsManager();
