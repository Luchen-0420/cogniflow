/**
 * Items API Routes
 * 处理所有条目相关的请求
 */

import { Router } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest } from '../middleware/auth.js';
import { cancelAssistTasksForItem } from '../services/aiAssistTaskService.js';

const router = Router();

/**
 * 检测时间冲突的辅助函数
 * 检查给定的时间范围是否与用户的其他事项冲突
 */
async function detectTimeConflicts(
  userId: string,
  startTime: string | null,
  endTime: string | null,
  excludeItemId?: string
): Promise<boolean> {
  // 如果没有时间信息，不存在冲突
  if (!startTime || !endTime) {
    return false;
  }

  try {
    // 查询与给定时间范围重叠的事项
    // 只检测"活跃"的事项：未删除、未归档、未完成、未过期
    let sql = `
      SELECT id, title, start_time, end_time
      FROM items
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND archived_at IS NULL
        AND status != 'completed'
        AND end_time >= CURRENT_TIMESTAMP
        AND type = 'event'
        AND start_time IS NOT NULL
        AND end_time IS NOT NULL
        AND (
          -- 检测各种时间重叠情况
          (start_time >= $2::timestamptz AND start_time < $3::timestamptz) OR
          (end_time > $2::timestamptz AND end_time <= $3::timestamptz) OR
          (start_time <= $2::timestamptz AND end_time >= $3::timestamptz) OR
          ($2::timestamptz <= start_time AND $3::timestamptz >= end_time)
        )
    `;
    
    const params: any[] = [userId, startTime, endTime];
    
    // 如果是更新操作，排除当前项
    if (excludeItemId) {
      sql += ` AND id != $4`;
      params.push(excludeItemId);
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  } catch (error) {
    console.error('检测时间冲突失败:', error);
    return false;
  }
}

/**
 * 更新所有相关事项的冲突状态
 * 当事项被创建、更新或删除时调用
 * 只对"活跃"的事项进行冲突检测：未删除、未归档、未完成、未过期
 */
async function updateConflictStatus(userId: string): Promise<void> {
  try {
    // 首先重置所有事项的冲突状态
    await query(
      `UPDATE items SET has_conflict = false 
       WHERE user_id = $1 AND type = 'event' AND deleted_at IS NULL`,
      [userId]
    );

    // 查询所有"活跃"的有时间信息的事项
    // 只包括：未删除、未归档、未完成、未过期的事项
    const result = await query(
      `SELECT id, start_time, end_time
       FROM items
       WHERE user_id = $1
         AND type = 'event'
         AND deleted_at IS NULL
         AND archived_at IS NULL
         AND status != 'completed'
         AND end_time >= CURRENT_TIMESTAMP
         AND start_time IS NOT NULL
         AND end_time IS NOT NULL
       ORDER BY start_time`,
      [userId]
    );

    const events = result.rows;
    const conflictIds = new Set<string>();

    // 检测每对事项之间的冲突
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = new Date(event1.start_time).getTime();
        const end1 = new Date(event1.end_time).getTime();
        const start2 = new Date(event2.start_time).getTime();
        const end2 = new Date(event2.end_time).getTime();

        // 检测冲突
        const hasConflict = (
          (start1 >= start2 && start1 < end2) ||
          (end1 > start2 && end1 <= end2) ||
          (start1 <= start2 && end1 >= end2) ||
          (start2 <= start1 && end2 >= end1)
        );

        if (hasConflict) {
          conflictIds.add(event1.id);
          conflictIds.add(event2.id);
        }
      }
    }

    // 更新有冲突的事项
    if (conflictIds.size > 0) {
      const ids = Array.from(conflictIds);
      await query(
        `UPDATE items SET has_conflict = true 
         WHERE id = ANY($1::uuid[])`,
        [ids]
      );
    }
  } catch (error) {
    console.error('更新冲突状态失败:', error);
  }
}

/**
 * 获取条目列表
 * GET /api/items?type=task&status=pending&archived=false
 */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { type, status, tag, archived } = req.query;
    const userId = req.user?.id; // 从认证中间件获取

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    let sql = 'SELECT * FROM items WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (tag) {
      sql += ` AND $${paramIndex++} = ANY(tags)`;
      params.push(tag);
    }

    if (archived === 'false') {
      sql += ' AND archived_at IS NULL';
    } else if (archived === 'true') {
      sql += ' AND archived_at IS NOT NULL';
    }

    sql += ' AND deleted_at IS NULL';
    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * 创建条目
 * POST /api/items
 */
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const {
      raw_text,
      type,
      title,
      description,
      due_date,
      priority,
      status,
      tags,
      entities,
      url,
      url_title,
      url_summary,
      url_thumbnail,
      url_fetched_at,
      start_time,
      end_time,
      recurrence_rule,
      recurrence_end_date,
      master_item_id,
      is_master
    } = req.body;

    const sql = `
      INSERT INTO items (
        user_id, raw_text, type, title, description, due_date, priority, status,
        tags, entities, url, url_title, url_summary, url_thumbnail, url_fetched_at,
        start_time, end_time, recurrence_rule, recurrence_end_date, master_item_id, is_master
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `;

    // 处理时间字符串，确保 PostgreSQL 正确解析为本地时间
    // 如果时间字符串不包含时区信息，PostgreSQL 会将其当作服务器时区
    // 我们需要明确告诉它这是本地时间（不是 UTC）
    const params = [
      userId, raw_text, type, title, description, due_date, priority || 'medium',
      status || 'pending', tags || [], entities || {}, url, url_title,
      url_summary, url_thumbnail, url_fetched_at, start_time, end_time,
      recurrence_rule, recurrence_end_date, master_item_id, is_master || false
    ];

    const result = await query(sql, params);
    
    // 如果是事项类型且有时间信息，更新冲突状态
    if (type === 'event' && start_time && end_time) {
      await updateConflictStatus(userId);
    }
    
    // 检查是否需要创建 AI 辅助任务
    if (raw_text && result.rows.length > 0) {
      const { shouldTriggerAssist } = await import('../../src/utils/aiAssist.js');
      const { createAIAssistTask } = await import('../services/aiAssistTaskService.js');
      
      if (shouldTriggerAssist(raw_text)) {
        const { extractSearchKeywords } = await import('../../src/utils/aiAssist.js');
        const searchKeywords = extractSearchKeywords(raw_text);
        
        // 异步创建任务，不阻塞响应
        createAIAssistTask({
          itemId: result.rows[0].id,
          userId,
          taskText: raw_text,
          searchKeywords,
        }).catch((error) => {
          console.error('创建 AI 辅助任务失败:', error);
        });
      }
    }
    
    // 如果条目状态被标记为完成，取消 AI 辅助任务
    if (req.body.status && typeof req.body.status === 'string' && req.body.status.toLowerCase() === 'completed') {
      await cancelAssistTasksForItem(id);
    }

    // 记录活动日志
    await query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'create_item', type, result.rows[0].id, { title }]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * 查询条目
 * POST /api/items/query
 */
router.post('/query', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { searchText, types, statuses, tags } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    let sql = 'SELECT * FROM items WHERE user_id = $1 AND deleted_at IS NULL';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (searchText) {
      sql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR raw_text ILIKE $${paramIndex++})`;
      params.push(`%${searchText}%`);
    }

    if (types && types.length > 0) {
      sql += ` AND type = ANY($${paramIndex++})`;
      params.push(types);
    }

    if (statuses && statuses.length > 0) {
      sql += ` AND status = ANY($${paramIndex++})`;
      params.push(statuses);
    }

    if (tags && tags.length > 0) {
      sql += ` AND tags && $${paramIndex++}`;
      params.push(tags);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * 搜索条目
 * GET /api/items/search?q=关键词
 */
router.get('/search', async (req: AuthRequest, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: '缺少搜索关键词' });
    }

    // 使用全文搜索
    const sql = `
      SELECT * FROM items
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND archived_at IS NULL
        AND (
          title ILIKE $2 OR
          description ILIKE $2 OR
          raw_text ILIKE $2 OR
          $3 = ANY(tags)
        )
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const searchPattern = `%${q}%`;
    const result = await query(sql, [userId, searchPattern, q]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * 获取日历条目
 * GET /api/items/calendar?start=2025-01-01&end=2025-01-31
 */
router.get('/calendar', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const sql = `
      SELECT * FROM items
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND (
          (due_date BETWEEN $2 AND $3)
          OR (start_time BETWEEN $2 AND $3)
        )
      ORDER BY COALESCE(start_time, due_date)
    `;

    const result = await query(sql, [userId, start, end]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * 获取标签统计
 * GET /api/items/tags/stats
 */
router.get('/tags/stats', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const sql = `
      SELECT 
        unnest(tags) as tag, 
        COUNT(*) as count,
        MAX(updated_at) as last_used
      FROM items
      WHERE user_id = $1 AND deleted_at IS NULL
      GROUP BY tag
      ORDER BY count DESC
    `;

    const result = await query(sql, [userId]);
    
    // 返回数组格式，符合 TagStats[] 接口
    const stats = result.rows.map(row => ({
      tag: row.tag,
      count: parseInt(row.count),
      lastUsed: row.last_used
    }));

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * 获取历史记录
 * GET /api/items/history?start=2025-01-01&end=2025-01-31
 */
router.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 为日期添加时间部分以确保完整的日期范围
    const startDateTime = `${start} 00:00:00`;
    const endDateTime = `${end} 23:59:59`;

    const sql = `
      SELECT * FROM items
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND created_at BETWEEN $2 AND $3
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [userId, startDateTime, endDateTime]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * 获取单个条目
 * GET /api/items/:id
 * 注意：这个路由必须放在所有具体路径的路由之后
 */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const result = await query(
      'SELECT * FROM items WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '条目不存在' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * 更新条目
 * PUT /api/items/:id
 */
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 构建动态更新 SQL
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'due_date', 'priority', 'status', 'tags',
      'entities', 'url', 'url_title', 'url_summary', 'url_thumbnail',
      'start_time', 'end_time', 'recurrence_rule', 'recurrence_end_date',
      'collection_type', 'sub_items'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // 对于 JSONB 字段，使用类型转换确保正确解析
        if (field === 'sub_items' || field === 'entities') {
          updates.push(`${field} = $${paramIndex}::jsonb`);
          // 确保数据是有效的 JSON 字符串
          const value = req.body[field];
          if (typeof value === 'string') {
            // 如果已经是字符串，验证是否为有效 JSON
            try {
              JSON.parse(value);
              params.push(value);
            } catch {
              // 如果不是有效 JSON，尝试序列化
              params.push(JSON.stringify(value));
            }
          } else {
            // 如果是对象/数组，序列化为 JSON
            params.push(JSON.stringify(value));
          }
        } else {
          updates.push(`${field} = $${paramIndex}`);
          params.push(req.body[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    params.push(id, userId);
    const sql = `
      UPDATE items
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '条目不存在' });
    }

    // 如果更新了时间信息或者是事项类型，重新检测冲突
    // 包括 start_time、end_time 和 due_date（对于事件类型，due_date 可能影响 end_time）
    if (result.rows[0].type === 'event' && (
      req.body.start_time !== undefined || 
      req.body.end_time !== undefined || 
      req.body.due_date !== undefined
    )) {
      await updateConflictStatus(userId);
      // 重新获取更新后的数据（包含最新的冲突状态）
      const updatedResult = await query(
        'SELECT * FROM items WHERE id = $1',
        [id]
      );
      if (updatedResult.rows.length > 0) {
        result.rows[0] = updatedResult.rows[0];
      }
    }

    // 记录活动日志
    await query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'update_item', result.rows[0].type, id, { fields: Object.keys(req.body) }]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * 删除条目（软删除）
 * DELETE /api/items/:id
 */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const result = await query(
      'UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '条目不存在' });
    }

    // 如果删除的是事项类型，更新冲突状态
    if (result.rows[0].type === 'event') {
      await updateConflictStatus(userId);
    }

    // 删除条目时，清理 AI 辅助任务记录
    await cancelAssistTasksForItem(id);

    // 记录活动日志
    await query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, 'delete_item', result.rows[0].type, id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * 归档条目
 * POST /api/items/:id/archive
 */
router.post('/:id/archive', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const result = await query(
      'UPDATE items SET archived_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '条目不存在' });
    }

    // 如果归档的是事项类型，更新冲突状态
    if (result.rows[0].type === 'event') {
      await updateConflictStatus(userId);
    }

    // 归档后取消 AI 辅助任务
    await cancelAssistTasksForItem(id);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * 取消归档
 * POST /api/items/:id/unarchive
 */
router.post('/:id/unarchive', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const result = await query(
      'UPDATE items SET archived_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '条目不存在' });
    }

    // 如果恢复归档的是事项类型，更新冲突状态
    if (result.rows[0].type === 'event') {
      await updateConflictStatus(userId);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
