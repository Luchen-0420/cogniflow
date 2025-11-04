/**
 * 附件上传服务
 * 处理文件上传、存储、AI分析等功能
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pool from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上传目录配置 - 支持环境变量配置
// 优先使用环境变量，否则使用默认的相对路径
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR 
  ? (path.isAbsolute(process.env.UPLOAD_DIR) 
      ? process.env.UPLOAD_DIR 
      : path.resolve(process.cwd(), process.env.UPLOAD_DIR))
  : path.join(__dirname, '../../uploads');

const THUMBNAIL_DIR = path.join(UPLOAD_BASE_DIR, 'thumbnails');

console.log('📁 [AttachmentService] 上传目录配置:');
console.log('   UPLOAD_BASE_DIR:', UPLOAD_BASE_DIR);
console.log('   THUMBNAIL_DIR:', THUMBNAIL_DIR);
console.log('   当前工作目录:', process.cwd());
console.log('   环境变量 UPLOAD_DIR:', process.env.UPLOAD_DIR || '(未设置)');

// 确保目录存在
async function ensureDirectories() {
  await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true });
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
  
  // 按类型创建子目录
  const subdirs = ['images', 'documents', 'videos', 'audios', 'others'];
  for (const subdir of subdirs) {
    await fs.mkdir(path.join(UPLOAD_BASE_DIR, subdir), { recursive: true });
  }
}

// 初始化目录
ensureDirectories().catch(console.error);

/**
 * 文件类型配置
 */
export const FILE_TYPES = {
  image: {
    folder: 'images',
    mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  document: {
    folder: 'documents',
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  video: {
    folder: 'videos',
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  audio: {
    folder: 'audios',
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * 根据 MIME 类型获取文件类型
 */
export function getFileType(mimeType: string): string {
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (config.mimeTypes.includes(mimeType)) {
      return type;
    }
  }
  return 'other';
}

/**
 * 生成唯一的文件名
 */
export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * 验证文件
 */
export function validateFile(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  const fileType = getFileType(mimeType);
  
  if (fileType === 'other') {
    return { valid: false, error: '不支持的文件类型' };
  }
  
  const config = FILE_TYPES[fileType as keyof typeof FILE_TYPES];
  if (fileSize > config.maxSize) {
    return { valid: false, error: `文件大小超过限制 (${config.maxSize / 1024 / 1024}MB)` };
  }
  
  return { valid: true };
}

/**
 * 保存文件到磁盘
 */
export async function saveFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ storedFilename: string; filePath: string; fileType: string }> {
  const fileType = getFileType(mimeType);
  const folder = FILE_TYPES[fileType as keyof typeof FILE_TYPES]?.folder || 'others';
  const storedFilename = generateUniqueFilename(originalFilename);
  const filePath = path.join(UPLOAD_BASE_DIR, folder, storedFilename);
  
  await fs.writeFile(filePath, buffer);
  
  return {
    storedFilename,
    filePath: path.join(folder, storedFilename), // 相对路径，用于存储到数据库
    fileType,
  };
}

/**
 * 保存附件记录到数据库
 */
export async function saveAttachment(data: {
  userId: string;
  itemId?: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  width?: number;
  height?: number;
  duration?: number;
}): Promise<any> {
  const query = `
    INSERT INTO attachments (
      user_id, item_id, original_filename, stored_filename, file_path,
      file_size, mime_type, file_type, width, height, duration,
      status, upload_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'completed')
    RETURNING *
  `;
  
  const values = [
    data.userId,
    data.itemId || null,
    data.originalFilename,
    data.storedFilename,
    data.filePath,
    data.fileSize,
    data.mimeType,
    data.fileType,
    data.width || null,
    data.height || null,
    data.duration || null,
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * 获取附件信息
 */
export async function getAttachment(attachmentId: string, userId: string): Promise<any> {
  const query = `
    SELECT * FROM attachments
    WHERE id = $1 AND user_id = $2
  `;
  
  const result = await pool.query(query, [attachmentId, userId]);
  return result.rows[0];
}

/**
 * 获取条目的所有附件
 */
export async function getItemAttachments(itemId: string, userId: string): Promise<any[]> {
  const query = `
    SELECT * FROM attachments
    WHERE item_id = $1 AND user_id = $2
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [itemId, userId]);
  return result.rows;
}

/**
 * 更新附件的 AI 分析结果
 */
export async function updateAIAnalysis(
  attachmentId: string,
  aiAnalysis: any,
  aiDescription?: string,
  aiTags?: string[]
): Promise<void> {
  const query = `
    UPDATE attachments
    SET 
      ai_analysis = $1,
      ai_description = $2,
      ai_tags = $3,
      ai_processed_at = CURRENT_TIMESTAMP,
      status = 'completed',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `;
  
  await pool.query(query, [
    JSON.stringify(aiAnalysis),
    aiDescription || null,
    aiTags || [],
    attachmentId,
  ]);
}

/**
 * 更新附件关联的条目ID
 */
export async function updateAttachmentItemId(
  attachmentId: string,
  itemId: string,
  userId: string
): Promise<boolean> {
  const query = `
    UPDATE attachments
    SET 
      item_id = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND user_id = $3
  `;
  
  const result = await pool.query(query, [itemId, attachmentId, userId]);
  return (result.rowCount || 0) > 0;
}

/**
 * 删除附件
 */
export async function deleteAttachment(attachmentId: string, userId: string): Promise<boolean> {
  // 获取附件信息
  const attachment = await getAttachment(attachmentId, userId);
  if (!attachment) {
    return false;
  }
  
  // 删除文件
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, attachment.file_path);
    await fs.unlink(fullPath);
    
    // 如果有缩略图，也删除
    if (attachment.thumbnail_path) {
      const thumbnailPath = path.join(UPLOAD_BASE_DIR, attachment.thumbnail_path);
      await fs.unlink(thumbnailPath).catch(() => {});
    }
  } catch (error) {
    console.error('删除文件失败:', error);
  }
  
  // 从数据库删除记录
  const query = `DELETE FROM attachments WHERE id = $1 AND user_id = $2`;
  await pool.query(query, [attachmentId, userId]);
  
  return true;
}

/**
 * 获取文件的实际路径
 */
export function getFilePath(relativePath: string): string {
  const fullPath = path.join(UPLOAD_BASE_DIR, relativePath);
  console.log(`[AttachmentService] getFilePath:`, {
    UPLOAD_BASE_DIR,
    relativePath,
    fullPath
  });
  return fullPath;
}

/**
 * 获取用户的附件统计
 */
export async function getUserAttachmentStats(userId: string): Promise<any> {
  const query = `
    SELECT * FROM user_attachment_stats
    WHERE user_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0] || {
    user_id: userId,
    total_attachments: 0,
    image_count: 0,
    document_count: 0,
    total_storage_used: 0,
    last_upload_at: null,
  };
}
