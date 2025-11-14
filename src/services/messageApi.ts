/**
 * 留言板 API 服务
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 获取认证 token
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('cogniflow_auth_token');
  if (token) return token;
  
  const user = localStorage.getItem('cogniflow_current_user');
  if (!user) return null;
  
  try {
    const userData = JSON.parse(user);
    return userData.token || null;
  } catch {
    return null;
  }
};

export interface Message {
  id: string;
  user_id: string;
  username: string;
  content: string;
  parent_id: string | null;
  like_count: number;
  dislike_count: number;
  reply_count?: number;
  created_at: string;
  updated_at: string;
  replies?: Message[];
}

export interface MessageReaction {
  reaction_type: 'like' | 'dislike' | null;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * 获取留言列表
 */
export async function getMessages(page = 1, limit = 20, parentId?: string): Promise<MessagesResponse> {
  const url = parentId 
    ? `${API_BASE_URL}/messages?page=${page}&limit=${limit}&parent_id=${parentId}`
    : `${API_BASE_URL}/messages?page=${page}&limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 获取留言详情（包含回复）
 */
export async function getMessage(id: string): Promise<{ message: Message }> {
  const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 创建留言
 */
export async function createMessage(content: string, parentId?: string): Promise<{ message: string; data: Message }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('未登录');
  }

  const response = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: content.trim(),
      parent_id: parentId || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    // 确保错误信息包含状态码，方便前端判断
    const errorMessage = error.error || `HTTP ${response.status}`;
    if (response.status === 401) {
      throw new Error('未授权：' + errorMessage);
    } else if (response.status === 404) {
      throw new Error('用户不存在：' + errorMessage);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 点赞/点踩留言
 */
export async function toggleReaction(messageId: string, reactionType: 'like' | 'dislike'): Promise<{ message: string; reaction_type: string | null }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('未登录');
  }

  const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reaction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      reaction_type: reactionType,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 获取用户对留言的反应状态
 */
export async function getUserReaction(messageId: string): Promise<MessageReaction> {
  const token = getAuthToken();
  if (!token) {
    return { reaction_type: null };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reaction`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { reaction_type: null };
    }

    return response.json();
  } catch {
    return { reaction_type: null };
  }
}

/**
 * 删除留言
 */
export async function deleteMessage(messageId: string): Promise<{ message: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('未登录');
  }

  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

