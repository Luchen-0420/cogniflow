/**
 * AI 辅助任务调度器
 * 定时轮询待处理的任务并执行
 */

import { processPendingTasks } from './aiAssistTaskService';

let schedulerInterval: NodeJS.Timeout | null = null;
const POLL_INTERVAL = 2 * 60 * 1000; // 2分钟（测试用，原为30分钟）

/**
 * 启动定时调度器
 */
export function startAIAssistScheduler(): void {
  if (schedulerInterval) {
    console.log('⚠️ AI 辅助调度器已在运行');
    return;
  }

  console.log('🚀 启动 AI 辅助任务调度器（每2分钟检查一次）');

  // 立即执行一次
  processPendingTasks(5).then((count) => {
    console.log(`✅ 初始处理完成，成功处理 ${count} 个任务`);
  });

  // 设置定时执行
  schedulerInterval = setInterval(async () => {
    console.log('🔄 定时检查待处理的 AI 辅助任务...');
    const count = await processPendingTasks(5);
    if (count > 0) {
      console.log(`✅ 定时处理完成，成功处理 ${count} 个任务`);
    }
  }, POLL_INTERVAL);
}

/**
 * 停止定时调度器
 */
export function stopAIAssistScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 AI 辅助任务调度器已停止');
  }
}

/**
 * 手动触发一次任务处理（用于测试或立即执行）
 */
export async function triggerTaskProcessing(): Promise<number> {
  console.log('🔧 手动触发 AI 辅助任务处理...');
  const count = await processPendingTasks(10);
  console.log(`✅ 手动处理完成，成功处理 ${count} 个任务`);
  return count;
}

