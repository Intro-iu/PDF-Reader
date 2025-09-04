import {
  argbFromHex,
  themeFromSourceColor,
  applyTheme,
} from "@material/material-color-utilities";

// 默认源颜色
const FALLBACK_COLOR = "#6750A4";

/**
 * 将Material主题应用到DOM
 * @param sourceColorHex - 十六进制颜色字符串, e.g., "#6750A4"
 * @param isDark - 是否为暗色模式
 * @param targetEl - 应用主题的目标元素 (默认: document.body)
 */
export function applyMaterialTheme(
  sourceColorHex: string,
  isDark: boolean,
  targetEl: HTMLElement = document.body
) {
  const sourceColor = argbFromHex(sourceColorHex);
  const theme = themeFromSourceColor(sourceColor);

  // 应用M3主题变量
  applyTheme(theme, { target: targetEl, dark: isDark });

  // 添加class用于非M3变量的样式控制
  document.body.classList.toggle("dark-theme", isDark);
  document.body.classList.toggle("light-theme", !isDark);
  
  // 保存主题设置
  saveTheme(sourceColorHex, isDark);
}

/**
 * 初始化应用主题
 * 从本地存储加载或使用默认值
 */
export function initializeTheme() {
  const savedTheme = localStorage.getItem("app-theme");
  let isDark = true;
  let sourceColor = FALLBACK_COLOR;

  if (savedTheme) {
    try {
      const { isDark: savedIsDark, sourceColor: savedSourceColor } = JSON.parse(savedTheme);
      isDark = savedIsDark ?? true;
      sourceColor = savedSourceColor ?? FALLBACK_COLOR;
    } catch (e) {
      console.error("解析已保存的主题失败", e);
    }
  }

  applyMaterialTheme(sourceColor, isDark);
}

/**
 * 保存当前主题到本地存储
 * @param sourceColorHex - 十六进制颜色
 * @param isDark - 是否为暗色模式
 */
export function saveTheme(sourceColorHex: string, isDark: boolean) {
  const themeSettings = {
    sourceColor: sourceColorHex,
    isDark: isDark,
  };
  localStorage.setItem("app-theme", JSON.stringify(themeSettings));
}
