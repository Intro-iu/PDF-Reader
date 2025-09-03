import { invoke } from '@tauri-apps/api/core'

export interface PdfHistoryItem {
  id: string
  name: string
  path: string
  openTime: number
  totalPages?: number
}

export interface PdfHistoryData {
  items: PdfHistoryItem[]
}

class PdfHistoryManager {
  private static instance: PdfHistoryManager
  private isInitialized = false

  private constructor() {}

  public static getInstance(): PdfHistoryManager {
    if (!PdfHistoryManager.instance) {
      PdfHistoryManager.instance = new PdfHistoryManager()
    }
    return PdfHistoryManager.instance
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // 检查是否在 Tauri 环境中
      if (window.__TAURI_INTERNALS__) {
        // 在 Tauri 环境中，尝试初始化文件
        await invoke('init_pdf_history')
        console.log('PDF 历史记录文件初始化成功')
      }
      this.isInitialized = true
    } catch (error) {
      console.error('PDF 历史记录初始化失败:', error)
      this.isInitialized = true
    }
  }

  public async loadHistory(): Promise<PdfHistoryItem[]> {
    try {
      if (window.__TAURI_INTERNALS__) {
        // Tauri 环境：从文件读取
        const historyData = await invoke<PdfHistoryData>('get_pdf_history')
        return historyData.items || []
      } else {
        // Web 环境：从 localStorage 读取
        const saved = localStorage.getItem('pdf-reader-pdf-history')
        if (saved) {
          return JSON.parse(saved)
        }
        return []
      }
    } catch (error) {
      console.error('加载PDF历史记录失败:', error)
      return []
    }
  }

  public async saveHistory(items: PdfHistoryItem[]): Promise<void> {
    try {
      if (window.__TAURI_INTERNALS__) {
        // Tauri 环境：保存到文件
        const historyData: PdfHistoryData = { items }
        await invoke('set_pdf_history', { history: historyData })
        console.log('PDF 历史记录文件保存成功')
      } else {
        // Web 环境：保存到 localStorage
        localStorage.setItem('pdf-reader-pdf-history', JSON.stringify(items))
        console.log('PDF 历史记录保存到 localStorage')
      }
    } catch (error) {
      console.error('保存PDF历史记录失败:', error)
    }
  }

  public async addToHistory(item: PdfHistoryItem, maxItems: number = 50): Promise<PdfHistoryItem[]> {
    const currentHistory = await this.loadHistory()
    
    // 检查是否已存在（基于文件路径）
    const existingIndex = currentHistory.findIndex(h => h.path === item.path)
    
    if (existingIndex >= 0) {
      // 如果已存在，更新时间并移到最前
      currentHistory[existingIndex].openTime = item.openTime
      if (item.totalPages) {
        currentHistory[existingIndex].totalPages = item.totalPages
      }
      const existing = currentHistory.splice(existingIndex, 1)[0]
      currentHistory.unshift(existing)
    } else {
      // 添加新记录到开头
      currentHistory.unshift(item)
    }
    
    // 限制历史记录数量
    if (currentHistory.length > maxItems) {
      currentHistory.splice(maxItems)
    }
    
    await this.saveHistory(currentHistory)
    return currentHistory
  }

  public async removeFromHistory(id: string): Promise<PdfHistoryItem[]> {
    const currentHistory = await this.loadHistory()
    const filteredHistory = currentHistory.filter(item => item.id !== id)
    await this.saveHistory(filteredHistory)
    return filteredHistory
  }

  public async clearHistory(): Promise<void> {
    await this.saveHistory([])
  }
}

export const pdfHistoryManager = PdfHistoryManager.getInstance()
