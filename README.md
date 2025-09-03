# PDF Reader

一个基于 Vue 3 和 Tauri 构建的现代 PDF 阅读器

## 特性

- 📖 PDF 文件查看和导航
- 📝 智能目录生成
- 🌙 夜间模式
- 📋 PDF 历史记录
- 🔍 文本搜索和翻译
- 💬 AI 聊天助手
- 🎨 现代化用户界面
- 🖥️ 跨平台支持 (Windows, macOS, Linux)

## 开发

### 前置条件

- Node.js (LTS 版本)
- Rust (最新稳定版)
- 系统依赖：
  - **Linux**: `webkit2gtk` 开发包
  - **macOS**: Xcode 命令行工具
  - **Windows**: Microsoft C++ Build Tools

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

## 打包

### 本地多平台打包

```bash
# Windows 打包
npm run build:windows

# Linux 打包  
npm run build:linux

# macOS 打包 (Intel)
npm run build:macos

# macOS 打包 (Apple Silicon)
npm run build:macos-arm

# 一键打包所有平台
npm run build:all
```

详细打包说明请查看 [BUILD.md](./BUILD.md)

### 自动化构建

推送 tag 到 GitHub 自动触发多平台构建：

```bash
git tag v1.0.0
git push origin v1.0.0
```

将自动构建：
- macOS (Intel + Apple Silicon)
- Windows (x64)
- Linux (x64)

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Tauri 2.x (Rust)
- **PDF 引擎**: PDF.js
- **UI 组件**: 自定义组件系统
