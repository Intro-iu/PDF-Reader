pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // --- DOM Elements ---
    const fileInput = document.getElementById('file-input');
    const openButton = document.getElementById('open-pdf');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const themeToggle = document.getElementById('theme-toggle');
    const pdfViewer = document.getElementById('pdf-viewer');
    
    // Navigation Elements
    const tabsContainer = document.querySelector('.sidebar-tabs');
    const tabContents = document.querySelectorAll('.tab-panel');
    
    // Text Selection Panel Elements
    const selectedTextPanel = document.getElementById('text-selection-panel');
    const translationPanel = document.getElementById('translation-panel');
    const selectedTextContainer = document.getElementById('selected-text');
    const translationOutput = document.getElementById('translation-output');
    const translateButton = document.getElementById('translate-button');
    
    // Chat Panel Elements
    const chatModelTitle = document.getElementById('chat-model-title');
    const chatWelcomeView = document.getElementById('chat-welcome-view');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send');
    const newChatButton = document.getElementById('new-chat-btn');

    // === Event Listeners ===

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-mode');
            const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            localStorage.setItem('pdfReaderTheme', currentTheme);
        });
    }

    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '»' : '«';
            }
        });
    }

    // Tab switching
    if (tabsContainer) {
        tabsContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-button')) {
                const targetTab = e.target.dataset.tab;
                
                // Update active tab
                tabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // Show corresponding content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab) {
                        content.classList.add('active');
                    }
                });
            }
        });
    }

    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = (event) => renderPdf(event.target.result);
                reader.readAsArrayBuffer(file);
            }
        });
    }

    // Open PDF button
    if (openButton) {
        openButton.addEventListener('click', async function() {
            if (window.tauriEnhancer) {
                try {
                    const filePath = await tauriEnhancer.openPDFDialog();
                    if (filePath) {
                        const fileData = await tauriEnhancer.readFile(filePath);
                        renderPdf(fileData.buffer);
                    }
                } catch (error) {
                    console.error('打开文件错误:', error);
                    // 如果Tauri方法失败，回退到文件选择器
                    fileInput?.click();
                }
            } else {
                fileInput?.click();
            }
        });
    }

    // Text selection event
    document.addEventListener('mouseup', function() {
        const selection = window.getSelection().toString().trim();
        if (!selection) return;

        if (selectedTextContainer) {
            selectedTextContainer.textContent = selection;
        }

        // Check if auto-translate is enabled
        const autoTranslateCheckbox = document.getElementById('auto-translate-toggle');
        if (autoTranslateCheckbox && autoTranslateCheckbox.checked) {
            handleTranslate(selection);
        }
    });

    // Manual translate button
    if (translateButton) {
        translateButton.addEventListener('click', function() {
            const text = selectedTextContainer ? selectedTextContainer.textContent.trim() : '';
            if (text && text !== '在这里显示划选的文本') {
                // 禁用按钮防止重复点击
                translateButton.disabled = true;
                translateButton.textContent = '翻译中...';
                
                handleTranslate(text).finally(() => {
                    // 恢复按钮状态
                    translateButton.disabled = false;
                    translateButton.textContent = '翻译';
                });
            } else {
                if (translationOutput) {
                    translationOutput.innerHTML = '<div class="placeholder error">请先选择要翻译的文本</div>';
                }
            }
        });
    }

    // Chat functionality
    if (chatSendButton) {
        chatSendButton.addEventListener('click', sendChatMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    if (newChatButton) {
        newChatButton.addEventListener('click', clearChat);
    }

    // === PDF Rendering ===
    let currentPdfDoc = null;

    async function renderPdf(arrayBuffer) {
        try {
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            currentPdfDoc = pdfDoc;
            
            if (pdfViewer) {
                pdfViewer.innerHTML = '';
                
                for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                    const page = await pdfDoc.getPage(pageNum);
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale });
                    
                    // 创建页面容器
                    const pageDiv = document.createElement('div');
                    pageDiv.className = 'pdf-page';
                    pageDiv.style.position = 'relative';
                    pageDiv.style.marginBottom = '20px';
                    
                    // 创建canvas层（图像）
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    await page.render(renderContext).promise;
                    pageDiv.appendChild(canvas);
                    
                    // 创建文本层（用于文本选择）
                    const textLayerDiv = document.createElement('div');
                    textLayerDiv.className = 'textLayer';
                    textLayerDiv.style.position = 'absolute';
                    textLayerDiv.style.left = '0';
                    textLayerDiv.style.top = '0';
                    textLayerDiv.style.right = '0';
                    textLayerDiv.style.bottom = '0';
                    textLayerDiv.style.overflow = 'hidden';
                    textLayerDiv.style.opacity = '0.2';
                    textLayerDiv.style.lineHeight = '1.0';
                    
                    // 获取文本内容并渲染文本层
                    const textContent = await page.getTextContent();
                    
                    // 使用较新的PDF.js API创建文本层
                    if (pdfjsLib.renderTextLayer) {
                        pdfjsLib.renderTextLayer({
                            textContent: textContent,
                            container: textLayerDiv,
                            viewport: viewport,
                            textDivs: []
                        });
                    } else if (pdfjsLib.TextLayerBuilder) {
                        // 兼容旧版本API
                        const textLayer = new pdfjsLib.TextLayerBuilder({
                            textLayerDiv: textLayerDiv,
                            pageIndex: pageNum - 1,
                            viewport: viewport
                        });
                        
                        textLayer.setTextContent(textContent);
                        textLayer.render();
                    } else {
                        // 手动创建简单的文本层
                        textContent.items.forEach((textItem) => {
                            const textDiv = document.createElement('div');
                            textDiv.style.position = 'absolute';
                            textDiv.style.left = textItem.transform[4] + 'px';
                            textDiv.style.top = textItem.transform[5] + 'px';
                            textDiv.style.fontSize = textItem.transform[0] + 'px';
                            textDiv.style.fontFamily = textItem.fontName;
                            textDiv.textContent = textItem.str;
                            textDiv.style.color = 'transparent';
                            textDiv.style.cursor = 'text';
                            textLayerDiv.appendChild(textDiv);
                        });
                    }
                    
                    pageDiv.appendChild(textLayerDiv);
                    pdfViewer.appendChild(pageDiv);
                }
            }
        } catch (error) {
            console.error('PDF渲染失败:', error);
            if (pdfViewer) {
                pdfViewer.innerHTML = '<p>PDF 加载失败，请检查文件格式</p>';
            }
        }
    }

    // === AI Translation Function ===
    async function handleTranslate(text) {
        if (!translationOutput) return;
        
        // 清空之前的内容并显示加载状态
        translationOutput.innerHTML = '<div class="placeholder">翻译中...</div>';
        
        try {
            // 获取设置中的翻译模型配置
            const settings = JSON.parse(localStorage.getItem('pdfReaderSettings') || '{}');
            const activeTranslateModel = settings.activeTranslateModel;
            
            if (!activeTranslateModel || !settings.aiModels) {
                translationOutput.innerHTML = '<div class="placeholder error">请先在设置中配置翻译模型</div>';
                return;
            }
            
            const model = settings.aiModels.find(m => m.id === activeTranslateModel);
            if (!model || !model.supportsTranslation) {
                translationOutput.innerHTML = '<div class="placeholder error">请先配置支持翻译的AI模型</div>';
                return;
            }
            
            if (!model.apiEndpoint || !model.apiKey) {
                translationOutput.innerHTML = '<div class="placeholder error">请先配置API端点和密钥</div>';
                return;
            }
            
            const targetLang = settings.translateTargetLang || 'zh';
            const langNames = {
                'zh': '中文',
                'en': '英文', 
                'ja': '日文',
                'ko': '韩文',
                'fr': '法文',
                'de': '德文',
                'es': '西班牙文'
            };
            
            const systemPrompt = `你是一个专业的翻译助手。请将用户提供的文本翻译成${langNames[targetLang] || targetLang}。只返回翻译结果，不要添加任何解释。`;
            const userPrompt = `请翻译以下文本：\n\n${text}`;
            
            // 清空输出区域，准备流式显示
            translationOutput.innerHTML = '';
            const outputDiv = document.createElement('div');
            outputDiv.className = 'translation-result';
            translationOutput.appendChild(outputDiv);
            
            let fullTranslation = '';
            
            await getOpenAICompletion(
                userPrompt,
                systemPrompt,
                model.apiEndpoint,
                model.apiKey,
                model.modelId,
                (chunk) => {
                    // 流式显示翻译结果
                    fullTranslation += chunk;
                    outputDiv.textContent = fullTranslation;
                    // 滚动到底部
                    translationOutput.scrollTop = translationOutput.scrollHeight;
                },
                (complete) => {
                    // 翻译完成，移除光标动画
                    outputDiv.textContent = complete || fullTranslation || '翻译失败';
                    outputDiv.classList.add('complete');
                }
            );
            
        } catch (error) {
            console.error('翻译错误:', error);
            translationOutput.innerHTML = `<div class="placeholder error">翻译错误: ${error.message}</div>`;
        }
    }

    // === AI Chat Functions ===
    function addChatMessage(content, isUser = false) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user-message' : 'ai-message'}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 隐藏欢迎界面
        if (chatWelcomeView) {
            chatWelcomeView.style.display = 'none';
        }
        
        return messageDiv;
    }
    
    async function sendChatMessage() {
        if (!chatInput || !chatInput.value.trim()) return;
        
        const userMessage = chatInput.value.trim();
        chatInput.value = '';
        
        // 添加用户消息
        addChatMessage(userMessage, true);
        
        // 添加加载消息
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'chat-message ai-message loading';
        loadingMessage.innerHTML = '<div class="message-content">正在思考...</div>';
        chatMessages.appendChild(loadingMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // 获取设置
            const settings = JSON.parse(localStorage.getItem('pdfReaderSettings') || '{}');
            const activeChatModel = settings.activeChatModel;
            
            if (!activeChatModel || !settings.aiModels) {
                throw new Error('请先在设置中配置聊天模型');
            }
            
            const model = settings.aiModels.find(m => m.id === activeChatModel);
            if (!model || !model.supportsChat) {
                throw new Error('请先配置支持对话的AI模型');
            }
            
            if (!model.apiEndpoint || !model.apiKey) {
                throw new Error('请先配置API端点和密钥');
            }
            
            const systemPrompt = settings.chatPrompt || '你是一个有用的AI助手，请根据用户的问题提供准确、有用的回答。';
            
            // 移除加载消息
            loadingMessage.remove();
            
            // 创建AI回复消息容器
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'chat-message ai-message';
            const aiContent = document.createElement('div');
            aiContent.className = 'message-content';
            aiMessageDiv.appendChild(aiContent);
            chatMessages.appendChild(aiMessageDiv);
            
            // 使用流式响应
            let fullResponse = '';
            await getOpenAICompletion(
                userMessage,
                systemPrompt,
                model.apiEndpoint,
                model.apiKey,
                model.modelId,
                (chunk) => {
                    // 流式显示回复
                    fullResponse += chunk;
                    aiContent.textContent = fullResponse;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                },
                (complete) => {
                    // 完成回复，移除光标动画
                    aiContent.textContent = complete || fullResponse;
                    aiMessageDiv.classList.add('complete');
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            );
            
        } catch (error) {
            console.error('聊天错误:', error);
            loadingMessage.innerHTML = `<div class="message-content error">错误: ${error.message}</div>`;
        }
    }
    
    function clearChat() {
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        if (chatWelcomeView) {
            chatWelcomeView.style.display = 'block';
        }
    }

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('pdfReaderTheme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    console.log('App initialized successfully');
}
