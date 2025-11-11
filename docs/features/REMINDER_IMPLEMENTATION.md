# 日程提醒功能实现总结

## 功能概述

为 CogniFlow 添加了自动邮件提醒功能，当日程卡片即将开始时（提前 5 分钟），系统会自动向用户的注册邮箱发送提醒邮件。

## 实现的功能

### ✅ 核心功能

1. **自动提醒检查**
   - 每分钟检查一次即将开始的日程
   - 提前 5 分钟发送提醒邮件
   - 支持自定义检查频率和提醒时间

2. **邮件发送服务**
   - 使用 QQ 邮箱 SMTP 服务
   - 发件人：646184101@qq.com
   - 精美的 HTML 邮件模板
   - 包含日程的完整信息

3. **防重复机制**
   - 数据库记录所有提醒日志
   - 唯一索引防止重复发送
   - 记录发送状态（成功/失败）

4. **测试和监控**
   - 手动触发提醒检查 API
   - 发送测试邮件 API
   - 完整的日志记录

## 文件变更

### 新增文件

```
server/
├── services/
│   ├── emailService.ts           # 邮件发送服务
│   └── reminderService.ts        # 提醒检查服务
└── db/
    └── index.ts                  # 数据库工具导出

database/
└── migrations/
    └── add_reminder_logs.sql     # 提醒日志表迁移

docs/
├── features/
│   └── REMINDER_SETUP.md         # 完整配置指南
└── quickstart/
    └── REMINDER_QUICKSTART.md    # 快速开始指南
```

### 修改的文件

```
server/
├── index.ts                      # 集成提醒服务
├── .env.example                  # 添加邮件配置示例
└── package.json                  # 添加 nodemailer 依赖
```

## 数据库变更

### 新增表：reminder_logs

```sql
CREATE TABLE reminder_logs (
    id UUID PRIMARY KEY,
    item_id UUID REFERENCES items(id),
    user_id UUID REFERENCES users(id),
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_to VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, reminder_time)
);
```

**索引**：
- item_id
- user_id
- reminder_time
- sent_at
- status

## 新增 API 端点

### POST /api/reminders/test
手动触发提醒检查（需要认证）

**响应**：
```json
{
  "success": true,
  "message": "已手动触发提醒检查，发送了 2 个提醒",
  "count": 2
}
```

### POST /api/reminders/test-email
发送测试邮件（需要认证）

**请求**：
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

## 配置要求

### 环境变量

在 `server/.env` 中添加：

```bash
EMAIL_USER=646184101@qq.com
EMAIL_PASSWORD=你的QQ邮箱授权码
```

### QQ 邮箱设置

1. 登录 QQ 邮箱
2. 设置 → 账户 → 开启 SMTP 服务
3. 生成授权码（不是登录密码）
4. 将授权码配置到环境变量

## 工作流程

```
启动服务器
    ↓
验证邮件配置
    ↓
启动定时任务（每1分钟）
    ↓
查询即将开始的日程（5-6分钟内）
    ↓
过滤条件检查：
  - 日程类型 = event
  - 有开始时间
  - 未删除、未归档
  - 用户有邮箱
  - 用户开启了邮件通知
  - 该时间点未发送过提醒
    ↓
发送提醒邮件
    ↓
记录发送日志
```

## 邮件模板特性

- 🎨 渐变色标题
- 📋 清晰的信息展示
- ⏰ 突出显示提醒时间
- 📱 响应式设计
- ✉️ 纯文本备选版本

邮件包含信息：
- 日程标题
- 开始时间
- 结束时间（可选）
- 持续时间
- 详细说明（可选）
- 地点信息（可选）

## 依赖安装

```bash
cd server
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

## 使用示例

### 场景 1：正常使用

1. 用户创建日程：今天 10:00 开会
2. 系统在 9:55 自动发送提醒邮件
3. 用户收到邮件，准时参加

### 场景 2：测试功能

```bash
# 1. 发送测试邮件
curl -X POST http://localhost:3001/api/reminders/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "test@example.com"}'

# 2. 手动触发提醒检查
curl -X POST http://localhost:3001/api/reminders/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 可配置参数

在 `server/services/reminderService.ts` 中：

```typescript
// 提醒提前时间（分钟）
const REMINDER_MINUTES_BEFORE = 5;

// 检查间隔（毫秒）
const CHECK_INTERVAL = 60 * 1000; // 1分钟
```

## 监控和维护

### 查看提醒日志

```sql
-- 最近的提醒记录
SELECT * FROM reminder_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- 失败的提醒
SELECT * FROM reminder_logs 
WHERE status = 'failed';

-- 提醒统计
SELECT 
  DATE(sent_at) as date,
  status,
  COUNT(*) as count
FROM reminder_logs
GROUP BY DATE(sent_at), status;
```

### 服务器日志

```
✅ 邮件服务配置成功
🚀 提醒服务已启动，每 60 秒检查一次
⏰ 提醒时间：日程开始前 5 分钟
📧 准备发送提醒: 团队会议 (user@example.com)
✅ 提醒已发送: 团队会议
```

## 安全性

1. **授权码保护**
   - 不要将授权码提交到代码仓库
   - 使用 `.env` 文件存储
   - `.env` 已添加到 `.gitignore`

2. **API 认证**
   - 测试端点需要 JWT 认证
   - 防止未授权访问

3. **防重复**
   - 数据库唯一约束
   - 查询时排除已发送记录

## 未来优化建议

- [ ] 支持用户自定义提醒时间
- [ ] 支持多个提醒时间点（如提前30分钟、10分钟、5分钟）
- [ ] 支持短信提醒（集成短信服务商）
- [ ] 支持 Webhook 通知
- [ ] 管理后台查看提醒统计
- [ ] 支持邮件模板自定义
- [ ] 支持国际化（多语言邮件）
- [ ] 提醒失败重试机制

## 测试清单

- [x] 邮件服务配置验证
- [x] 测试邮件发送
- [x] 手动触发提醒检查
- [x] 数据库表创建
- [x] 防重复机制
- [ ] 创建即将开始的日程，验证自动提醒
- [ ] 用户未设置邮箱时的处理
- [ ] 用户关闭邮件通知时的处理
- [ ] 并发提醒发送
- [ ] 邮件发送失败处理

## 文档

- 📚 [完整配置指南](./docs/features/REMINDER_SETUP.md)
- 🚀 [快速开始](./docs/quickstart/REMINDER_QUICKSTART.md)

## 技术栈

- **Node.js**: 运行时环境
- **Express**: Web 框架
- **nodemailer**: 邮件发送库
- **PostgreSQL**: 数据库
- **QQ 邮箱 SMTP**: 邮件服务提供商

## 总结

本次更新为 CogniFlow 添加了完整的日程提醒功能，包括：

1. ✅ 自动提醒检查和发送
2. ✅ 精美的邮件模板
3. ✅ 防重复机制
4. ✅ 完整的日志记录
5. ✅ 测试 API 端点
6. ✅ 详细的配置文档

用户现在可以放心创建日程，系统会在合适的时间自动发送提醒，再也不用担心错过重要的会议和活动了！

---

**实现日期**: 2025年11月11日  
**发件邮箱**: 646184101@qq.com  
**提醒时间**: 日程开始前 5 分钟
