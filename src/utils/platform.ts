// 平台检测工具

// 扩展 Window 接口以包含 Tauri 属性
declare global {
  interface Window {
    __TAURI_INTERNALS__?: any
  }
}

export interface PlatformInfo {
  name: 'Windows' | 'macOS' | 'Linux' | 'Unknown'
  isTauri: boolean
  isWeb: boolean
}

export function getPlatformInfo(): PlatformInfo {
  const isTauri = window.__TAURI_INTERNALS__ !== undefined
  
  let platformName: PlatformInfo['name'] = 'Unknown'
  
  if (isTauri) {
    // 在 Tauri 环境中，可以通过 Tauri API 获取更准确的平台信息
    // 这里先用 navigator.userAgent 作为备选方案
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('windows') || userAgent.includes('win32')) {
      platformName = 'Windows'
    } else if (userAgent.includes('mac') || userAgent.includes('darwin')) {
      platformName = 'macOS'
    } else if (userAgent.includes('linux')) {
      platformName = 'Linux'
    }
  } else {
    // Web 环境中的平台检测
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('windows')) {
      platformName = 'Windows'
    } else if (userAgent.includes('mac')) {
      platformName = 'macOS'
    } else if (userAgent.includes('linux')) {
      platformName = 'Linux'
    }
  }
  
  return {
    name: platformName,
    isTauri,
    isWeb: !isTauri
  }
}

// 路径处理工具（跨平台）
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

export function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || 'unknown.pdf'
}

// 键盘快捷键映射（不同平台的修饰键不同）
export function getModifierKey(): 'Ctrl' | 'Cmd' {
  const platform = getPlatformInfo()
  return platform.name === 'macOS' ? 'Cmd' : 'Ctrl'
}

// 检查是否为开发环境
export function isDevelopment(): boolean {
  return import.meta.env.DEV
}
