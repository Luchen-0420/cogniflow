/**
 * API 使用次数管理服务
 * 用于检查和管理用户的 API 调用次数
 */

import { postgresAuth } from '@/db/postgresAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiUsageInfo {
  currentUsage: number;
  maxUsage: number;
  remaining: number;
  accountType: 'registered' | 'quick_login';
}

/**
 * 获取用户 API 使用情况
 */
export async function getApiUsage(): Promise<ApiUsageInfo | null> {
  try {
    const token = postgresAuth.getToken();
    if (!token) {
      console.error('未登录');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/users/api-usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取 API 使用情况失败');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取 API 使用情况失败:', error);
    return null;
  }
}

/**
 * 检查并扣减 API 使用次数
 * @returns 返回检查结果，包括是否成功和剩余次数
 */
export async function checkAndDecrementApiUsage(): Promise<{
  success: boolean;
  remaining: number;
  message: string;
}> {
  try {
    const token = postgresAuth.getToken();
    if (!token) {
      return {
        success: false,
        remaining: 0,
        message: '未登录'
      };
    }

    const response = await fetch(`${API_BASE_URL}/users/check-api-usage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        remaining: data.remaining || 0,
        message: data.error || '检查 API 使用次数失败'
      };
    }

    return {
      success: data.success,
      remaining: data.remaining,
      message: data.message
    };
  } catch (error) {
    console.error('检查 API 使用次数失败:', error);
    return {
      success: false,
      remaining: 0,
      message: '网络错误，请稍后重试'
    };
  }
}

/**
 * 检查是否需要使用 API（是否使用 PostgreSQL 模式）
 */
export function needsApiUsageCheck(): boolean {
  const storageMode = import.meta.env.VITE_STORAGE_MODE;
  return storageMode === 'postgres';
}

/**
 * 在调用 AI 功能前检查使用次数
 * 如果不是 PostgreSQL 模式，直接返回成功
 * @param actionName 操作名称，用于错误提示
 */
export async function checkApiUsageBeforeAction(
  actionName: string = 'AI 功能'
): Promise<{ canProceed: boolean; message?: string; remaining?: number }> {
  // 如果不使用 PostgreSQL，不需要检查
  if (!needsApiUsageCheck()) {
    return { canProceed: true };
  }

  const result = await checkAndDecrementApiUsage();

  if (!result.success) {
    return {
      canProceed: false,
      message: `${actionName}失败：${result.message}`,
      remaining: result.remaining
    };
  }

  return {
    canProceed: true,
    message: `剩余 ${result.remaining} 次`,
    remaining: result.remaining
  };
}
