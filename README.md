# PDF Reader

一个功能丰富的现代 PDF 阅读器，基于 Vue 3 和 Tauri 构建，提供智能化的 PDF 阅读体验。

## ✨ 核心功能

### 📖 PDF 阅读与导航
- **多格式支持**：完整支持 PDF 文档阅读
- **智能缩放**：自适应缩放、适合页面、自定义缩放比例
- **页面导航**：快速跳转、页面预览、键盘快捷键
- **平滑滚动**：优化的页面滚动体验

### 📝 智能目录系统
- **自动目录识别**：自动解析 PDF 内置目录结构
- **智能目录生成**：AI 驱动的目录智能识别与生成
- **目录导航**：点击目录项快速跳转到对应页面
- **可折叠目录树**：支持多级目录展开/折叠

### 🌙 界面与主题
- **夜间模式**：护眼的深色主题
- **PDF 夜间模式**：专门的 PDF 文档夜间显示
- **响应式布局**：适配不同屏幕尺寸
- **现代化 UI**：简洁美观的用户界面

### 📋 历史记录管理
- **PDF 历史记录**：自动记录最近打开的 PDF 文件
- **快速重新打开**：一键重新打开历史文件
- **智能路径管理**：自动处理文件路径变更
- **读取进度记忆**：记住上次阅读的页面位置

### 🔍 文本处理与翻译
- **文本选择**：精确的文本选择功能
- **智能翻译**：集成 AI 翻译服务
- **多语言支持**：支持多种目标语言翻译
- **自动翻译**：可选的文本选择自动翻译

### 💬 AI 聊天助手
- **PDF 内容问答**：基于 PDF 内容的智能问答
- **多模型支持**：支持多种 AI 模型配置
- **上下文理解**：理解 PDF 上下文进行对话
- **历史记录**：保存聊天历史

### ⚙️ 高级配置
- **多 AI 模型配置**：支持配置多个 AI 服务
- **个性化设置**：丰富的个性化选项
- **跨平台同步**：配置文件跨平台兼容
- **自动保存**：设置自动保存功能

## 🚀 快速开始

### 📥 安装与运行
```bash
# 1. 克隆项目
git clone https://github.com/ZeroHzzzz/PDF-Reader.git
cd PDF-Reader

# 2. 安装依赖
npm install

# 3. 开发模式
npm run dev

# 4. 构建应用（推荐）
npm run build:current
```

### 💻 构建说明
- **开发调试**：`npm run dev` - 实时预览
- **本地打包**：`npm run build:current` - 自动检测平台构建
- **特定平台**：`npm run build:windows/linux/macos` - 仅在对应平台可用
- **多平台发布**：使用 GitHub Actions 自动构建所有平台

详细构建说明请查看 [BUILD.md](./BUILD.md)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run tauri:build
```

## 📁 配置文件说明

应用首次运行时会自动创建两个重要的配置文件：

### 1. `config.json` - 应用配置文件
**位置**：`应用数据目录/config.json`
**用途**：存储应用的所有配置信息

```json
{
  "aiModels": [
    {
      "id": "default_model",
      "name": "示例模型",
      "modelId": "gpt-3.5-turbo",
      "apiEndpoint": "https://api.openai.com/v1",
      "apiKey": "",
      "supportsChat": true,
      "supportsTranslation": true
    }
  ],
  "activeChatModel": "default_model",
  "activeTranslateModel": "default_model",
  "translateTargetLang": "zh",
  "autoSaveSettings": true,
  "enableSelectionTranslation": true,
  "textSelectionColor": "#007bff",
  "selectionOpacity": 30,
  "chatPrompt": "你是一个专业的学术论文阅读助手。",
  "translationPrompt": "Translate the following text to [TARGET_LANG]: [SELECTED_TEXT]"
}
```

### 2. `pdf-history.json` - PDF 历史记录文件
**位置**：`应用数据目录/pdf-history.json`
**用途**：记录最近打开的 PDF 文件信息

```json
[
  {
    "id": "unique_id",
    "name": "document.pdf",
    "path": "/path/to/document.pdf",
    "openTime": 1693747200000,
    "lastPage": 10,
    "totalPages": 50
  }
]
```

### 配置文件特性
- ✅ **自动创建**：首次运行时自动生成默认配置
- ✅ **自动保存**：设置更改时自动保存
- ✅ **错误恢复**：配置文件损坏时自动重建
- ✅ **跨平台兼容**：在不同操作系统间保持兼容
- ✅ **备份安全**：重要设置不会丢失

## 🛠️ 开发环境

## 🛠️ 开发环境

### 前置条件

- **Node.js** (LTS 版本) - JavaScript 运行时
- **Rust** (最新稳定版) - 系统编程语言
- **系统依赖**：
  - **Windows**: Microsoft C++ Build Tools + WebView2 Runtime
  - **macOS**: Xcode 命令行工具 (`xcode-select --install`)
  - **Linux**: `webkit2gtk-4.0-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`

### Linux 依赖安装
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf

# Fedora/CentOS
sudo dnf install webkit2gtk4.0-devel libappindicator-gtk3-devel librsvg2-devel patchelf
```

## 📦 打包与分发

### 🚀 快速开始
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建当前平台（推荐）
npm run build:current
```

### 🔨 构建命令详解

| 脚本命令 | 用途 | 适用平台 | 说明 |
|---------|------|----------|------|
| `npm run dev` | 开发模式，实时预览 | 所有平台 | 用于开发调试 |
| `npm run build` | 仅构建前端资源 | 所有平台 | 不生成可执行文件 |
| `npm run build:current` | **推荐**：构建当前平台应用 | 所有平台 | 自动检测平台并构建 |
| `npm run build:windows` | 构建 Windows MSI 安装包 | 仅 Windows | 生成 .msi 安装文件 |
| `npm run build:linux` | 构建 Linux DEB/AppImage | 仅 Linux | 生成 .deb 和 .AppImage |
| `npm run build:macos` | 构建 macOS DMG (Intel) | 仅 macOS | 适用于 Intel 芯片 Mac |
| `npm run build:macos-arm` | 构建 macOS DMG (Apple Silicon) | 仅 macOS | 适用于 M1/M2 芯片 Mac |

### 📂 构建输出位置
构建完成后，可执行文件位于 `src-tauri/target/` 目录下：
- **Windows**: `x86_64-pc-windows-msvc/release/bundle/msi/PDF Reader_0.1.0_x64_en-US.msi`
- **Linux**: `x86_64-unknown-linux-gnu/release/bundle/deb/pdf-reader_0.1.0_amd64.deb`
- **macOS**: `x86_64-apple-darwin/release/bundle/dmg/PDF Reader_0.1.0_x64.dmg`

## 🏗️ 技术架构

### 前端技术栈
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速的前端构建工具
- **PDF.js** - Mozilla 的 PDF 渲染引擎

### 后端技术栈
- **Tauri 2.x** - 跨平台桌面应用框架
- **Rust** - 系统级编程语言
- **WebView** - 系统原生 WebView

### 核心特性
- **跨平台兼容** - 支持 Windows、macOS、Linux
- **原生性能** - Rust 后端提供原生级性能
- **现代 UI** - Vue 3 组合式 API + TypeScript
- **安全可靠** - Tauri 安全模型保护系统资源

## 🚀 自动化构建

### GitHub Actions 工作流
项目包含自动化构建工作流：

**Release Build** (`.github/workflows/release.yml`)
- 触发条件：推送版本标签 (`v*`)
- 功能：自动构建所有平台并发布到 GitHub Releases
- 支持平台：Windows, macOS (Intel + Apple Silicon), Linux

### 创建新版本发布
```bash
# 创建并推送版本标签
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions 将自动：
# 1. 构建所有平台版本
# 2. 创建 GitHub Release
# 3. 上传构建产物
# 4. 生成详细的发布说明
```

### 构建状态
[![Release Build](https://github.com/ZeroHzzzz/PDF-Reader/actions/workflows/release.yml/badge.svg)](https://github.com/ZeroHzzzz/PDF-Reader/actions/workflows/release.yml)

## 🙏 致谢

感谢以下开源项目：
- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF 渲染引擎
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
