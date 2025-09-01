// Tauri 增强功能
if (typeof window.TauriEnhancer === 'undefined') {
    class TauriEnhancer {
        constructor() {
            this.isTauri = window.__TAURI__ !== undefined;
            this.dialog = this.isTauri ? window.__TAURI__.dialog : null;
            this.fs = this.isTauri ? window.__TAURI__.fs : null;
        }

        // 使用 Tauri 的文件对话框选择 PDF
        async openPDFDialog() {
            if (!this.isTauri || !this.dialog) {
                console.log('不在 Tauri 环境中或 dialog API 不可用，使用默认文件选择');
                return null;
            }

            try {
                const selected = await this.dialog.open({
                    title: '选择 PDF 文件',
                    filters: [{
                        name: 'PDF 文件',
                        extensions: ['pdf']
                    }],
                    multiple: false
                });

                if (selected && !Array.isArray(selected)) {
                    return selected;
                }
                return null;
            } catch (error) {
                console.error('文件对话框错误:', error);
                return null;
            }
        }

        // 读取文件内容
        async readFile(filePath) {
            if (!this.isTauri || !this.fs) {
                return null;
            }

            try {
                const contents = await this.fs.readBinaryFile(filePath);
                return contents;
            } catch (error) {
                console.error('读取文件错误:', error);
                return null;
            }
        }

        // 检查是否在 Tauri 环境中
        isInTauri() {
            return this.isTauri;
        }
    }

    // 导出供其他模块使用
    window.TauriEnhancer = TauriEnhancer;
}
