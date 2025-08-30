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
    updateSidebarTogglePosition();
});

// --- 侧边栏宽度调整功能 ---
class SidebarResizer {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.resizer = document.getElementById('sidebar-resizer');
        this.isResizing = false;
        this.minWidth = 300;
        this.maxWidth = 800;
        this.defaultWidth = 450;
        
        this.initializeResizer();
        this.loadSidebarWidth();
    }
    
    initializeResizer() {
        this.resizer.addEventListener('mousedown', this.startResize.bind(this));
        document.addEventListener('mousemove', this.resize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
        
        // 防止拖拽时选中文本
        this.resizer.addEventListener('selectstart', (e) => e.preventDefault());
    }
    
    startResize(e) {
        this.isResizing = true;
        this.resizer.classList.add('resizing');
        document.body.classList.add('resizing-sidebar');
        e.preventDefault();
    }
    
    resize(e) {
        if (!this.isResizing) return;
        
        const containerRect = document.getElementById('main-content').getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;
        
        // 限制宽度在最小值和最大值之间
        const clampedWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
        
        this.setSidebarWidth(clampedWidth);
        e.preventDefault();
    }
    
    stopResize() {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        this.resizer.classList.remove('resizing');
        document.body.classList.remove('resizing-sidebar');
        
        // 保存宽度设置
        this.saveSidebarWidth();
    }
    
    setSidebarWidth(width) {
        this.sidebar.style.width = `${width}px`;
        this.updateSidebarTogglePosition(width);
    }
    
    updateSidebarTogglePosition(width) {
        if (!width) {
            const currentWidth = this.sidebar.offsetWidth;
            width = currentWidth || this.defaultWidth;
        }
        
        if (!this.sidebar.classList.contains('collapsed')) {
            this.sidebarToggle.style.right = `${width}px`;
        } else {
            this.sidebarToggle.style.right = '0px';
        }
    }
    
    saveSidebarWidth() {
        const width = this.sidebar.offsetWidth;
        // 将侧边栏宽度保存到配置系统中
        this.saveToConfig('sidebarWidth', width);
    }
    
    loadSidebarWidth() {
        const savedWidth = this.loadFromConfig('sidebarWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth, 10);
            if (width >= this.minWidth && width <= this.maxWidth) {
                this.setSidebarWidth(width);
                return;
            }
        }
        // 如果没有保存的宽度或宽度无效，使用默认宽度
        this.setSidebarWidth(this.defaultWidth);
    }
    
    // 保存配置到统一的配置系统
    saveToConfig(key, value) {
        try {
            let config = JSON.parse(localStorage.getItem('pdfReaderSettings') || '{}');
            config[key] = value;
            localStorage.setItem('pdfReaderSettings', JSON.stringify(config));
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }
    
    // 从统一的配置系统加载配置
    loadFromConfig(key) {
        try {
            const config = JSON.parse(localStorage.getItem('pdfReaderSettings') || '{}');
            return config[key];
        } catch (error) {
            console.error('加载配置失败:', error);
            return null;
        }
    }
}

// 更新侧边栏切换按钮位置的全局函数
function updateSidebarTogglePosition() {
    if (window.sidebarResizer) {
        window.sidebarResizer.updateSidebarTogglePosition();
    }
}

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
        // 不再自动切换到聊天标签页，保持当前侧边栏状态
        // 如果当前在聊天标签页，则聚焦输入框
        const chatTabButton = document.querySelector('.tab-button[data-tab="chat-panel"]');
        if (chatTabButton && chatTabButton.classList.contains('active')) {
            chatInput.focus();
            chatInput.style.height = 'auto';
            chatInput.style.height = `${chatInput.scrollHeight}px`;
        }
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
    
    // Initialize translate target language
    initializeTranslateTargetLang();

    // Ensure welcome view is shown on page load
    if (chatMessages.children.length === 0) {
        chatMessages.appendChild(createWelcomeView());
    }
}

// --- Translation Target Language ---
function initializeTranslateTargetLang() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('pdfReaderSettings') || '{}');
        const targetLang = savedSettings.translateTargetLang || 'zh';
        
        const translateTargetSelect = document.getElementById('translate-target-lang');
        if (translateTargetSelect) {
            translateTargetSelect.value = targetLang;
            
            // 添加事件监听器
            translateTargetSelect.addEventListener('change', (e) => {
                saveTranslateTargetLang(e.target.value);
            });
        }
    } catch (error) {
        console.error('初始化翻译目标语言失败:', error);
    }
}

function saveTranslateTargetLang(targetLang) {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('pdfReaderSettings') || '{}');
        savedSettings.translateTargetLang = targetLang;
        localStorage.setItem('pdfReaderSettings', JSON.stringify(savedSettings));
    } catch (error) {
        console.error('保存翻译目标语言失败:', error);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

// 初始化侧边栏调整器
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarResizer = new SidebarResizer();
});

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
