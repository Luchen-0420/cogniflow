/**
 * AI 辅助任务服务
 * 管理 AI 主动辅助任务的创建、执行和状态跟踪
 */

import { query } from '../db/pool';
import { performAIAssistServer } from './aiAssistService';
import type { SubItem } from '../../src/types/types';

export interface AIAssistTask {
  id: string;
  item_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  task_text: string;
  search_keywords: string | null;
  assist_result: any | null;
  error_message: string | null;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  completed_at: string | null;
}

export interface CreateTaskParams {
  itemId: string;
  userId: string;
  taskText: string;
  searchKeywords?: string;
}

/**
 * 创建 AI 辅助任务
 */
export async function createAIAssistTask(params: CreateTaskParams): Promise<AIAssistTask | null> {
  try {
    // 检查是否已存在待处理或处理中的任务
    const existingTask = await query(
      `SELECT id FROM ai_assist_tasks 
       WHERE item_id = $1 AND status IN ('pending', 'processing')
       LIMIT 1`,
      [params.itemId]
    );

    if (existingTask.rows.length > 0) {
      console.log(`⚠️ 卡片 ${params.itemId} 已有待处理的任务，跳过创建`);
      return null;
    }

    const result = await query(
      `INSERT INTO ai_assist_tasks 
       (item_id, user_id, task_text, search_keywords, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [
        params.itemId,
        params.userId,
        params.taskText,
        params.searchKeywords || null,
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    console.log(`✅ 创建 AI 辅助任务: ${result.rows[0].id} for item ${params.itemId}`);
    return result.rows[0] as AIAssistTask;
  } catch (error: any) {
    console.error('❌ 创建 AI 辅助任务失败:', error);
    return null;
  }
}

/**
 * 获取待处理的任务列表
 */
export async function getPendingTasks(limit: number = 10): Promise<AIAssistTask[]> {
  try {
    const result = await query(
      `SELECT * FROM ai_assist_tasks 
       WHERE status = 'pending' 
         AND attempt_count < max_attempts
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    return result.rows as AIAssistTask[];
  } catch (error: any) {
    console.error('❌ 获取待处理任务失败:', error);
    return [];
  }
}

/**
 * 执行 AI 辅助任务
 */
export async function processAIAssistTask(taskId: string): Promise<boolean> {
  try {
    // 更新任务状态为处理中
    await query(
      `UPDATE ai_assist_tasks 
       SET status = 'processing', 
           processed_at = CURRENT_TIMESTAMP,
           attempt_count = attempt_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [taskId]
    );

    // 获取任务详情
    const taskResult = await query(
      `SELECT * FROM ai_assist_tasks WHERE id = $1`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      console.error(`❌ 任务 ${taskId} 不存在`);
      return false;
    }

    const task = taskResult.rows[0] as AIAssistTask;

    console.log(`🔄 开始处理 AI 辅助任务: ${taskId} for item ${task.item_id}`);

    // 执行 AI 辅助
    const assistResult = await performAIAssistServer(task.task_text);

    if (!assistResult || assistResult.subItems.length === 0) {
      // 如果没有结果，标记为失败
      await query(
        `UPDATE ai_assist_tasks 
         SET status = 'failed',
             error_message = 'AI 辅助未返回有效结果',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [taskId]
      );
      console.log(`⚠️ AI 辅助任务 ${taskId} 未返回有效结果`);
      return false;
    }

    // 更新卡片的 sub_items
    const currentItem = await query(
      `SELECT id, type, title, sub_items FROM items WHERE id = $1`,
      [task.item_id]
    );

    if (currentItem.rows.length === 0) {
      console.error(`❌ 卡片 ${task.item_id} 不存在，无法更新`);
      await query(
        `UPDATE ai_assist_tasks 
         SET status = 'failed',
             error_message = '卡片不存在',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [taskId]
      );
      return false;
    }

    const item = currentItem.rows[0];
    console.log(`📝 准备更新卡片 ${task.item_id} (类型: ${item.type}, 标题: ${item.title || '无标题'})`);

    let currentSubItems: SubItem[] = [];
    if (item.sub_items) {
      currentSubItems = Array.isArray(item.sub_items)
        ? item.sub_items
        : [];
    }

    const updatedSubItems = [...currentSubItems, ...assistResult.subItems];
    console.log(`📊 当前子卡片数: ${currentSubItems.length}, 新增: ${assistResult.subItems.length}, 总计: ${updatedSubItems.length}`);

    // 更新卡片
    const updateResult = await query(
      `UPDATE items 
       SET sub_items = $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, type, title`,
      [JSON.stringify(updatedSubItems), task.item_id]
    );

    if (updateResult.rows.length === 0) {
      console.error(`❌ 更新卡片 ${task.item_id} 失败`);
      await query(
        `UPDATE ai_assist_tasks 
         SET status = 'failed',
             error_message = '更新卡片失败',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [taskId]
      );
      return false;
    }

    console.log(`✅ 成功更新卡片 ${task.item_id} (${updateResult.rows[0].type})`);

    // 更新任务状态为已完成
    await query(
      `UPDATE ai_assist_tasks 
       SET status = 'completed',
           assist_result = $1::jsonb,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        JSON.stringify({
          knowledgePoints: assistResult.knowledgePoints,
          referenceInfo: assistResult.referenceInfo,
          sourceLinks: assistResult.sourceLinks,
          subItemsCount: assistResult.subItems.length,
        }),
        taskId,
      ]
    );

    console.log(`✅ AI 辅助任务 ${taskId} 完成，添加了 ${assistResult.subItems.length} 个子卡片`);
    return true;
  } catch (error: any) {
    console.error(`❌ 处理 AI 辅助任务 ${taskId} 失败:`, error);

    // 更新任务状态为失败
    await query(
      `UPDATE ai_assist_tasks 
       SET status = 'failed',
           error_message = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message || '处理失败', taskId]
    );

    return false;
  }
}

/**
 * 批量处理待处理的任务
 */
export async function processPendingTasks(limit: number = 5): Promise<number> {
  const tasks = await getPendingTasks(limit);
  let successCount = 0;

  for (const task of tasks) {
    try {
      const success = await processAIAssistTask(task.id);
      if (success) {
        successCount++;
      }
      // 添加延迟，避免 API 调用过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ 处理任务 ${task.id} 时出错:`, error);
    }
  }

  return successCount;
}

/**
 * 获取卡片的 AI 辅助任务状态
 */
export async function getItemAssistStatus(itemId: string): Promise<{
  hasAssist: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed' | null;
  completedAt: string | null;
}> {
  try {
    const result = await query(
      `SELECT status, completed_at 
       FROM ai_assist_tasks 
       WHERE item_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [itemId]
    );

    if (result.rows.length === 0) {
      return {
        hasAssist: false,
        status: null,
        completedAt: null,
      };
    }

    return {
      hasAssist: true,
      status: result.rows[0].status,
      completedAt: result.rows[0].completed_at,
    };
  } catch (error: any) {
    console.error('❌ 获取卡片辅助状态失败:', error);
    return {
      hasAssist: false,
      status: null,
      completedAt: null,
    };
  }
}

/**
 * 取消/删除指定卡片的所有 AI 辅助任务记录
 */
export async function cancelAssistTasksForItem(itemId: string): Promise<void> {
  await query(
    'DELETE FROM ai_assist_tasks WHERE item_id = $1',
    [itemId]
  );
  console.log(`🗑️ 已取消卡片 ${itemId} 的 AI 辅助任务`);
}

