/**
 * AI 辅助任务 API 路由
 */

import express from 'express';
import { query } from '../db/pool';
import { createAIAssistTask, getItemAssistStatus } from '../services/aiAssistTaskService';
import type { AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * 获取卡片的 AI 辅助状态
 * GET /api/ai-assist/status/:itemId
 */
router.get('/status/:itemId', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证卡片所有权
    const itemCheck = await query(
      'SELECT id FROM items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    const status = await getItemAssistStatus(itemId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

export default router;

