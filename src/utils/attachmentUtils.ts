/**
 * 附件上传工具函数
 */

import { auth } from '@/db/api';

// API_BASE_URL 已经包含了 /api 路径
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * 获取认证 token
 */
function getAuthToken(): string {
  // 直接从 localStorage 获取 token
  const token = localStorage.getItem('cogniflow_auth_token');
  if (!token) {
    throw new Error('未找到认证令牌，请重新登录');
  }
  return token;
}

export interface AttachmentUploadResponse {
  success: boolean;
  attachment: {
    id: string;
    originalFilename: string;
    fileType: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
  };
}

export interface Attachment {
  id: string;
  user_id: string;
  item_id?: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'document' | 'video' | 'audio' | 'other';
  width?: number;
  height?: number;
  duration?: number;
  ai_analysis?: any;
  ai_description?: string;
  ai_tags?: string[];
  ai_processed_at?: string;
  thumbnail_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  upload_status: 'uploading' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * 上传附件
 */
export async function uploadAttachment(
  file: File,
  itemId?: string
): Promise<AttachmentUploadResponse> {
  const user = auth.getCurrentUser();
  if (!user) {
    throw new Error('用户未登录');
  }

  const token = getAuthToken();

  const formData = new FormData();
  formData.append('file', file);
  if (itemId) {
    formData.append('itemId', itemId);
  }

  const response = await fetch(`${API_BASE_URL}/attachments/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '上传失败');
  }

  return response.json();
}

/**
 * 获取附件信息
 */
export async function getAttachment(attachmentId: string): Promise<Attachment> {
  const user = auth.getCurrentUser();
  if (!user) {
    throw new Error('用户未登录');
  }

  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取附件信息失败');
  }

  return response.json();
}

/**
 * 获取条目的所有附件
 */
export async function getItemAttachments(itemId: string): Promise<Attachment[]> {
  const user = auth.getCurrentUser();
  if (!user) {
    throw new Error('用户未登录');
  }

  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/attachments/item/${itemId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取附件列表失败');
  }

  return response.json();
}

/**
 * 删除附件
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const user = auth.getCurrentUser();
  if (!user) {
    throw new Error('用户未登录');
  }

  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('删除附件失败');
  }
}

/**
 * 获取附件文件URL
 */
export function getAttachmentFileURL(attachmentId: string): string {
  const user = auth.getCurrentUser();
  if (!user) {
    return '';
  }
  
  const token = localStorage.getItem('cogniflow_auth_token') || '';
  return `${API_BASE_URL}/attachments/${attachmentId}/file?token=${token}`;
}

/**
 * 获取用户附件统计
 */
export async function getUserAttachmentStats(): Promise<any> {
  const user = auth.getCurrentUser();
  if (!user) {
    throw new Error('用户未登录');
  }

  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/attachments/stats/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取附件统计失败');
  }

  return response.json();
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    // 图片
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    // 文档
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '不支持的文件类型' };
  }

  return { valid: true };
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSize: number = 10 * 1024 * 1024): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / 1024 / 1024;
    return { valid: false, error: `文件大小不能超过 ${maxSizeMB}MB` };
  }

  return { valid: true };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

/**
 * 获取文件图标
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  } else if (mimeType === 'application/pdf') {
    return '📄';
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return '📝';
  } else if (mimeType === 'text/plain') {
    return '📃';
  } else if (mimeType === 'text/markdown') {
    return '📋';
  } else {
    return '📎';
  }
}
