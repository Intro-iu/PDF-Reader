import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// 定义主机名，如果环境变量中有 HOST，则使用它
const host = process.env.HOST || false;

// https://vitejs.dev/config/
export default defineConfig({
  // Vite Plugins
  plugins: [vue()],

  // Vite 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    host: host,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  // Vite Build 配置
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM == 'windows'
        ? 'chrome105'
        : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  // Vite 环境变量前缀
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  
  // Vite 别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // Vite 清屏配置
  clearScreen: false,
});