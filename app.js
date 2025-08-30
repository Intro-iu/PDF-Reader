// 设置 PDF.js worker 的路径
// 这是必需的，用于在后台线程中解析 PDF，避免冻结 UI
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// 获取 DOM 元素
const fileInput = document.getElementById('file-input');
const pdfViewer = document.getElementById('pdf-viewer');
const selectedTextContainer = document.getElementById('selected-text');

// 监听文件选择事件
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        pdfViewer.innerHTML = '<p>请选择一个有效的 PDF 文件。</p>';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        renderPdf(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
});

// 渲染 PDF 的核心函数
async function renderPdf(data) {
    // 清空上一次的内容并显示加载提示
    pdfViewer.innerHTML = '<p>正在加载 PDF...</p>';
    selectedTextContainer.textContent = '在这里显示划选的文本';

    try {
        const pdf = await pdfjsLib.getDocument(data).promise;
        pdfViewer.innerHTML = ''; // 清空加载提示

        // 遍历所有页面并渲染
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            // 创建用于容纳 canvas 和 textLayer 的容器
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page-container';
            pageContainer.style.width = `${viewport.width}px`;
            pageContainer.style.height = `${viewport.height}px`;

            // 创建 canvas 用于渲染页面
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // 创建用于渲染文本层以便选择的 div
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';

            // 将元素添加到 DOM
            pageContainer.appendChild(canvas);
            pageContainer.appendChild(textLayerDiv);
            pdfViewer.appendChild(pageContainer);

            // 渲染页面内容到 canvas
            await page.render({ canvasContext: context, viewport }).promise;

            // 渲染文本层
            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });
        }
    } catch (error) {
        console.error('加载或渲染 PDF 时出错:', error);
        pdfViewer.innerHTML = `<p>加载 PDF 出错: ${error.message}</p>`;
    }
}

// 监听鼠标抬起事件来捕获选中的文本
pdfViewer.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
        selectedTextContainer.textContent = selection;
    }
});
