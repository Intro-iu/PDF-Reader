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

// --- PDF缩放控制器 ---
let zoomSlider, zoomCurrentLabel, zoomControl, zoomResetBtn;
let currentPdfData = null;
let currentScale = 1.0;
let isRendering = false; // 防止并发渲染
let pendingRenderScale = null; // 待渲染的缩放比例
let currentPdf = null; // 保存PDF文档对象
let renderingQueue = []; // 渲染队列
let progressiveRenderQueue = []; // 渐进式渲染队列
let isProgressiveRendering = false; // 渐进式渲染状态
let renderTimeout = null; // 渲染延迟计时器

// 初始化缩放控制器
function initializeZoomControl() {
    zoomSlider = document.getElementById('pdf-zoom-slider');
    zoomCurrentLabel = document.querySelector('.zoom-current');
    zoomControl = document.querySelector('.pdf-zoom-control');
    zoomResetBtn = document.getElementById('zoom-reset-btn');
    
    if (!zoomSlider || !zoomCurrentLabel || !zoomControl || !zoomResetBtn) {
        console.error('缩放控制器元素未找到');
        return;
    }
    
    // 确保重置按钮可见
    zoomResetBtn.style.display = 'flex';
    
    // 缩放滑条事件
    zoomSlider.addEventListener('input', (e) => {
        const zoomValue = parseInt(e.target.value);
        const newScale = zoomValue / 100; // 转换为比例值
        
        // 立即更新UI显示
        zoomCurrentLabel.textContent = `${zoomValue}%`;
        
        // 队列渲染请求
        queueRender(newScale);
    });

    // 重置缩放按钮
    zoomResetBtn.addEventListener('click', () => {
        zoomSlider.value = 100;
        zoomCurrentLabel.textContent = '100%';
        
        // 立即渲染重置
        queueRender(1.0);
    });

    // 鼠标滚轮缩放（在PDF区域内）
    pdfViewer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) { // Ctrl+滚轮 或 Cmd+滚轮
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? -5 : 5; // 滚轮向下减少，向上增加

            // 从滑块读取限制，确保逻辑统一
            const minZoom = parseInt(zoomSlider.min);
            const maxZoom = parseInt(zoomSlider.max);
            const currentZoom = parseInt(zoomSlider.value);
            
            const newValue = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
            const newScale = newValue / 100;
            
            // 立即更新UI
            zoomSlider.value = newValue;
            zoomCurrentLabel.textContent = `${newValue}%`;
            
            // 队列渲染请求
            queueRender(newScale);
        }
    });

    // 在pdfViewer滚动时触发懒加载渲染
    pdfViewer.addEventListener('scroll', throttle(() => {
        if (currentPdf && !isRendering) {
            renderVisiblePages();
        }
    }, 200)); // 增加节流时间，减少触发频率
}

// 工具函数：节流
function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
        const currentTime = Date.now();
        
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

// 智能渲染队列管理
function queueRender(scale) {
    currentScale = scale;
    
    // 清空之前的渲染请求
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    
    // 立即应用CSS预览缩放
    applyInstantZoom(scale);
    
    // 延迟实际渲染，避免频繁缩放时的性能问题
    renderTimeout = setTimeout(() => {
        handleScaleChange(scale);
    }, 300);
}

// 处理缩放变化
async function handleScaleChange(scale) {
    if (!currentPdf || !currentPdfData) return;
    
    console.log(`缩放变化: ${scale}, 更新页面尺寸`);
    
    // 清除CSS预览效果
    clearInstantZoom();
    
    // 更新所有页面容器的尺寸，但不重新渲染内容
    const pageContainers = Array.from(pdfViewer.querySelectorAll('.pdf-page-container'));
    
    for (const container of pageContainers) {
        const pageNum = parseInt(container.dataset.pageNum);
        const page = await currentPdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // 更新容器尺寸
        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;
        
        // 如果页面已经渲染过，需要清除内容重新渲染
        if (container.dataset.rendered === 'true') {
            container.dataset.rendered = 'false';
            
            // 清除现有内容，恢复占位符
            container.innerHTML = `
                <div class="page-placeholder">
                    <div class="placeholder-content">
                        <div class="placeholder-icon">📄</div>
                        <div class="placeholder-text">第 ${pageNum} 页</div>
                        <div class="placeholder-subtext">缩放后重新加载</div>
                    </div>
                </div>
            `;
        }
    }
    
    // 重新渲染可见页面
    setTimeout(() => {
        renderVisiblePages();
    }, 100);
}

// 立即应用CSS缩放预览
function applyInstantZoom(scale) {
    const pageContainers = pdfViewer.querySelectorAll('.pdf-page-container');
    if (pageContainers.length === 0) return;
    
    // 计算当前显示比例与目标比例的差异
    const currentDisplayScale = currentScale || 1.0;
    const cssScale = scale / currentDisplayScale;
    
    pageContainers.forEach(container => {
        container.style.transform = `scale(${cssScale})`;
        container.style.transformOrigin = 'center top';
        container.style.transition = 'transform 0.1s ease-out';
    });
}

// 清除CSS缩放预览效果
function clearInstantZoom() {
    const pageContainers = pdfViewer.querySelectorAll('.pdf-page-container');
    pageContainers.forEach(container => {
        container.style.transform = '';
        container.style.transformOrigin = '';
        container.style.transition = '';
    });
}

// 检查元素是否在视窗内或接近视窗
function isElementInViewport(element, threshold = 200) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    return (
        rect.top < viewportHeight + threshold &&
        rect.bottom > -threshold
    );
}

// 获取页面渲染优先级（距离视窗中心越近优先级越高）
function getPagePriority(element) {
    const rect = element.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const elementCenter = rect.top + rect.height / 2;
    const distance = Math.abs(viewportCenter - elementCenter);
    return -distance; // 负数表示距离，距离越小优先级越高
}

// 渐进式渲染页面
async function renderPageProgressively(pageContainer, pageNum, scale) {
    try {
        const page = await currentPdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // 找到对应的canvas和文本层
        const canvas = pageContainer.querySelector('canvas');
        const textLayerDiv = pageContainer.querySelector('.textLayer');
        
        if (!canvas || !textLayerDiv) return;
        
        // 更新canvas尺寸
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // 更新容器尺寸
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        
        // 渲染页面内容
        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport
        }).promise;
        
        // 清空并重新渲染文本层
        textLayerDiv.innerHTML = '';
        const textContent = await page.getTextContent();
        pdfjsLib.renderTextLayer({
            textContent,
            container: textLayerDiv,
            viewport,
            textDivs: []
        });
        
        // 标记为已渲染
        pageContainer.dataset.rendered = 'true';
        pageContainer.dataset.scale = scale.toString();
        
    } catch (error) {
        console.error(`渲染第${pageNum}页时出错:`, error);
    }
}

// 处理渐进式渲染队列
async function processProgressiveRenderQueue() {
    if (isProgressiveRendering || renderingQueue.length === 0) {
        return;
    }
    
    isProgressiveRendering = true;
    
    while (renderingQueue.length > 0) {
        const { pageContainer, pageNum, scale } = renderingQueue.shift();
        
        // 如果页面已经以当前比例渲染过，跳过
        if (pageContainer.dataset.rendered === 'true' && 
            parseFloat(pageContainer.dataset.scale || '0') === scale) {
            continue;
        }
        
        await renderPageProgressively(pageContainer, pageNum, scale);
        
        // 每渲染一页后短暂休息，避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    isProgressiveRendering = false;
}

// 添加页面到渲染队列
function queuePageRender(pageContainer, pageNum, scale, priority = 0) {
    // 移除已存在的同一页面请求
    renderingQueue = renderingQueue.filter(item => item.pageNum !== pageNum);
    
    // 添加新请求
    renderingQueue.push({ pageContainer, pageNum, scale, priority });
    
    // 按优先级排序（优先级高的先渲染）
    renderingQueue.sort((a, b) => b.priority - a.priority);
    
    // 开始处理队列
    processProgressiveRenderQueue();
}

async function processRenderQueue() {
    if (isRendering || !pendingRenderScale || !currentPdfData) {
        return;
    }
    
    const scaleToRender = pendingRenderScale;
    pendingRenderScale = null;
    
    await renderPdfWithScale(currentPdfData, scaleToRender);
    
    // 如果在渲染过程中有新的缩放请求，继续处理
    if (pendingRenderScale && pendingRenderScale !== scaleToRender) {
        setTimeout(() => processRenderQueue(), 50);
    }
}

// 显示/隐藏缩放控制器
function toggleZoomControl(show) {
    if (zoomControl) {
        if (show) {
            zoomControl.style.display = 'flex';
        } else {
            zoomControl.style.display = 'none';
        }
    }
}

pdfViewer.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
        selectedTextContainer.textContent = selection;
        chatInput.value = `请帮我分析这段内容:"${selection}"`;
    }
});

// --- 右键菜单功能 ---
const contextMenu = document.getElementById('context-menu');
let currentSelectedText = '';

// 监听PDF区域的右键事件
pdfViewer.addEventListener('contextmenu', (e) => {
    const selection = window.getSelection().toString().trim();
    
    // 只有选中文本时才显示菜单
    if (selection) {
        e.preventDefault(); // 阻止默认右键菜单
        currentSelectedText = selection;
        
        // 显示自定义右键菜单
        showContextMenu(e.clientX, e.clientY);
    }
});

// 显示右键菜单
function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    
    // 确保菜单不超出屏幕边界
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${y - rect.height}px`;
    }
}

// 隐藏右键菜单
function hideContextMenu() {
    contextMenu.style.display = 'none';
}

// 点击页面其他地方隐藏菜单
document.addEventListener('click', hideContextMenu);

// 处理右键菜单项点击
contextMenu.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    
    const action = e.target.closest('.context-menu-item')?.dataset.action;
    if (!action) return;
    
    // 先保存当前选中文本，避免DOM操作导致选区丢失
    const savedSelection = currentSelectedText;
    
    switch (action) {
        case 'translate':
            // 优先确保侧边栏打开，避免布局变化影响选区
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                sidebarToggle.classList.remove('collapsed');
                updateSidebarTogglePosition();
            }
            // 切换到翻译标签页并填充选中文本
            selectedTextContainer.textContent = savedSelection;
            document.querySelector('.tab-button[data-tab="translate-panel"]').click();
            break;
            
        case 'chat':
            // 优先确保侧边栏打开，避免布局变化影响选区
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                sidebarToggle.classList.remove('collapsed');
                updateSidebarTogglePosition();
            }
            // 切换到AI对话标签页并填充选中文本
            chatInput.value = `请帮我分析这段内容:"${savedSelection}"`;
            document.querySelector('.tab-button[data-tab="chat-panel"]').click();
            // 延迟聚焦输入框，避免布局变化时的冲突
            setTimeout(() => {
                chatInput.focus();
                chatInput.style.height = 'auto';
                chatInput.style.height = `${chatInput.scrollHeight}px`;
            }, 100);
            break;
            
        case 'copy':
            // 复制选中文本到剪贴板
            navigator.clipboard.writeText(savedSelection).then(() => {
                // 可以添加一个简单的提示
                console.log('文本已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
            });
            break;
    }
    
    hideContextMenu();
});

// --- Settings Logic for Main Page ---
function getSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('pdfReaderSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('从 localStorage 加载设置失败:', error);
    }
    return null;
}

// --- VSC Copilot-style Chat Logic ---
async function handleUserChat() {
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

    try {
        const settings = getSettingsFromLocalStorage();
        if (!settings) {
            throw new Error('无法加载应用设置。请先访问设置页面进行配置。');
        }

        const activeModelId = settings.activeChatModel;
        if (!activeModelId) {
            throw new Error('请先在设置中选择一个有效的AI对话模型。');
        }

        const activeModel = settings.aiModels?.find(m => m.id === activeModelId);

        if (!activeModel || !activeModel.apiKey || !activeModel.apiEndpoint) {
            throw new Error('选择的AI模型配置不完整或无效。请检查设置。');
        }

        const response = await fetch(activeModel.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${activeModel.apiKey}`
            },
            body: JSON.stringify({
                model: activeModel.modelId,
                messages: [{ role: 'user', content: userMessage }],
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`API 请求失败 (${response.status}): ${errorData.error?.message || '未知错误'}`);
            } catch (e) {
                 throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
            }
        }

        const data = await response.json();
        const botResponse = data.choices[0]?.message?.content?.trim();

        if (!botResponse) {
            throw new Error('API返回了空消息或无效格式。');
        }

        hideTypingIndicator(responseBody);
        streamResponse(responseBody, botResponse);

    } catch (error) {
        console.error('AI 对话失败:', error);
        hideTypingIndicator(responseBody);
        const errorMessage = `抱歉，出错了: ${error.message}`;
        responseBody.innerHTML = `<p class="error-message" style="color: #ef4444;">${escapeHtml(errorMessage)}</p>`;
        chatSendButton.disabled = false;
    }
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
    
    // Load selection color settings
    loadSelectionColorSettings();
    
    // Initialize translate target language
    initializeTranslateTargetLang();

    // Ensure welcome view is shown on page load
    if (chatMessages.children.length === 0) {
        chatMessages.appendChild(createWelcomeView());
    }
}

// 加载文本选择颜色设置
function loadSelectionColorSettings() {
    try {
        // 从localStorage读取设置（临时方案）
        const savedSettings = localStorage.getItem('pdfReaderSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.textSelectionColor) {
                document.documentElement.style.setProperty('--text-selection-color', settings.textSelectionColor);
            }
            if (settings.selectionOpacity !== undefined) {
                const opacityValue = settings.selectionOpacity / 100;
                document.documentElement.style.setProperty('--text-selection-opacity', opacityValue);
            }
        }
    } catch (error) {
        console.warn('加载选择颜色设置失败:', error);
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

// 初始化侧边栏调整器和缩放控制器
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarResizer = new SidebarResizer();
    initializeZoomControl(); // 初始化缩放控制器
});

// --- Initial PDF Rendering ---
async function renderPdf(data) {
    currentPdfData = data; // 保存PDF数据用于缩放
    toggleZoomControl(true); // 显示缩放控制器

    try {
        // 加载文档以计算尺寸
        currentPdf = await pdfjsLib.getDocument(data).promise;
        const page = await currentPdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // 计算适应宽度的缩放比例（减去一点边距给滚动条）
        const containerWidth = pdfViewer.clientWidth;
        const fitToWidthScale = (containerWidth - 20) / viewport.width;
        
        currentScale = fitToWidthScale;

        // 更新缩放UI
        if (zoomSlider && zoomCurrentLabel) {
            const zoomPercentage = Math.round(currentScale * 100);
            // 确保缩放比例在允许范围内
            const minZoom = parseInt(zoomSlider.min);
            const maxZoom = parseInt(zoomSlider.max);
            const clampedPercentage = Math.max(minZoom, Math.min(maxZoom, zoomPercentage));
            
            zoomSlider.value = clampedPercentage;
            zoomCurrentLabel.textContent = `${clampedPercentage}%`;
            currentScale = clampedPercentage / 100; // Use the clamped scale
        }
        
        await renderPdfWithScale(data, currentScale);

    } catch (error) {
        console.error('PDF 自动缩放及渲染出错:', error);
        pdfViewer.innerHTML = `<p>加载 PDF 出错: ${error.message}</p>`;
        toggleZoomControl(false);
    }
}

// 创建单个页面占位符的辅助函数
async function createPageContainer(pageNum, scale) {
    const page = await currentPdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const pageContainer = document.createElement('div');
    pageContainer.className = 'pdf-page-container';
    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;
    pageContainer.dataset.pageNum = pageNum.toString();
    pageContainer.dataset.rendered = 'false';

    const placeholder = document.createElement('div');
    placeholder.className = 'page-placeholder';
    placeholder.innerHTML = `
        <div class="page-placeholder">
            <div class="placeholder-content">
                <div class="placeholder-icon">📄</div>
                <div class="placeholder-text">第 ${pageNum} 页</div>
                <div class="placeholder-subtext">滚动到此处加载</div>
            </div>
        </div>
    `;

    pageContainer.appendChild(placeholder);
    return pageContainer;
}

async function renderPdfWithScale(data, scale) {
    if (isRendering) {
        console.log('正在渲染中，跳过此次请求');
        return;
    }
    isRendering = true;
    
    // 清除CSS缩放预览效果
    clearInstantZoom();
    
    pdfViewer.innerHTML = '<p>正在加载 PDF...</p>';

    try {
        // 如果PDF文档对象不存在或数据改变，则重新加载
        if (!currentPdf || currentPdfData !== data) {
            currentPdf = await pdfjsLib.getDocument(data).promise;
            currentPdfData = data;
        }
        
        pdfViewer.innerHTML = ''; // 清空容器
        const numPages = currentPdf.numPages;
        console.log(`开始优化渲染: ${numPages}页, 缩放比例: ${scale}`);

        // --- 优化：快速首屏渲染 ---

        // 1. 立即创建并渲染第一页
        if (numPages > 0) {
            const firstPageContainer = await createPageContainer(1, scale);
            pdfViewer.appendChild(firstPageContainer);
            await renderSinglePage(firstPageContainer); // 直接调用单页渲染
        }

        // 2. 异步创建剩余页面的占位符
        if (numPages > 1) {
            setTimeout(async () => {
                const fragment = document.createDocumentFragment();
                for (let i = 2; i <= numPages; i++) {
                    const pageContainer = await createPageContainer(i, scale);
                    fragment.appendChild(pageContainer);
                }
                pdfViewer.appendChild(fragment);
                console.log('剩余页面占位符创建完成');
            }, 150); // 延迟以确保首屏渲染流畅
        }
        
        // -------------------------

        toggleZoomControl(true);
        
    } catch (error) {
        console.error('PDF渲染出错:', error);
        pdfViewer.innerHTML = `<p>加载 PDF 出错: ${error.message}</p>`;
        toggleZoomControl(false);
    } finally {
        isRendering = false;
    }
}

// 渲染当前可见区域的页面
async function renderVisiblePages() {
    const pageContainers = Array.from(pdfViewer.querySelectorAll('.pdf-page-container'));
    const visibleContainers = [];
    
    // 找出可见或接近可见的页面
    pageContainers.forEach(container => {
        if (isElementInViewport(container, 800) && container.dataset.rendered === 'false') {
            visibleContainers.push(container);
        }
    });
    
    if (visibleContainers.length > 0) {
        console.log(`发现 ${visibleContainers.length} 个页面需要渲染`);
    }
    
    // 批量渲染可见页面（每次最多3页，避免卡顿）
    const batchSize = 3;
    for (let i = 0; i < visibleContainers.length; i += batchSize) {
        const batch = visibleContainers.slice(i, i + batchSize);
        await Promise.all(batch.map(container => renderSinglePage(container)));
        
        // 给UI一些时间更新
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

// 渲染单个页面
async function renderSinglePage(pageContainer) {
    const pageNum = parseInt(pageContainer.dataset.pageNum);
    
    if (pageContainer.dataset.rendered === 'true') {
        return; // 已经渲染过了
    }
    
    try {
        const page = await currentPdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale });
        
        // 更新容器尺寸（可能因为缩放改变了）
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        
        // 移除占位符
        const placeholder = pageContainer.querySelector('.page-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        // 创建canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // 创建文本层
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        
        // 添加到容器
        pageContainer.append(canvas, textLayerDiv);
        
        // 渲染页面内容
        await page.render({
            canvasContext: canvas.getContext('2d'), 
            viewport 
        }).promise;
        
        // 渲染文本层
        try {
            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({
                textContent,
                container: textLayerDiv,
                viewport,
                textDivs: []
            });
        } catch (textError) {
            console.warn(`页面 ${pageNum} 文本层渲染失败:`, textError);
        }
        
        // 标记为已渲染
        pageContainer.dataset.rendered = 'true';
        pageContainer.classList.add('rendered');
        
        console.log(`页面 ${pageNum} 渲染完成`);
        
    } catch (error) {
        console.error(`页面 ${pageNum} 渲染失败:`, error);
        
        // 显示错误信息
        pageContainer.innerHTML = `
            <div class="page-error">
                <div>⚠️ 页面 ${pageNum} 加载失败</div>
                <div style="font-size: 12px; color: #666;">点击重试</div>
            </div>
        `;
        
        // 添加重试功能
        pageContainer.addEventListener('click', () => {
            pageContainer.dataset.rendered = 'false';
            renderSinglePage(pageContainer);
        }, { once: true });
    }
}

// 创建所有页面的容器结构
async function createAllPageContainers(scale) {
    pdfViewer.innerHTML = '<p>正在初始化页面...</p>';
    
    const numPages = currentPdf.numPages;
    const containers = [];
    
    // 快速创建所有页面容器
    for (let i = 1; i <= numPages; i++) {
        const page = await currentPdf.getPage(i);
        const viewport = page.getViewport({ scale });
        
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container';
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
        pageContainer.dataset.pageNum = i.toString();
        pageContainer.dataset.rendered = 'false';
        
        // 创建canvas占位
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // 创建文本层占位
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        
        // 添加加载提示
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'page-loading-overlay';
        loadingOverlay.innerHTML = `<p>第 ${i} 页</p>`;
        
        pageContainer.append(canvas, textLayerDiv, loadingOverlay);
        containers.push(pageContainer);
    }
    
    // 清空并一次性添加所有容器
    pdfViewer.innerHTML = '';
    containers.forEach(container => pdfViewer.appendChild(container));
}