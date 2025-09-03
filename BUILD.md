# 📦 多平台构建指南

## 🚀 快速构建

### 推荐方式：构建当前平台
```bash
npm run build:current
```
这个命令会自动检测你的操作系统并构建对应平台的应用。

## 构建命令

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
