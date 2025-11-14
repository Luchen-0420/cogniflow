/**
 * 颜色工具函数
 * 提供便捷的类型颜色、状态颜色、优先级颜色类名生成
 */

import { cn } from '@/lib/utils';

export type ItemType = 'task' | 'event' | 'note' | 'data' | 'url' | 'collection';
export type StatusType = 'success' | 'warning' | 'error' | 'info';
export type PriorityType = 'high' | 'medium' | 'low';

/**
 * 获取条目类型的颜色类名
 */
export function getTypeColorClasses(
  type: ItemType,
  variant: 'bg' | 'text' | 'border' = 'bg'
): string {
  return `type-${type}-${variant}`;
}

/**
 * 获取状态颜色的类名
 */
export function getStatusColorClasses(
  status: StatusType,
  variant: 'bg' | 'text' | 'border' = 'bg'
): string {
  return `status-${status}-${variant}`;
}

/**
 * 获取优先级颜色的类名
 */
export function getPriorityColorClasses(
  priority: PriorityType,
  variant: 'border' | 'bg' = 'border'
): string {
  return `priority-${priority}-${variant}`;
}

/**
 * 条目类型标签的颜色配置（用于 Badge 等组件）
 */
export const typeBadgeColors: Record<ItemType, string> = {
  task: 'bg-type-task-bg text-type-task-text border-type-task-border',
  event: 'bg-type-event-bg text-type-event-text border-type-event-border',
  note: 'bg-type-note-bg text-type-note-text border-type-note-border',
  data: 'bg-type-data-bg text-type-data-text border-type-data-border',
  url: 'bg-type-url-bg text-type-url-text border-type-url-border',
  collection: 'bg-type-collection-bg text-type-collection-text border-type-collection-border',
};

/**
 * 状态标签的颜色配置
 */
export const statusBadgeColors: Record<StatusType, string> = {
  success: 'bg-status-success-bg text-status-success-text border-status-success-border',
  warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  error: 'bg-status-error-bg text-status-error-text border-status-error-border',
  info: 'bg-status-info-bg text-status-info-text border-status-info-border',
};

/**
 * 优先级边框颜色配置
 */
export const priorityBorderColors: Record<PriorityType, string> = {
  high: 'border-l-4 border-l-priority-high-border',
  medium: 'border-l-4 border-l-priority-medium-border',
  low: 'border-l-4 border-l-priority-low-border',
};

/**
 * 获取条目类型的完整 Badge 类名
 */
export function getTypeBadgeClasses(type: ItemType, className?: string): string {
  return cn(typeBadgeColors[type], className);
}

/**
 * 获取状态的完整 Badge 类名
 */
export function getStatusBadgeClasses(status: StatusType, className?: string): string {
  return cn(statusBadgeColors[status], className);
}

/**
 * 获取优先级的边框类名
 */
export function getPriorityBorderClasses(priority: PriorityType, className?: string): string {
  return cn(priorityBorderColors[priority], className);
}

