import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface PdfDocument {
  doc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
}

export interface PdfPage {
  page: pdfjsLib.PDFPageProxy;
  viewport: pdfjsLib.PageViewport;
}

export class PdfManager {
  private currentDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private currentScale: number = 1.0;
  private readonly MIN_SCALE = 0.25;
  private readonly MAX_SCALE = 4.0;

  async loadDocument(file: File): Promise<PdfDocument> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      this.currentDoc = await loadingTask.promise;
      
      return {
        doc: this.currentDoc,
        numPages: this.currentDoc.numPages
      };
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw new Error('Failed to load PDF document');
    }
  }

  async renderPage(pageNum: number, container: HTMLElement, scale?: number): Promise<PdfPage> {
    if (!this.currentDoc) {
      throw new Error('No document loaded');
    }

    const currentScale = scale || this.currentScale;
    const page = await this.currentDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });

    // 清除容器内容
    container.innerHTML = '';

    // 设置容器尺寸和缩放因子
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    container.style.position = 'relative';
    container.style.setProperty('--scale-factor', currentScale.toString());

    // 创建 canvas 元素
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // 处理高分辨率屏幕
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 设置 canvas 实际大小（考虑设备像素比）
    canvas.width = Math.floor(viewport.width * devicePixelRatio);
    canvas.height = Math.floor(viewport.height * devicePixelRatio);
    
    // 设置 canvas 显示大小
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    
    // 缩放绘图上下文
    context.scale(devicePixelRatio, devicePixelRatio);

    // 创建文本层容器
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';

    // 按照原项目的方式添加元素
    container.appendChild(canvas);
    container.appendChild(textLayerDiv);

    // 渲染页面到 canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // 渲染文本层
    try {
      const textContent = await page.getTextContent();
      (pdfjsLib as any).renderTextLayer({
        textContent,
        container: textLayerDiv,
        viewport,
        textDivs: [],
        enhanceTextSelection: true
      });
    } catch (error) {
      console.warn('Text layer rendering failed:', error);
      // 文本层渲染失败不影响整体功能
    }

    return {
      page,
      viewport
    };
  }

  setScale(scale: number): void {
    this.currentScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, scale));
  }

  getScale(): number {
    return this.currentScale;
  }

  getMinScale(): number {
    return this.MIN_SCALE;
  }

  getMaxScale(): number {
    return this.MAX_SCALE;
  }

  async getTextContent(pageNum: number): Promise<string> {
    if (!this.currentDoc) {
      throw new Error('No document loaded');
    }

    const page = await this.currentDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    return textContent.items
      .map((item: any) => item.str)
      .join(' ');
  }

  destroy(): void {
    if (this.currentDoc) {
      this.currentDoc.destroy();
      this.currentDoc = null;
    }
  }
}
