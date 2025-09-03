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

export interface TextItem {
  text: string;
  fontSize: number;
  fontName: string;
  bold: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SmartOutlineItem {
  title: string;
  page: number;
  level: number;
  fontSize: number;
  fontWeight: string;
  id: string;
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

  async getPageDimensions(pageNum: number = 1): Promise<{ width: number; height: number }> {
    if (!this.currentDoc) {
      throw new Error('No document loaded');
    }

    const page = await this.currentDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    
    return {
      width: viewport.width,
      height: viewport.height
    };
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

  // 智能目录生成功能
  async generateSmartOutline(maxPages: number = 20): Promise<SmartOutlineItem[]> {
    if (!this.currentDoc) {
      throw new Error('No document loaded');
    }

    console.log('开始智能目录生成...');
    const textItems: TextItem[] = [];
    const totalPages = Math.min(this.currentDoc.numPages, maxPages);

    // 1. 提取所有页面的文本信息
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await this.currentDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        for (const item of textContent.items) {
          const textItem = item as any;
          if (textItem.str && textItem.str.trim()) {
            const transform = textItem.transform;
            const fontSize = Math.abs(transform[0]); // 字体大小
            const fontName = textItem.fontName || '';
            
            textItems.push({
              text: textItem.str.trim(),
              fontSize: fontSize,
              fontName: fontName,
              bold: fontName.toLowerCase().includes('bold') || 
                    fontName.toLowerCase().includes('black') ||
                    fontSize > 14,
              page: pageNum,
              x: transform[4],
              y: viewport.height - transform[5], // 转换坐标系
              width: textItem.width,
              height: textItem.height
            });
          }
        }
      } catch (error) {
        console.warn(`处理第 ${pageNum} 页时出错:`, error);
      }
    }

    // 2. 分析文本特征，识别潜在标题
    const potentialTitles = this.analyzePotentialTitles(textItems);

    // 3. 生成层级结构
    const smartOutline = this.buildSmartOutlineHierarchy(potentialTitles);

    console.log(`智能目录生成完成，找到 ${smartOutline.length} 个标题`);
    return smartOutline;
  }

  // 合并同一行的文本项
  private mergeTextItemsOnSameLine(textItems: TextItem[]): TextItem[] {
    const merged: TextItem[] = [];
    const tolerance = 5; // 同一行的Y坐标容差

    // 按页面和Y坐标分组
    const groups: { [key: string]: TextItem[] } = {};
    
    for (const item of textItems) {
      const key = `${item.page}-${Math.round(item.y / tolerance) * tolerance}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    // 合并每组中的文本
    for (const group of Object.values(groups)) {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        // 按X坐标排序
        group.sort((a, b) => a.x - b.x);
        
        // 合并文本
        const mergedText = group.map(item => item.text).join(' ');
        const firstItem = group[0];
        const maxFontSize = Math.max(...group.map(item => item.fontSize));
        const hasBold = group.some(item => item.bold);
        
        merged.push({
          text: mergedText,
          fontSize: maxFontSize,
          fontName: firstItem.fontName,
          bold: hasBold,
          page: firstItem.page,
          x: firstItem.x,
          y: firstItem.y,
          width: group.reduce((sum, item) => sum + item.width, 0),
          height: Math.max(...group.map(item => item.height))
        });
      }
    }

    return merged;
  }

  private analyzePotentialTitles(textItems: TextItem[]): TextItem[] {
    // 计算文本的统计信息
    const fontSizes = textItems.map(item => item.fontSize);
    const avgFontSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;
    const maxFontSize = Math.max(...fontSizes);

    console.log(`字体大小统计 - 平均: ${avgFontSize.toFixed(1)}, 最大: ${maxFontSize.toFixed(1)}`);

    // 1. 先合并同一行的文本片段
    const mergedItems = this.mergeTextItemsOnSameLine(textItems);

    const potentialTitles: TextItem[] = [];

    for (const item of mergedItems) {
      let score = 0;
      
      // 评分规则 (提高标准)
      // 1. 字体大小评分 (权重最高)
      if (item.fontSize > avgFontSize * 1.5) score += 4;
      else if (item.fontSize > avgFontSize * 1.3) score += 3;
      else if (item.fontSize > avgFontSize * 1.1) score += 1;

      // 2. 粗体评分
      if (item.bold) score += 3;

      // 3. 文本长度评分 (标题通常不会太长)
      if (item.text.length < 80 && item.text.length > 5) score += 1;

      // 4. 位置评分 (页面顶部的文本更可能是标题)
      if (item.y < 150) score += 1; // 页面顶部

      // 5. 特殊模式识别 (提高分数)
      const text = item.text.toLowerCase();
      
      // 章节模式
      if (/^(第[一二三四五六七八九十\d]+[章节部分]|chapter\s*\d+|section\s*\d+)/i.test(text)) {
        score += 5;
      }
      
      // 数字开头
      if (/^\d+\./.test(text)) score += 3;
      
      // 目录关键词
      if (/^(摘要|abstract|introduction|conclusion|参考文献|bibliography|目录|contents)/i.test(text)) {
        score += 4;
      }

      // 6. 排除明显不是标题的文本
      if (item.text.length > 150) score -= 3; // 太长
      if (/^\d+$/.test(item.text)) score -= 3; // 纯数字
      if (item.text.includes('。') && item.text.length > 30) score -= 2; // 包含句号的长文本
      if (/^(page|页)\s*\d+/i.test(item.text)) score -= 3; // 页码
      if (item.text.length < 5) score -= 2; // 太短

      // 提高门槛，只保留评分较高的
      if (score >= 4) {
        console.log(`潜在标题 (评分:${score}): "${item.text}" (页面:${item.page}, 字体:${item.fontSize.toFixed(1)})`);
        potentialTitles.push({ ...item });
      }
    }

    // 按页面和位置排序
    potentialTitles.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return b.y - a.y; // 同页面内按Y坐标排序
    });

    return potentialTitles;
  }

  private buildSmartOutlineHierarchy(potentialTitles: TextItem[]): SmartOutlineItem[] {
    if (potentialTitles.length === 0) return [];

    const outline: SmartOutlineItem[] = [];
    
    // 按字体大小分组，确定层级
    const fontSizes = [...new Set(potentialTitles.map(item => item.fontSize))].sort((a, b) => b - a);
    
    for (const item of potentialTitles) {
      const level = fontSizes.indexOf(item.fontSize);
      
      outline.push({
        title: item.text,
        page: item.page,
        level: Math.min(level, 3), // 最多4层
        fontSize: item.fontSize,
        fontWeight: item.bold ? 'bold' : 'normal',
        id: `smart-outline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    }

    return outline;
  }
}
