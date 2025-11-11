# 日程提醒功能配置指南

## 功能概述

CogniFlow 现在支持在日程开始前 5 分钟自动发送邮件提醒。当用户创建的日程（event 类型卡片）即将开始时，系统会自动向用户的注册邮箱发送提醒邮件。

## 功能特性

- ⏰ **提前提醒**：日程开始前 5 分钟自动发送提醒
- 📧 **邮件通知**：通过邮件发送详细的日程信息
- 🚫 **防重复**：同一日程同一时间点只会发送一次提醒
- 🎨 **精美模板**：使用精心设计的 HTML 邮件模板
- 📊 **日志记录**：完整记录每次提醒的发送状态

## 配置步骤

### 1. 获取 QQ 邮箱授权码

1. 登录 [QQ 邮箱](https://mail.qq.com/)
2. 点击顶部的 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **IMAP/SMTP服务** 或 **POP3/SMTP服务**
5. 点击 **生成授权码**，按照提示发送短信
6. **保存生成的授权码**（这不是你的 QQ 密码！）

### 2. 配置环境变量

编辑 `server/.env` 文件，添加以下配置：

```bash
# 邮件提醒配置
EMAIL_USER=646184101@qq.com
EMAIL_PASSWORD=你的授权码
```

**重要提示**：
- `EMAIL_USER` 是发件人邮箱，已设置为 `646184101@qq.com`
- `EMAIL_PASSWORD` 是 QQ 邮箱授权码，**不是登录密码**
- 授权码通常是 16 位的字符串

### 3. 执行数据库迁移

运行以下命令创建提醒日志表：

```bash
# 进入项目目录
cd /Users/zhangqilai/project/vibe-code-100-projects/cogniflow

# 执行迁移脚本
psql -h localhost -U cogniflow_user -d cogniflow -f database/migrations/add_reminder_logs.sql
```

或者使用 Docker：

```bash
docker exec -i postgres-cogniflow psql -U cogniflow_user -d cogniflow < database/migrations/add_reminder_logs.sql
```

### 4. 启动服务器

```bash
cd server
pnpm run dev
```

如果配置正确，你会看到：

```
✅ 邮件服务配置成功
🚀 提醒服务已启动，每 60 秒检查一次
⏰ 提醒时间：日程开始前 5 分钟
```

## 使用方法

### 自动提醒

1. **创建日程卡片**：
   - 在 CogniFlow 中创建一个日程类型的卡片
   - 设置开始时间（start_time）
   - 确保用户已填写邮箱并开启邮件通知

2. **等待提醒**：
   - 系统每分钟检查一次即将开始的日程
   - 在日程开始前 5-6 分钟之间会发送提醒
   - 用户会收到包含日程详情的邮件

### 手动测试

#### 测试邮件发送

```bash
# 发送测试邮件到指定邮箱
curl -X POST http://localhost:3001/api/reminders/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"email": "your-email@example.com"}'
```

#### 手动触发提醒检查

```bash
# 立即检查并发送所有待提醒的日程
curl -X POST http://localhost:3001/api/reminders/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 工作流程

```
1. 定时任务每分钟运行一次
   ↓
2. 查询即将开始的日程（5-6分钟内）
   ↓
3. 过滤条件：
   - 日程类型为 event
   - 未删除、未归档
   - 用户邮箱存在
   - 用户开启了邮件通知
   - 该时间点未发送过提醒
   ↓
4. 发送提醒邮件
   ↓
5. 记录发送日志（成功/失败）
```

## 邮件模板示例

提醒邮件包含以下信息：

- 📋 日程标题
- ⏰ 开始时间
- ⏱️ 结束时间（如果有）
- ⌛ 持续时间
- 📝 详细说明（如果有）
- 📍 地点（如果有）

## 数据库表结构

### reminder_logs 表

```sql
CREATE TABLE reminder_logs (
    id UUID PRIMARY KEY,
    item_id UUID REFERENCES items(id),  -- 日程ID
    user_id UUID REFERENCES users(id),  -- 用户ID
    reminder_time TIMESTAMP,             -- 提醒时间
    sent_at TIMESTAMP,                   -- 发送时间
    email_to VARCHAR(255),               -- 收件人邮箱
    status VARCHAR(20),                  -- sent/failed/pending
    error_message TEXT,                  -- 错误信息
    UNIQUE(item_id, reminder_time)
);
```

## 常见问题

### 1. 邮件发送失败

**错误：授权失败**
- 检查 `EMAIL_PASSWORD` 是否是授权码（不是登录密码）
- 确认 QQ 邮箱已开启 SMTP 服务

**错误：连接超时**
- 检查网络连接
- 确认 QQ 邮箱 SMTP 服务器地址正确（smtp.qq.com:465）

### 2. 没有收到提醒

检查以下几点：
- 用户是否填写了邮箱
- 用户设置中是否开启了邮件通知（`email_notifications = true`）
- 日程是否有开始时间（`start_time`）
- 日程是否已被删除或归档
- 查看 `reminder_logs` 表中的记录和状态

### 3. 重复发送提醒

不会出现这种情况，因为：
- 数据库中有唯一索引 `(item_id, reminder_time)`
- 查询时会排除已发送过的提醒

### 4. 修改提醒时间

修改 `server/services/reminderService.ts` 中的常量：

```typescript
// 提醒提前时间（分钟）
const REMINDER_MINUTES_BEFORE = 5;  // 改为你想要的分钟数

// 检查间隔（毫秒）
const CHECK_INTERVAL = 60 * 1000;   // 改为你想要的检查频率
```

## API 端点

### POST /api/reminders/test
手动触发提醒检查

**需要认证**：是

**响应**：
```json
{
  "success": true,
  "message": "已手动触发提醒检查，发送了 2 个提醒",
  "count": 2
}
```

### POST /api/reminders/test-email
发送测试邮件

**需要认证**：是

**请求体**：
```json
{
  "email": "test@example.com"
}
```

**响应**：
```json
{
  "success": true,
  "message": "测试邮件已发送"
}
```

## 监控和日志

### 服务器日志

```bash
# 查看提醒服务日志
tail -f server/logs/reminder.log

# 常见日志消息
✅ 提醒邮件发送成功
❌ 提醒邮件发送失败
📧 准备发送提醒: 团队会议 (user@example.com)
⏰ 暂无需要发送提醒的日程
```

### 数据库查询

```sql
-- 查看最近的提醒记录
SELECT * FROM reminder_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- 查看失败的提醒
SELECT * FROM reminder_logs 
WHERE status = 'failed' 
ORDER BY sent_at DESC;

-- 统计提醒发送情况
SELECT 
  DATE(sent_at) as date,
  status,
  COUNT(*) as count
FROM reminder_logs
GROUP BY DATE(sent_at), status
ORDER BY date DESC;
```

## 生产环境部署

### 1. 环境变量

确保生产环境的 `.env` 文件配置正确：

```bash
EMAIL_USER=646184101@qq.com
EMAIL_PASSWORD=生产环境授权码
NODE_ENV=production
```

### 2. 进程管理

使用 PM2 或类似工具保持服务运行：

```bash
pm2 start server/index.ts --name cogniflow-api
pm2 logs cogniflow-api
```

### 3. 监控

- 定期检查 `reminder_logs` 表
- 设置告警监控失败的提醒
- 监控邮件发送成功率

## 安全建议

1. **不要将授权码提交到代码仓库**
   - 使用 `.env` 文件
   - 添加 `.env` 到 `.gitignore`

2. **定期更换授权码**
   - 建议每 3-6 个月更换一次

3. **限制 API 访问**
   - 测试端点需要认证
   - 生产环境可考虑限制访问频率

## 未来改进

- [ ] 支持自定义提醒时间
- [ ] 支持多个提醒时间点
- [ ] 支持短信提醒
- [ ] 支持 Webhook 通知
- [ ] 提醒历史统计面板
- [ ] 批量提醒管理

## 技术栈

- **邮件服务**：nodemailer
- **邮箱服务商**：QQ邮箱 (SMTP)
- **数据库**：PostgreSQL
- **定时任务**：Node.js setInterval

## 相关文件

```
server/
├── services/
│   ├── emailService.ts       # 邮件发送服务
│   └── reminderService.ts    # 提醒检查服务
├── index.ts                  # 服务器入口（集成提醒服务）
├── .env.example              # 环境变量模板
└── .env                      # 实际配置（不提交）

database/
└── migrations/
    └── add_reminder_logs.sql # 数据库迁移脚本
```

## 联系支持

如有问题，请查看：
- 服务器日志
- 数据库 `reminder_logs` 表
- QQ 邮箱授权设置

---

**最后更新**: 2025年11月11日
