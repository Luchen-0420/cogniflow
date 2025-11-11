# 一键部署检查和修复报告

## 检查日期
2025年11月11日

## 问题发现

### 1. 数据库表缺失
- ❌ `reminder_logs` 表未包含在 `database/deploy.sql` 中
- ❌ 一键部署无法创建提醒日志功能所需的表

### 2. 依赖缺失
- ❌ `nodemailer` 及其类型定义未在一键部署脚本中安装
- ❌ 邮件提醒功能的依赖不完整

### 3. 环境变量缺失
- ❌ 邮件配置 (`EMAIL_USER`, `EMAIL_PASSWORD`) 未在一键部署中添加

### 4. 数据完整性问题
- ❌ 部分用户缺少 `user_settings` 记录
- ❌ `email_notifications` 字段为 NULL 导致提醒查询失败

## 修复内容

### ✅ 1. database/deploy.sql 修复

#### 添加 reminder_logs 表
```sql
-- 7. 提醒日志表 (reminder_logs)
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_to VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, reminder_time)
);
```

#### 修正表编号
- 7. reminder_logs
- 8. user_statistics  
- 9. system_logs
- 10. sessions
- 11. backups

#### 添加 user_settings 补丁
```sql
-- 确保所有用户都有 user_settings
DO $$
DECLARE
    settings_created INTEGER := 0;
BEGIN
    INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications)
    SELECT 
        u.id,
        'system',
        'zh-CN',
        true,
        true
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
    WHERE us.id IS NULL;
    
    GET DIAGNOSTICS settings_created = ROW_COUNT;
    
    IF settings_created > 0 THEN
        RAISE NOTICE '✅ 为 % 个用户补充了 user_settings', settings_created;
    END IF;
END $$;
```

### ✅ 2. deploy-all.sh 修复

#### 添加邮件配置到 .env
```bash
# 邮件提醒配置（需要手动配置 QQ 邮箱授权码）
EMAIL_USER=646184101@qq.com
EMAIL_PASSWORD=
```

#### 添加依赖安装
```bash
log_step "安装邮件提醒依赖..."
pnpm add nodemailer --silent
pnpm add -D @types/nodemailer --silent
pnpm add -D tsx --silent
log_success "邮件提醒依赖安装完成"
```

#### 添加部署信息提示
```bash
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📧 邮件提醒配置 (v1.3.0)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  • 功能: 日程开始前 ${GREEN}5 分钟${NC} 自动邮件提醒"
echo -e "  • 发件邮箱: ${GREEN}646184101@qq.com${NC}"
echo -e "  • ${YELLOW}需要配置:${NC} 编辑 ${BLUE}server/.env${NC} 添加 ${GREEN}EMAIL_PASSWORD${NC}"
echo -e "  • 获取授权码: QQ邮箱 → 设置 → 账户 → 生成授权码"
echo -e "  • 配置文档: ${BLUE}docs/quickstart/REMINDER_QUICKSTART.md${NC}"
```

### ✅ 3. 现有数据库修复

#### 为缺失 user_settings 的用户创建记录
```sql
INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications)
SELECT 
    u.id,
    'system',
    'zh-CN',
    true,
    true
FROM users u
LEFT JOIN user_settings us ON u.id = us.user_id
WHERE us.id IS NULL;
```

已执行，修复了 3 个用户的设置。

## 提醒逻辑问题排查

### 问题描述
查询返回 0 条记录，日程未被提醒。

### 根本原因
用户 `646184101@qq.com` 的 `email_notifications` 字段为 NULL，导致查询条件 `us.email_notifications = true` 失败。

### 查询条件
```sql
WHERE 
  i.type = 'event'
  AND i.start_time IS NOT NULL
  AND i.deleted_at IS NULL
  AND i.archived_at IS NULL
  AND u.email IS NOT NULL
  AND us.email_notifications = true  -- ❌ NULL != true
  AND i.start_time > NOW()
  AND i.start_time <= NOW() + INTERVAL '6 minutes'
```

### 验证修复
修复后的查询结果：
```
id                                  | title | start_time             | user_email       | reminder_time
------------------------------------+-------+------------------------+------------------+----------------------
6121ec36-6ea6-4825-bd40-9e20ba3b5a02| 开会  | 2025-11-11 07:58:00+08 | 646184101@qq.com | 2025-11-11 07:53:00+08
```

✅ 问题已解决

## 一键部署验证清单

### 数据库
- [x] reminder_logs 表会被创建
- [x] 所有表编号正确
- [x] 所有用户都会有 user_settings
- [x] email_notifications 默认为 true

### 依赖
- [x] nodemailer 会被安装
- [x] @types/nodemailer 会被安装
- [x] tsx 会被安装

### 环境变量
- [x] EMAIL_USER 会被配置
- [ ] EMAIL_PASSWORD 需要手动配置（提示用户）

### 文档
- [x] 部署信息包含邮件提醒说明
- [x] 提示用户配置步骤
- [x] 链接到配置文档

## 后续操作

### 立即需要
1. ✅ 修复 database/deploy.sql
2. ✅ 修复 deploy-all.sh
3. ✅ 修复现有数据库

### 用户需要配置
1. 获取 QQ 邮箱授权码
2. 编辑 `server/.env` 添加 `EMAIL_PASSWORD`
3. 重启服务器

### 测试建议
1. 运行完整的一键部署
2. 验证所有表都被创建
3. 验证依赖安装完整
4. 创建测试日程验证提醒功能

## 影响范围

### 新部署
- ✅ 完全支持，无需手动干预（除了配置邮箱授权码）

### 现有部署
需要执行以下 SQL 补丁：
```bash
# 1. 创建 reminder_logs 表
docker exec -i cogniflow-postgres psql -U cogniflow_user -d cogniflow < database/migrations/add_reminder_logs.sql

# 2. 补充 user_settings
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications)
SELECT u.id, 'system', 'zh-CN', true, true
FROM users u
LEFT JOIN user_settings us ON u.id = us.user_id
WHERE us.id IS NULL;
"

# 3. 安装依赖
cd server
pnpm add nodemailer
pnpm add -D @types/nodemailer

# 4. 配置环境变量
echo "EMAIL_USER=646184101@qq.com" >> server/.env
echo "EMAIL_PASSWORD=你的授权码" >> server/.env
```

## 总结

### 修复的问题
1. ✅ database/deploy.sql 缺少 reminder_logs 表
2. ✅ 表编号重复问题
3. ✅ user_settings 数据不完整
4. ✅ 一键部署缺少邮件依赖安装
5. ✅ 一键部署缺少环境变量配置
6. ✅ 提醒查询逻辑因 NULL 值失败

### 现在的状态
- ✅ 一键部署脚本完整
- ✅ 数据库迁移文件完整
- ✅ 依赖安装自动化
- ✅ 用户指引清晰
- ✅ 现有数据库已修复

### 部署后用户只需要
1. 获取 QQ 邮箱授权码
2. 配置到 `server/.env`
3. 重启服务器

🎉 **一键部署现已完全支持日程提醒功能！**

---

**修复完成时间**: 2025年11月11日 08:07  
**修复文件数**: 2 (deploy.sql, deploy-all.sh)  
**数据库补丁**: 已执行  
**功能状态**: ✅ 可用
