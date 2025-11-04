/**
 * 附件上传路由
 * 处理文件上传、获取、删除等操作
 */

import express, { Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
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
    processAIAnalysis(attachment.id, fileType, filePath, file.originalname).catch(error => {
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
  originalFilename: string
) {
  try {
    const fullPath = attachmentService.getFilePath(filePath);
    let analysisResult;

    if (fileType === 'image') {
      // 图片分析
      const base64Image = await aiVisionService.imageToBase64(fullPath);
      analysisResult = await aiVisionService.analyzeImageWithAI(base64Image);
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
          originalFilename
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
 */
router.get('/:id/file', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    const fullPath = attachmentService.getFilePath(attachment.file_path);
    
    res.download(fullPath, attachment.original_filename, (err) => {
      if (err) {
        console.error('文件下载失败:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '文件下载失败' });
        }
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

    const attachments = await attachmentService.getItemAttachments(itemId, userId);
    
    res.json(attachments);
  } catch (error: any) {
    console.error('获取附件列表失败:', error);
    res.status(500).json({ error: error.message || '获取附件列表失败' });
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
