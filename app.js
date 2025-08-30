pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- DOM Elements ---
const fileInput = document.getElementById('file-input');
const pdfViewer = document.getElementById('pdf-viewer');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const tabsContainer = document.querySelector('.sidebar-tabs');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

// Translate Panel Elements
const selectedTextContainer = document.getElementById('selected-text');

// Chat Panel Elements
const chatWelcomeView = document.getElementById('chat-welcome-view');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send');

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
        chatInput.value = `关于这段内容："${selection}"，请...`;
        document.querySelector('.tab-button[data-tab="chat-panel"]').click();
        chatInput.focus();
    }
});

// --- VSC-style Chat Logic ---
function handleUserChat() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    if (chatWelcomeView) {
        chatWelcomeView.style.display = 'none';
    }

    const responseBody = addChatTurn(userMessage);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSendButton.disabled = true;

    setTimeout(() => {
        const botResponse = '这是一个模拟VS Code Gemini插件风格的AI回复。注意，用户和AI的对话现在是垂直排列的，更像一个结构化的日志。';
        streamResponse(responseBody, botResponse);
    }, 500);
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

function addChatTurn(userMessage) {
    const turnElement = document.createElement('div');
    turnElement.className = 'chat-turn';

    // User Prompt
    const promptHtml = `
        <div class="prompt-message">
            <div class="message-header">
                <div class="avatar-icon user-icon">U</div>
                <span class="author-name">You</span>
            </div>
            <div class="message-body"><p>${userMessage}</p></div>
        </div>
    `;

    // Bot Response Shell
    const responseHtml = `
        <div class="response-message">
            <div class="message-header">
                <div class="avatar-icon bot-icon">G</div>
                <span class="author-name">Gemini</span>
            </div>
            <div class="message-body"></div>
        </div>
    `;

    turnElement.innerHTML = promptHtml + responseHtml;
    chatMessages.appendChild(turnElement);
    
    // Return the element where the bot's response will be streamed
    return turnElement.querySelector('.response-message .message-body');
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
