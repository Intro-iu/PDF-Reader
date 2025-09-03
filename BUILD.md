# 📦 多平台构建指南

## 🚀 快速构建

### 推荐方式：构建当前平台
```bash
npm run build:current
```
这个命令会自动检测你的操作系统并构建对应平台的应用。

## � 详细构建命令

### Windows 打包
```bash
# 前提：必须在 Windows 系统上运行
npm run build:windows
```
**生成文件：**
- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/PDF Reader_0.1.0_x64_en-US.msi`

**系统要求：**
- Windows 7 或更高版本
- Microsoft C++ Build Tools
- WebView2 Runtime（通常已预装）

### Linux 打包  
```bash
# 前提：必须在 Linux 系统上运行
npm run build:linux
```
**生成文件：**
- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/pdf-reader_0.1.0_amd64.deb`
- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/pdf-reader_0.1.0_amd64.AppImage`

**系统要求：**
- Ubuntu 18.04+ / Debian 10+ / Fedora 31+ 或其他现代 Linux 发行版
- 已安装必要的开发依赖（见 README.md）

### macOS 打包
```bash
# Intel 芯片 Mac（前提：必须在 macOS 系统上运行）
npm run build:macos

# Apple Silicon (M1/M2) Mac（前提：必须在 macOS 系统上运行）
npm run build:macos-arm
```
**生成文件：**
- `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/PDF Reader_0.1.0_x64.dmg`
- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/PDF Reader_0.1.0_aarch64.dmg`

**系统要求：**
- macOS 10.15 Catalina 或更高版本
- Xcode 命令行工具：`xcode-select --install`

## ⚡ 常见构建问题

### 构建失败排查
1. **检查依赖**: 确保安装了 Node.js 和 Rust
2. **权限问题**: Windows 可能需要管理员权限
3. **网络问题**: 首次构建需要下载 Rust 依赖
4. **平台限制**: 确认在正确的操作系统上构建

### 构建命令对比

| 命令 | 适用场景 | 平台限制 | 输出文件 |
|-----|---------|----------|----------|
| `npm run dev` | 开发调试 | 无 | 无（仅启动服务） |
| `npm run build:current` | **推荐**：本地构建 | 无 | 当前平台可执行文件 |
| `npm run build:windows` | Windows 专用 | 仅 Windows | .msi 安装包 |
| `npm run build:linux` | Linux 专用 | 仅 Linux | .deb + .AppImage |
| `npm run build:macos` | macOS Intel | 仅 macOS | .dmg (x64) |
| `npm run build:macos-arm` | macOS Apple Silicon | 仅 macOS | .dmg (ARM64) |

## 🚀 自动化 GitHub Actions 构建（推荐）

### 🎯 发布新版本
最简单的多平台构建方式是使用 GitHub Actions：

```bash
# 1. 确保代码已提交并推送
git add .
git commit -m "Ready for release"
git push origin tauri

# 2. 创建版本标签
git tag v1.0.0

# 3. 推送标签触发自动构建
git push origin v1.0.0
```

### 📋 自动构建流程
标签推送后，GitHub Actions 将自动：

1. **🔧 环境准备**
   - 设置 Node.js LTS 环境
   - 安装 Rust 工具链
   - 配置平台特定依赖

2. **📦 构建所有平台**
   - Windows x64 (.msi)
   - macOS Intel x64 (.dmg)
   - macOS Apple Silicon ARM64 (.dmg)
   - Linux x64 (.deb + .AppImage)

3. **🚀 自动发布**
   - 创建 GitHub Release
   - 上传所有构建产物
   - 生成详细发布说明

### 🔍 构建状态监控
在 [Actions 页面](https://github.com/ZeroHzzzz/PDF-Reader/actions) 查看构建进度：
- **绿色**：构建成功 ✅
- **红色**：构建失败 ❌
- **黄色**：构建进行中 🟡

### 📥 下载构建产物
构建完成后，在 [Releases 页面](https://github.com/ZeroHzzzz/PDF-Reader/releases) 下载：

| 平台 | 文件格式 | 适用系统 |
|-----|----------|----------|
| Windows | `.msi` | Windows 7+ |
| macOS Intel | `x64.dmg` | Intel 芯片 Mac |
| macOS Apple Silicon | `aarch64.dmg` | M1/M2/M3 芯片 Mac |
| Linux | `.deb` | Ubuntu/Debian |
| Linux | `.AppImage` | 通用 Linux 发行版 |

### 🔧 GitHub Actions 配置

#### Release 工作流 (`.github/workflows/release.yml`)
- **触发条件**：推送 `v*` 标签
- **构建矩阵**：所有平台并行构建
- **自动发布**：构建完成后自动创建 GitHub Release

#### Development 工作流 (`.github/workflows/test.yml`)
- **触发条件**：推送到 `main` 或 `tauri` 分支
- **质量检查**：TypeScript 检查、代码检查
- **测试构建**：验证代码可以正常构建

### 💡 GitHub Actions 优势
- **🌍 真正的多平台**：在原生环境中构建，无跨平台限制
- **⚡ 并行构建**：所有平台同时构建，节省时间
- **🔄 自动化流程**：从代码到发布的完整自动化
- **📦 统一管理**：所有版本在 GitHub Releases 统一管理
- **🔒 安全可靠**：GitHub 提供的安全构建环境

## ⚠️ 重要注意事项

### 🔒 跨平台编译限制
- **Windows**: 只能在 Windows 系统上编译 Windows 版本
- **Linux**: 只能在 Linux 环境编译 Linux 版本
- **macOS**: 只能在 macOS 系统上编译 macOS 版本

### 💡 推荐构建策略
1. **本地开发测试**: 使用 `npm run build:current` 构建当前平台版本
2. **生产环境发布**: 使用 GitHub Actions 自动化构建所有平台版本
3. **快速验证**: 使用 `npm run dev` 进行开发时实时预览

### 🛠️ 构建环境要求
- **所有平台**: Node.js LTS + Rust 最新稳定版
- **Windows**: Microsoft C++ Build Tools + WebView2
- **Linux**: webkit2gtk, libappindicator3, librsvg2, patchelf
- **macOS**: Xcode 命令行工具

## 🛠️ 环境配置

### Windows
- 安装 Microsoft C++ Build Tools
- 安装 WebView2 Runtime

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
```

### macOS
```bash
# 安装 Xcode 命令行工具
xcode-select --install
```
