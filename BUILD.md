# Multi-Platform Build Guide

## 📦 本地打包命令

### Windows 打包
```bash
npm run build:windows
```
生成文件：
- `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/PDF Reader_0.1.0_x64_en-US.msi`

### Linux 打包  
```bash
npm run build:linux
```
生成文件：
- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/pdf-reader_0.1.0_amd64.deb`
- `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/pdf-reader_0.1.0_amd64.AppImage`

### macOS 打包
```bash
# Intel 芯片 Mac
npm run build:macos

# Apple Silicon (M1/M2) Mac
npm run build:macos-arm
```
生成文件：
- `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/PDF Reader_0.1.0_x64.dmg`
- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/PDF Reader_0.1.0_aarch64.dmg`

### 一键打包所有平台
```bash
npm run build:all
```

## 🚀 自动化 GitHub Actions 构建

推送版本标签自动构建所有平台：

```bash
git tag v1.0.0
git push origin v1.0.0
```

将自动生成并发布到 GitHub Releases：
- Windows `.msi` 安装包
- Linux `.deb` 和 `.AppImage` 
- macOS `.dmg` (Intel + Apple Silicon)

## ⚠️ 注意事项

### 跨平台编译限制
- **Windows**: 只能在 Windows 上编译
- **Linux**: 需要在 Linux 环境或 WSL/Docker 
- **macOS**: 只能在 macOS 上编译

### 推荐方案
1. **本地开发**: 使用对应系统打包测试版本
2. **生产发布**: 使用 GitHub Actions 自动化构建所有平台

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
