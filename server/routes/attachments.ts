/**
 * 附件上传路由
 * 处理文件上传、获取、删除等操作
 */

import express, { Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { authMiddleware, fileAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import * as attachmentService from '../services/attachmentService.js';
import * as aiVisionService from '../services/aiVisionService.js';

const router = express.Router();

// 配置 multer 用于文件上传
const storage = multer.memoryStorage(); // 使用内存存储，方便处理
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      ...attachmentService.FILE_TYPES.image.mimeTypes,
      ...attachmentService.FILE_TYPES.document.mimeTypes,
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

/**
 * POST /api/attachments/upload
 * 上传附件
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const file = req.file;
    
    // 验证文件
    const validation = attachmentService.validateFile(file.mimetype, file.size);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 保存文件
    const { storedFilename, filePath, fileType } = await attachmentService.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // 保存附件记录到数据库
    const attachment = await attachmentService.saveAttachment({
      userId,
      itemId: req.body.itemId, // 可选：关联到某个条目
      originalFilename: file.originalname,
      storedFilename,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType,
    });

    // 异步处理 AI 分析
    processAIAnalysis(attachment.id, fileType, filePath, file.originalname, userId).catch(error => {
      console.error('AI分析失败:', error);
    });

    res.json({
      success: true,
      attachment: {
        id: attachment.id,
        originalFilename: attachment.original_filename,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        mimeType: attachment.mime_type,
        createdAt: attachment.created_at,
      },
    });
  } catch (error: any) {
    console.error('文件上传失败:', error);
    res.status(500).json({ error: error.message || '文件上传失败' });
  }
});

/**
 * 异步处理 AI 分析
 */
async function processAIAnalysis(
  attachmentId: string,
  fileType: string,
  filePath: string,
  originalFilename: string,
  userId: string
) {
  try {
    const fullPath = attachmentService.getFilePath(filePath);
    let analysisResult;

    if (fileType === 'image') {
      // 图片分析
      const base64Image = await aiVisionService.imageToBase64(fullPath);
      analysisResult = await aiVisionService.analyzeImageWithAI(base64Image, undefined, userId);
    } else if (fileType === 'document') {
      // 文档分析
      let documentText = '';
      
      // 根据文件类型提取文本
      if (filePath.endsWith('.txt') || filePath.endsWith('.md')) {
        documentText = await aiVisionService.extractPlainText(fullPath);
      } else if (filePath.endsWith('.pdf')) {
        documentText = await aiVisionService.extractPDFText(fullPath);
      }
      
      if (documentText) {
        analysisResult = await aiVisionService.analyzeDocumentWithAI(
          documentText,
          originalFilename,
          userId
        );
      }
    }

    if (analysisResult) {
      // 更新附件的 AI 分析结果
      await attachmentService.updateAIAnalysis(
        attachmentId,
        analysisResult.detailedAnalysis,
        analysisResult.description,
        analysisResult.tags
      );
      
      console.log(`✅ AI分析完成: ${attachmentId}`);
    }
  } catch (error) {
    console.error('AI分析处理失败:', error);
  }
}

/**
 * GET /api/attachments/:id
 * 获取附件信息
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const attachmentId = req.params.id;

    const attachment = await attachmentService.getAttachment(attachmentId, userId);
    
    if (!attachment) {
      return res.status(404).json({ error: '附件不存在' });
    }

    res.json(attachment);
  } catch (error: any) {
    console.error('获取附件失败:', error);
    res.status(500).json({ error: error.message || '获取附件失败' });
  }
});

/**
 * GET /api/attachments/:id/file
 * 下载附件文件
 * 使用 fileAuthMiddleware 支持从 query 参数获取 token（用于 <img> 标签）
 */
router.get('/:id/file', fileAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const attachmentId = req.params.id;
    console.log(`[Attachments API] 用户 ${userId} 请求下载附件 ${attachmentId}`);

    const attachment = await attachmentService.getAttachment(attachmentId, userId);
    
    if (!attachment) {
      console.log(`[Attachments API] 附件 ${attachmentId} 不存在或无权限`);
      return res.status(404).json({ error: '附件不存在' });
    }

    const fullPath = attachmentService.getFilePath(attachment.file_path);
    console.log(`[Attachments API] 文件路径: ${fullPath}`);
    
    res.download(fullPath, attachment.original_filename, (err) => {
      if (err) {
        console.error('文件下载失败:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '文件下载失败' });
        }
      } else {
        console.log(`[Attachments API] 文件 ${attachment.original_filename} 下载成功`);
      }
    });
  } catch (error: any) {
    console.error('文件下载失败:', error);
    res.status(500).json({ error: error.message || '文件下载失败' });
  }
});

/**
 * GET /api/attachments/item/:itemId
 * 获取条目的所有附件
 */
router.get('/item/:itemId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const itemId = req.params.itemId;
    console.log(`[Attachments API] 获取条目 ${itemId} 的附件列表`);

    const attachments = await attachmentService.getItemAttachments(itemId, userId);
    console.log(`[Attachments API] 条目 ${itemId} 有 ${attachments.length} 个附件`);
    
    if (attachments.length > 0) {
      console.log(`[Attachments API] 附件类型:`, attachments.map(a => ({
        id: a.id,
        filename: a.original_filename,
        type: a.file_type,
        mime: a.mime_type
      })));
    }
    
    res.json(attachments);
  } catch (error: any) {
    console.error('获取附件列表失败:', error);
    res.status(500).json({ error: error.message || '获取附件列表失败' });
  }
});

/**
 * PATCH /api/attachments/:id/item
 * 更新附件关联的条目ID
 */
router.patch('/:id/item', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const attachmentId = req.params.id;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: '缺少 itemId 参数' });
    }

    console.log(`[Attachments API] 更新附件 ${attachmentId} 的 item_id 为 ${itemId}`);

    const success = await attachmentService.updateAttachmentItemId(attachmentId, itemId, userId);
    
    if (!success) {
      return res.status(404).json({ error: '附件不存在或无权限' });
    }

    res.json({ success: true, message: '附件已关联到条目' });
  } catch (error: any) {
    console.error('更新附件关联失败:', error);
    res.status(500).json({ error: error.message || '更新附件关联失败' });
  }
});

/**
 * DELETE /api/attachments/:id
 * 删除附件
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const attachmentId = req.params.id;

    const success = await attachmentService.deleteAttachment(attachmentId, userId);
    
    if (!success) {
      return res.status(404).json({ error: '附件不存在' });
    }

    res.json({ success: true, message: '附件已删除' });
  } catch (error: any) {
    console.error('删除附件失败:', error);
    res.status(500).json({ error: error.message || '删除附件失败' });
  }
});

/**
 * GET /api/attachments/stats/user
 * 获取用户附件统计
 */
router.get('/stats/user', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: '用户未认证' });
    }
    
    const stats = await attachmentService.getUserAttachmentStats(userId);
    
    res.json(stats);
  } catch (error: any) {
    console.error('获取附件统计失败:', error);
    res.status(500).json({ error: error.message || '获取附件统计失败' });
  }
});

export default router;
