# 🚀 部署与发布指南

## 📋 发布流程

### 1. 准备发布
```bash
# 确保所有更改已提交
git add .
git commit -m "feat: prepare for v1.0.0 release"
git push origin tauri
```

### 2. 创建版本标签
```bash
# 创建语义化版本标签
git tag v1.0.0

# 推送标签触发自动构建
git push origin v1.0.0
```

### 3. 监控构建进度
访问 [GitHub Actions](https://github.com/ZeroHzzzz/PDF-Reader/actions) 页面监控构建状态。

### 4. 验证发布
构建完成后，检查 [GitHub Releases](https://github.com/ZeroHzzzz/PDF-Reader/releases) 页面。

## 🏗️ GitHub Actions 工作流

### Release 工作流详解

**文件位置**: `.github/workflows/release.yml`

**构建矩阵**:
- **Windows**: `x86_64-pc-windows-msvc` → `.msi` 安装包
- **macOS Intel**: `x86_64-apple-darwin` → `.dmg` 磁盘镜像
- **macOS Apple Silicon**: `aarch64-apple-darwin` → `.dmg` 磁盘镜像  
- **Linux**: `x86_64-unknown-linux-gnu` → `.deb` + `.AppImage`

**构建步骤**:
1. 检出代码
2. 安装平台依赖
3. 设置 Rust 和 Node.js
4. 缓存依赖
5. 构建前端
6. 构建 Tauri 应用
7. 创建 GitHub Release
8. 上传构建产物

## 📦 版本管理策略

### 语义化版本 (SemVer)
我们采用语义化版本控制：

- **主版本号 (MAJOR)**: 不兼容的 API 修改
- **次版本号 (MINOR)**: 向下兼容的功能性新增
- **修订号 (PATCH)**: 向下兼容的问题修正

**示例**:
```bash
v1.0.0    # 首个稳定版本
v1.1.0    # 新增功能
v1.1.1    # 修复 bug
v2.0.0    # 重大更新
```

### 预发布版本
```bash
# Alpha 版本 (内部测试)
git tag v1.1.0-alpha.1
git push origin v1.1.0-alpha.1

# Beta 版本 (公开测试)
git tag v1.1.0-beta.1
git push origin v1.1.0-beta.1

# Release Candidate (发布候选)
git tag v1.1.0-rc.1
git push origin v1.1.0-rc.1
```

## 🔧 Release Notes 自动生成

GitHub Actions 会自动生成详细的发布说明，包括：

- 🎉 版本欢迎信息
- 📦 平台特定下载指南
- ✨ 主要功能亮点
- 🔧 技术架构说明
- 📝 安装使用说明
- 🐛 问题反馈链接

## 🚨 故障排除

### 构建失败常见原因

1. **依赖问题**
   - 确保 `package.json` 中的依赖版本正确
   - 检查 `src-tauri/Cargo.toml` 中的 Rust 依赖

2. **平台特定问题**
   - macOS: 确保 Xcode 命令行工具已安装
   - Linux: 确保所有系统依赖已安装
   - Windows: 确保 Visual Studio Build Tools 已安装

3. **权限问题**
   - 确保 `GITHUB_TOKEN` 有足够权限
   - 检查仓库的 Actions 权限设置

4. **网络问题**
   - GitHub Actions 环境网络问题
   - Rust crates.io 下载超时

### 调试构建问题

1. **查看构建日志**
   - 在 Actions 页面点击失败的构建
   - 展开相应的步骤查看详细日志

2. **本地复现**
   ```bash
   # 本地测试构建
   npm run build:current
   
   # 检查 TypeScript
   npx vue-tsc --noEmit
   ```

3. **分支测试**
   - 在 `tauri` 分支推送代码会触发测试构建
   - 确保测试通过后再创建发布标签

## 📈 发布后的工作

### 1. 验证下载链接
确保所有平台的安装包都能正常下载和安装。

### 2. 更新文档
- 更新 README.md 中的版本信息
- 更新功能说明
- 更新截图（如果有 UI 变化）

### 3. 通知用户
- 在相关社区发布更新通知
- 更新项目主页或文档站点

### 4. 监控反馈
- 关注 GitHub Issues 中的用户反馈
- 收集使用统计数据
- 准备后续版本的改进计划

## 🎯 最佳实践

1. **定期发布**: 建议每 2-4 周发布一个版本
2. **充分测试**: 发布前在所有目标平台上进行测试
3. **文档同步**: 确保文档与功能保持同步
4. **用户反馈**: 积极收集和响应用户反馈
5. **安全更新**: 及时发布安全相关的修复版本
