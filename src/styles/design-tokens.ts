/**
 * 设计系统令牌
 * 统一管理项目的颜色、间距、圆角、阴影、动画等设计元素
 */

// ==================== 颜色系统 ====================

/**
 * 条目类型颜色配置
 * 使用 HSL 格式，便于主题切换和透明度控制
 */
export const typeColors = {
  task: {
    light: { bg: '210 96% 95%', text: '210 100% 25%', border: '210 100% 70%' },
    dark: { bg: '210 50% 15%', text: '210 100% 75%', border: '210 50% 40%' },
    // 语义化名称
    name: 'blue',
  },
  event: {
    light: { bg: '142 76% 94%', text: '142 76% 20%', border: '142 76% 65%' },
    dark: { bg: '142 50% 15%', text: '142 76% 75%', border: '142 50% 40%' },
    name: 'green',
  },
  note: {
    light: { bg: '48 96% 95%', text: '48 96% 20%', border: '48 96% 70%' },
    dark: { bg: '48 50% 15%', text: '48 96% 75%', border: '48 50% 40%' },
    name: 'yellow',
  },
  data: {
    light: { bg: '270 91% 95%', text: '270 91% 25%', border: '270 91% 70%' },
    dark: { bg: '270 50% 15%', text: '270 91% 75%', border: '270 50% 40%' },
    name: 'purple',
  },
  url: {
    light: { bg: '188 94% 95%', text: '188 94% 25%', border: '188 94% 70%' },
    dark: { bg: '188 50% 15%', text: '188 94% 75%', border: '188 50% 40%' },
    name: 'cyan',
  },
  collection: {
    light: { bg: '330 81% 95%', text: '330 81% 25%', border: '330 81% 70%' },
    dark: { bg: '330 50% 15%', text: '330 81% 75%', border: '330 50% 40%' },
    name: 'pink',
  },
} as const;

/**
 * 状态颜色配置
 */
export const statusColors = {
  success: {
    light: { bg: '142 76% 94%', text: '142 76% 20%', border: '142 76% 65%' },
    dark: { bg: '142 50% 15%', text: '142 76% 75%', border: '142 50% 40%' },
  },
  warning: {
    light: { bg: '48 96% 95%', text: '48 96% 20%', border: '48 96% 70%' },
    dark: { bg: '48 50% 15%', text: '48 96% 75%', border: '48 50% 40%' },
  },
  error: {
    light: { bg: '0 84% 95%', text: '0 84% 25%', border: '0 84% 70%' },
    dark: { bg: '0 50% 15%', text: '0 84% 75%', border: '0 50% 40%' },
  },
  info: {
    light: { bg: '210 96% 95%', text: '210 100% 25%', border: '210 100% 70%' },
    dark: { bg: '210 50% 15%', text: '210 100% 75%', border: '210 50% 40%' },
  },
} as const;

/**
 * 优先级颜色配置
 */
export const priorityColors = {
  high: {
    light: { border: '0 84% 60%', bg: '0 84% 98%' },
    dark: { border: '0 84% 50%', bg: '0 50% 15%' },
  },
  medium: {
    light: { border: '48 96% 60%', bg: '48 96% 98%' },
    dark: { border: '48 96% 50%', bg: '48 50% 15%' },
  },
  low: {
    light: { border: '142 76% 60%', bg: '142 76% 98%' },
    dark: { border: '142 76% 50%', bg: '142 50% 15%' },
  },
} as const;

// ==================== 间距系统 ====================

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '2.5rem',  // 40px
  '4xl': '3rem',    // 48px
} as const;

// ==================== 圆角系统 ====================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ==================== 阴影系统 ====================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// ==================== 动画系统 ====================

export const transitions = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ==================== 工具函数 ====================

/**
 * 获取类型颜色的 Tailwind 类名
 */
export function getTypeColorClasses(type: keyof typeof typeColors, variant: 'bg' | 'text' | 'border' = 'bg') {
  const color = typeColors[type];
  if (!color) return '';
  
  // 返回语义化的类名，由 CSS 变量控制
  return `type-${type}-${variant}`;
}

/**
 * 获取状态颜色的 Tailwind 类名
 */
export function getStatusColorClasses(status: keyof typeof statusColors, variant: 'bg' | 'text' | 'border' = 'bg') {
  const color = statusColors[status];
  if (!color) return '';
  
  return `status-${status}-${variant}`;
}

/**
 * 获取优先级颜色的 Tailwind 类名
 */
export function getPriorityColorClasses(priority: keyof typeof priorityColors, variant: 'border' | 'bg' = 'border') {
  const color = priorityColors[priority];
  if (!color) return '';
  
  return `priority-${priority}-${variant}`;
}

