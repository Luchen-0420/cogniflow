import { query } from '../db/index.js';
import { sendReminderEmail, type ReminderEmailData } from './emailService.js';

/**
 * 日程提醒服务
 * 定期检查即将开始的日程（5分钟前），并发送邮件提醒
 */

// 提醒提前时间（分钟）
const REMINDER_MINUTES_BEFORE = 5;

// 检查间隔（毫秒），建议1分钟检查一次
const CHECK_INTERVAL = 60 * 1000; // 1分钟

interface UpcomingEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time?: Date;
  user_email: string;
  reminder_time: Date;
}

/**
 * 查询需要发送提醒的日程
 * 条件：
 * 1. 日程类型为 event
 * 2. 开始时间在未来5-6分钟之间（避免漏掉）
 * 3. 未删除、未归档
 * 4. 用户启用了邮件通知
 * 5. 该日程在这个提醒时间点还没有发送过提醒
 */
async function getUpcomingEvents(): Promise<UpcomingEvent[]> {
  const sql = `
    SELECT 
      i.id,
      i.user_id,
      i.title,
      i.description,
      i.start_time,
      i.end_time,
      u.email as user_email,
      (i.start_time - INTERVAL '${REMINDER_MINUTES_BEFORE} minutes') as reminder_time
    FROM items i
    INNER JOIN users u ON i.user_id = u.id
    INNER JOIN user_settings us ON u.id = us.user_id
    WHERE 
      i.type = 'event'
      AND i.start_time IS NOT NULL
      AND i.deleted_at IS NULL
      AND i.archived_at IS NULL
      AND u.email IS NOT NULL
      AND us.email_notifications = true
      AND i.start_time > NOW()
      AND i.start_time <= NOW() + INTERVAL '${REMINDER_MINUTES_BEFORE + 1} minutes'
      AND NOT EXISTS (
        SELECT 1 FROM reminder_logs rl
        WHERE rl.item_id = i.id
        AND rl.reminder_time = (i.start_time - INTERVAL '${REMINDER_MINUTES_BEFORE} minutes')
        AND rl.status = 'sent'
      )
    ORDER BY i.start_time ASC
  `;

  try {
    const result = await query(sql);
    return result.rows as UpcomingEvent[];
  } catch (error) {
    console.error('❌ 查询即将到期的日程失败:', error);
    return [];
  }
}

/**
 * 记录提醒发送日志
 */
async function logReminder(
  itemId: string,
  userId: string,
  reminderTime: Date,
  emailTo: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  const sql = `
    INSERT INTO reminder_logs (
      item_id,
      user_id,
      reminder_time,
      email_to,
      status,
      error_message
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (item_id, reminder_time) 
    DO UPDATE SET
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message,
      sent_at = CURRENT_TIMESTAMP
  `;

  try {
    await query(sql, [itemId, userId, reminderTime, emailTo, status, errorMessage || null]);
  } catch (error) {
    console.error('❌ 记录提醒日志失败:', error);
  }
}

/**
 * 处理单个日程的提醒发送
 */
async function processEventReminder(event: UpcomingEvent): Promise<void> {
  console.log(`📧 准备发送提醒: ${event.title} (${event.user_email})`);

  const emailData: ReminderEmailData = {
    to: event.user_email,
    title: event.title,
    startTime: new Date(event.start_time),
    endTime: event.end_time ? new Date(event.end_time) : undefined,
    description: event.description,
  };

  try {
    const success = await sendReminderEmail(emailData);
    
    if (success) {
      await logReminder(
        event.id,
        event.user_id,
        event.reminder_time,
        event.user_email,
        'sent'
      );
      console.log(`✅ 提醒已发送: ${event.title}`);
    } else {
      await logReminder(
        event.id,
        event.user_id,
        event.reminder_time,
        event.user_email,
        'failed',
        '邮件发送失败'
      );
      console.log(`❌ 提醒发送失败: ${event.title}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    await logReminder(
      event.id,
      event.user_id,
      event.reminder_time,
      event.user_email,
      'failed',
      errorMessage
    );
    console.error(`❌ 处理提醒时出错: ${event.title}`, error);
  }
}

/**
 * 执行一次提醒检查
 */
export async function checkAndSendReminders(): Promise<void> {
  try {
    const events = await getUpcomingEvents();
    
    if (events.length === 0) {
      console.log('⏰ 暂无需要发送提醒的日程');
      return;
    }

    console.log(`📋 发现 ${events.length} 个需要提醒的日程`);

    // 串行处理每个事件，避免邮件服务器负载过高
    for (const event of events) {
      await processEventReminder(event);
      // 添加短暂延迟，避免频繁发送邮件
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('❌ 检查提醒时出错:', error);
  }
}

/**
 * 启动提醒检查定时任务
 */
export function startReminderScheduler(): NodeJS.Timeout {
  console.log(`🚀 提醒服务已启动，每 ${CHECK_INTERVAL / 1000} 秒检查一次`);
  console.log(`⏰ 提醒时间：日程开始前 ${REMINDER_MINUTES_BEFORE} 分钟`);

  // 立即执行一次
  checkAndSendReminders();

  // 设置定时任务
  const interval = setInterval(() => {
    checkAndSendReminders();
  }, CHECK_INTERVAL);

  return interval;
}

/**
 * 停止提醒检查定时任务
 */
export function stopReminderScheduler(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log('🛑 提醒服务已停止');
}

/**
 * 手动触发提醒检查（用于测试）
 */
export async function triggerReminderCheck(): Promise<{ success: boolean; count: number }> {
  try {
    const events = await getUpcomingEvents();
    
    for (const event of events) {
      await processEventReminder(event);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success: true, count: events.length };
  } catch (error) {
    console.error('❌ 手动触发提醒检查失败:', error);
    return { success: false, count: 0 };
  }
}
