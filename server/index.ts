/**
 * Express API Server for CogniFlow
 * 连接 PostgreSQL 数据库，为前端提供 RESTful API
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/pool.js';
import itemsRouter from './routes/items.js';
import usersRouter from './routes/users.js';
import templatesRouter from './routes/templates.js';
import attachmentsRouter from './routes/attachments.js';
import { authMiddleware } from './middleware/auth.js';
import { startReminderScheduler, stopReminderScheduler, triggerReminderCheck } from './services/reminderService.js';
import { verifyEmailConfig, sendTestEmail } from './services/emailService.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ status: 'unhealthy', error: error?.message || 'Unknown error' });
  }
});

// API 路由
app.get('/api', (req, res) => {
  res.json({
    message: 'CogniFlow API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      items: '/api/items/*',
      users: '/api/users/*',
      attachments: '/api/attachments/*',
      templates: '/api/templates/*',
      tags: '/api/tags/*',
      statistics: '/api/statistics/*'
    }
  });
});

// 公开路由（不需要认证）
app.use('/api/auth', usersRouter); // 注册和登录

// 需要认证的路由
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/templates', authMiddleware, templatesRouter);
app.use('/api/attachments', attachmentsRouter);

// 提醒服务测试路由（需要认证）
app.post('/api/reminders/test', authMiddleware, async (req, res) => {
  try {
    const result = await triggerReminderCheck();
    res.json({
      success: result.success,
      message: `已手动触发提醒检查，发送了 ${result.count} 个提醒`,
      count: result.count
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '触发提醒检查失败' });
  }
});

// 邮件测试路由（需要认证）
app.post('/api/reminders/test-email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }
    const success = await sendTestEmail(email);
    res.json({
      success,
      message: success ? '测试邮件已发送' : '测试邮件发送失败'
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '发送测试邮件失败' });
  }
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 错误:', err);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 启动提醒服务
let reminderScheduler: NodeJS.Timeout | null = null;

// 启动服务器
app.listen(PORT, async () => {
  console.log('🚀 CogniFlow API Server 已启动');
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🌐 前端地址: ${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}`);
  console.log(`🗄️  数据库: PostgreSQL`);
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📋 可用端点:');
  console.log('  - POST /api/auth/register  (注册)');
  console.log('  - POST /api/auth/login     (登录)');
  console.log('  - GET  /api/users/me       (获取用户信息)');
  console.log('  - GET  /api/items          (获取条目列表)');
  console.log('  - POST /api/items          (创建条目)');
  console.log('  - GET  /health             (健康检查)');
  console.log('');
  
  // 验证并启动邮件提醒服务
  console.log('📧 正在初始化邮件提醒服务...');
  const emailConfigValid = await verifyEmailConfig();
  
  if (emailConfigValid) {
    reminderScheduler = startReminderScheduler();
    console.log('✅ 邮件提醒服务已启动');
    console.log('  - POST /api/reminders/test        (手动触发提醒检查)');
    console.log('  - POST /api/reminders/test-email  (发送测试邮件)');
  } else {
    console.log('⚠️  邮件提醒服务未启动（邮件配置无效）');
    console.log('   请在 server/.env 中配置 EMAIL_USER 和 EMAIL_PASSWORD');
  }
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  
  // 停止提醒服务
  if (reminderScheduler) {
    stopReminderScheduler(reminderScheduler);
  }
  
  await pool.end();
  process.exit(0);
});

export default app;
