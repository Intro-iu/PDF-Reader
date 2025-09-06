import axios from 'axios'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl?: string
  releaseNotes?: string
  downloadUrl?: string
}

// 当前版本号（从package.json同步）
export const CURRENT_VERSION = '1.0.6-beta'

// GitHub仓库信息
const GITHUB_OWNER = 'ZeroHzzzz'
const GITHUB_REPO = 'PDF-Reader'

/**
 * 比较版本号
 * @param current 当前版本
 * @param latest 最新版本
 * @returns true表示有更新
 */
function compareVersions(current: string, latest: string): boolean {
  const cleanCurrent = current.replace(/^v/, '')
  const cleanLatest = latest.replace(/^v/, '')
  
  const currentParts = cleanCurrent.split('.').map(Number)
  const latestParts = cleanLatest.split('.').map(Number)
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0
    
    if (latestPart > currentPart) {
      return true
    } else if (latestPart < currentPart) {
      return false
    }
  }
  
  return false
}

/**
 * 检查更新
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PDF-Reader-App'
      },
      timeout: 10000 // 10秒超时
    })

    const release = response.data
    const latestVersion = release.tag_name || release.name
    
    const hasUpdate = compareVersions(CURRENT_VERSION, latestVersion)
    
    // 查找Windows安装包下载链接
    let downloadUrl = ''
    if (release.assets && Array.isArray(release.assets)) {
      const windowsAsset = release.assets.find((asset: any) => 
        asset.name.includes('.msi') || asset.name.includes('.exe') || asset.name.includes('windows')
      )
      downloadUrl = windowsAsset?.browser_download_url || release.html_url
    }

    return {
      hasUpdate,
      currentVersion: CURRENT_VERSION,
      latestVersion,
      releaseUrl: release.html_url,
      releaseNotes: release.body,
      downloadUrl
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    return {
      hasUpdate: false,
      currentVersion: CURRENT_VERSION,
      latestVersion: CURRENT_VERSION
    }
  }
}

/**
 * 获取更新检查的缓存键
 */
function getUpdateCacheKey(): string {
  return `update_check_${CURRENT_VERSION}`
}

/**
 * 检查是否应该进行更新检查（避免频繁检查）
 */
export function shouldCheckForUpdates(): boolean {
  const cacheKey = getUpdateCacheKey()
  const lastCheck = localStorage.getItem(cacheKey)
  
  if (!lastCheck) {
    return true
  }
  
  const lastCheckTime = new Date(lastCheck).getTime()
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000 // 24小时
  
  return (now - lastCheckTime) > oneDay
}

/**
 * 记录更新检查时间
 */
export function recordUpdateCheck(): void {
  const cacheKey = getUpdateCacheKey()
  localStorage.setItem(cacheKey, new Date().toISOString())
}
