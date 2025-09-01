pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
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
    const translationOutput = document.getElementById('translation-output');
    const autoTranslateToggle = document.getElementById('auto-translate-toggle');
    const translationStatus = document.getElementById('translation-status');

    // Chat Panel Elements
    const chatModelTitle = document.getElementById('chat-model-title');
    const chatWelcomeView = document.getElementById('chat-welcome-view');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send');
    const newChatButton = document.getElementById('new-chat-btn');

    // --- Theme Switching ---
    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
            if (themeIconLight) themeIconLight.style.display = 'block';
            if (themeIconDark) themeIconDark.style.display = 'none';
        } else {
            document.body.classList.remove('light-mode');
            if (themeIconLight) themeIconLight.style.display = 'none';
            if (themeIconDark) themeIconDark.style.display = 'block';
        }
    }

    // 初始化主题
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- Sidebar & Tabs Logic ---
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                sidebarToggle.classList.toggle('collapsed');
                sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '»' : '«';
            }
        });
    }

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            button.classList.add('active');
            const targetPanel = document.getElementById(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // --- PDF & Selection Logic ---
    // 初始化 Tauri 增强器
    let tauriEnhancer;
    if (typeof TauriEnhancer !== 'undefined') {
        tauriEnhancer = new TauriEnhancer();
    }

    // 文件输入处理
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || file.type !== 'application/pdf') return;
            
            const reader = new FileReader();
            reader.onload = (event) => renderPdf(event.target.result);
            reader.readAsArrayBuffer(file);
        });
    }

    // 添加 Tauri 文件对话框支持
    const fileLabel = document.querySelector('label[for="file-input"]');
    if (fileLabel) {
        fileLabel.addEventListener('click', async (e) => {
            // 只有在真正的 Tauri 环境中才使用原生文件对话框
            if (tauriEnhancer && tauriEnhancer.isInTauri() && tauriEnhancer.dialog) {
                e.preventDefault(); // 阻止默认的文件输入行为
                
                const filePath = await tauriEnhancer.openPDFDialog();
                if (filePath) {
                    const fileData = await tauriEnhancer.readFile(filePath);
                    if (fileData) {
                        renderPdf(fileData.buffer);
                    }
                }
            }
            // 在浏览器环境中，让默认的文件输入正常工作
        });
    }

    // PDF viewing and text selection
    if (pdfViewer) {
        pdfViewer.addEventListener('mouseup', () => {
            const selection = window.getSelection().toString().trim();
            if (!selection) return;

            // Update the original text panel
            if (selectedTextContainer) {
                selectedTextContainer.textContent = selection;
            }

            // Check for auto-translate
            const isAutoTranslateOn = autoTranslateToggle && autoTranslateToggle.checked;
            const isSidebarOpen = sidebar && !sidebar.classList.contains('collapsed');

            if (isAutoTranslateOn && isSidebarOpen) {
                // Ensure the translate tab is active
                const translateTabButton = document.querySelector('.tab-button[data-tab="translate-panel"]');
                if (translateTabButton) {
                    translateTabButton.click();
                }
                handleTranslate(selection);
            }
        });
    }

    // PDF rendering function (simplified)
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
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    await page.render(renderContext).promise;
                    
                    const pageDiv = document.createElement('div');
                    pageDiv.className = 'pdf-page';
                    pageDiv.appendChild(canvas);
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

    // Translation function placeholder
    async function handleTranslate(text) {
        if (translationOutput) {
            translationOutput.textContent = '翻译中...';
            // Add actual translation logic here
            setTimeout(() => {
                translationOutput.textContent = `翻译: ${text}`;
            }, 1000);
        }
    }

    console.log('App initialized successfully');
}
