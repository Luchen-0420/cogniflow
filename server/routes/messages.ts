/**
 * Messages API Routes
 * 处理留言板相关的请求
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * 获取留言列表（按时间降序）
 * GET /api/messages
 * 查询参数: ?page=1&limit=20&parent_id=xxx (可选，用于获取回复)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', parent_id } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let sql = `
      SELECT 
        m.id,
        m.user_id,
        m.username,
        m.content,
        m.parent_id,
        m.like_count,
        m.dislike_count,
        m.created_at,
        m.updated_at,
        COUNT(DISTINCT r.id) FILTER (WHERE r.parent_id = m.id) as reply_count
      FROM messages m
      LEFT JOIN messages r ON r.parent_id = m.id
      WHERE m.parent_id IS NULL
    `;
    const params: any[] = [];

    if (parent_id) {
      sql = `
        SELECT 
          m.id,
          m.user_id,
          m.username,
          m.content,
          m.parent_id,
          m.like_count,
          m.dislike_count,
          m.created_at,
          m.updated_at,
          0 as reply_count
        FROM messages m
        WHERE m.parent_id = $1
        ORDER BY m.created_at ASC
        LIMIT $2 OFFSET $3
      `;
      params.push(parent_id, limitNum, offset);
    } else {
      sql += ` 
        GROUP BY m.id 
        ORDER BY m.created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      params.push(limitNum, offset);
    }

    const result = await query(sql, params);

    res.json({
      messages: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.rows.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 创建留言
 * POST /api/messages
 * 需要认证
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content, parent_id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '留言内容不能为空' });
    }

    // 获取用户信息
    const userResult = await query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const username = userResult.rows[0].username;

    // 如果是回复，验证父留言是否存在
    if (parent_id) {
      const parentResult = await query(
        'SELECT id FROM messages WHERE id = $1',
        [parent_id]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: '父留言不存在' });
      }
    }

    // 创建留言
    const result = await query(
      `INSERT INTO messages (user_id, username, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, username, content, parent_id, like_count, dislike_count, created_at, updated_at`,
      [userId, username, content.trim(), parent_id || null]
    );

    res.status(201).json({
      message: '留言创建成功',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取留言详情（包含回复）
 * GET /api/messages/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 获取主留言
    const messageResult = await query(
      `SELECT 
        m.id,
        m.user_id,
        m.username,
        m.content,
        m.parent_id,
        m.like_count,
        m.dislike_count,
        m.created_at,
        m.updated_at
      FROM messages m
      WHERE m.id = $1`,
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' });
    }

    const message = messageResult.rows[0];

    // 获取回复
    const repliesResult = await query(
      `SELECT 
        m.id,
        m.user_id,
        m.username,
        m.content,
        m.parent_id,
        m.like_count,
        m.dislike_count,
        m.created_at,
        m.updated_at
      FROM messages m
      WHERE m.parent_id = $1
      ORDER BY m.created_at ASC`,
      [id]
    );

    res.json({
      message: {
        ...message,
        replies: repliesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 点赞/点踩留言
 * POST /api/messages/:id/reaction
 * 需要认证
 */
router.post('/:id/reaction', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reaction_type } = req.body; // 'like' 或 'dislike'
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    if (!['like', 'dislike'].includes(reaction_type)) {
      return res.status(400).json({ error: '无效的反应类型' });
    }

    // 检查留言是否存在
    const messageResult = await query(
      'SELECT id FROM messages WHERE id = $1',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' });
    }

    // 检查是否已有反应
    const existingReaction = await query(
      'SELECT id, reaction_type FROM message_reactions WHERE message_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingReaction.rows.length > 0) {
      const existing = existingReaction.rows[0];
      
      // 如果反应类型相同，则取消反应
      if (existing.reaction_type === reaction_type) {
        await query(
          'DELETE FROM message_reactions WHERE id = $1',
          [existing.id]
        );
        
        res.json({
          message: '已取消反应',
          reaction_type: null
        });
        return;
      } else {
        // 如果反应类型不同，则更新反应
        await query(
          'UPDATE message_reactions SET reaction_type = $1 WHERE id = $2',
          [reaction_type, existing.id]
        );
        
        res.json({
          message: '反应已更新',
          reaction_type
        });
        return;
      }
    }

    // 创建新反应
    await query(
      `INSERT INTO message_reactions (message_id, user_id, reaction_type)
       VALUES ($1, $2, $3)`,
      [id, userId, reaction_type]
    );

    res.json({
      message: '反应已添加',
      reaction_type
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取用户对留言的反应状态
 * GET /api/messages/:id/reaction
 * 需要认证
 */
router.get('/:id/reaction', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    const result = await query(
      'SELECT reaction_type FROM message_reactions WHERE message_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      reaction_type: result.rows.length > 0 ? result.rows[0].reaction_type : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 删除留言（仅创建者或管理员）
 * DELETE /api/messages/:id
 * 需要认证
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }

    // 获取留言信息
    const messageResult = await query(
      'SELECT user_id FROM messages WHERE id = $1',
      [id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: '留言不存在' });
    }

    const messageUserId = messageResult.rows[0].user_id;

    // 检查权限（创建者或管理员）
    if (messageUserId !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: '无权删除此留言' });
    }

    // 删除留言（级联删除会自动删除回复和反应）
    await query('DELETE FROM messages WHERE id = $1', [id]);

    res.json({
      message: '留言已删除'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

