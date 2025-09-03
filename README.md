# PDF 阅读器 - AI 驱动的智能阅读体验

[![Release Build](https://github.com/ZeroHzzzz/PDF-Reader/actions/workflows/release.yml/badge.svg)](https://github.com/ZeroHzzzz/PDF-Reader/actions/workflows/release.yml)
<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) -->

天下人苦PDF阅读器久矣！

这是一款优雅、跨平台的 AI PDF 阅读器，专为简洁、高效、智能的阅读体验而设计。

---

<!-- **重要提示**: 请在此处添加一张应用截图！ -->
<!-- ![应用截图](link-to-your-screenshot.png) -->

## ✨ 核心功能

- **📖 高级 PDF 阅读**: 流畅的渲染、多种缩放选项和无缝的页面导航。
- **🤖 AI 助手**: 与您的 PDF 对话，提出问题、获取摘要并即时查找信息。
- **🌐 AI 驱动的翻译**: 选择文本即可获得多种语言的即时翻译。
- **🧭 智能大纲**: 自动检测或生成文档目录，以便快速导航。
- **🌙 主题支持**: 为 UI 和 PDF 内容提供舒适的深色模式。
- **📂 历史与进度**: 记录您最近打开的文件和阅读进度。
- **⚙️ 高度可定制**: 通过简单的配置文件自定义 AI 模型、提示词等。

## 🛠️ 技术栈

- **框架**: [Tauri 2.x](https://tauri.app/) (Rust 后端, WebView 前端)
- **前端**: [Vue 3](https://vuejs.org/) 搭配 [TypeScript](https://www.typescriptlang.org/) & [Vite](https://vitejs.dev/)
- **PDF 渲染**: [PDF.js](https://mozilla.github.io/pdf.js/)

## 🚀 快速上手

### 环境依赖

- **Node.js** (LTS 版本)
- **Rust** (最新稳定版)
- **系统依赖**:
  - **Windows**: Microsoft C++ Build Tools 和 WebView2 Runtime。
  - **macOS**: Xcode 命令行工具 (`xcode-select --install`)。
  - **Linux**: 参阅 [Tauri 文档](https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux) 查看所需包 (例如 `webkit2gtk`, `librsvg`)。

### 安装与开发

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/ZeroHzzzz/PDF-Reader.git
    cd PDF-Reader
    ```

2.  **安装依赖:**
    ```bash
    npm install
    ```

3.  **以开发模式运行:**
    这将以热重载模式打开应用。
    ```bash
    npm run dev
    ```

## 📦 生产构建

您可以为当前操作系统或特定目标平台构建应用。

- **为当前系统构建 (推荐):**
  ```bash
  npm run build:current
  ```

- **为特定平台构建:**
  ```bash
  # Windows
  npm run build:windows

  # macOS (Intel)
  npm run build:macos

  # macOS (Apple Silicon)
  npm run build:macos-arm

  # Linux
  npm run build:linux
  ```

构建产物将位于 `src-tauri/target/release/bundle/` 目录下。更多详情请参阅 `BUILD.md`。

## ⚙️ 应用配置

应用在首次启动时会在您的系统应用数据目录中自动创建两个主要的配置文件。

- `config.json`: 管理所有应用设置，包括 AI 模型端点、API 密钥、提示词和 UI 偏好。您**必须**在此处填入您的 AI 服务 API 密钥才能使用 AI 相关功能。
- `pdf-history.json`: 存储最近打开的 PDF 文件历史记录。

## 🤝 参与贡献

欢迎提交贡献、问题和功能请求！请随时查看 [Issues 页面](https://github.com/ZeroHzzzz/PDF-Reader/issues)。

## 🙏 致谢

- [Tauri](https://tauri.app/)
- [Vue.js](https://vuejs.org/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
<!-- 
## 📄 开源许可

该项目基于 MIT 许可证开源。详情请参阅 [LICENSE](LICENSE) 文件。 -->
