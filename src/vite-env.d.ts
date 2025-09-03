/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 添加 NodeJS 命名空间声明，兼容浏览器和 Node.js 环境
declare namespace NodeJS {
  interface Timeout extends ReturnType<typeof setTimeout> {}
}
