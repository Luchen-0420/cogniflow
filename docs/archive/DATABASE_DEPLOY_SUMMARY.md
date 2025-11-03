# 🚀 CogniFlow 数据库一键部署方案

## 📦 已创建的文件

### 1. 核心部署文件

| 文件路径 | 说明 | 用途 |
|---------|------|------|
| `database/deploy.sql` | 完整 SQL 部署脚本 | 包含所有表、索引、触发器、默认数据 |
| `database/deploy-database.sh` | 自动化部署脚本 | 一键部署，带交互式提示和备份功能 |
| `database/verify-deployment.sh` | 验证脚本 | 检查部署是否成功 |
| `database/README.md` | 数据库脚本说明 | 快速参考指南 |
| `DATABASE_DEPLOYMENT_GUIDE.md` | 完整部署指南 | 详细的部署文档和故障排查 |

## 🎯 使用方法

### 方式一：自动化脚本（最简单）

```bash
# 1. 进入项目目录
cd /root/vibe-code-100-projects/cogniflow

# 2. 直接运行
./database/deploy-database.sh

# 3. 验证部署
./database/verify-deployment.sh
```

### 方式二：手动执行 SQL

```bash
# 直接执行 SQL 文件
psql -U postgres -d cogniflow -f database/deploy.sql
```

### 方式三：使用环境变量

```bash
# 设置数据库配置
export DB_NAME=cogniflow
export DB_USER=postgres
export DB_PASSWORD=your_password

# 运行部署
./database/deploy-database.sh
```

## ✨ 功能特性

### deploy.sql 脚本特性

- ✅ **幂等性**: 可重复执行，不会报错
- ✅ **完整性**: 包含所有表、索引、触发器
- ✅ **智能模板**: 自动创建默认模板（日报、会议、月报）
- ✅ **默认数据**: 创建管理员账号和用户配置
- ✅ **优化**: 40+ 个索引优化查询性能
- ✅ **安全**: 密码使用 bcrypt 加密
- ✅ **提示信息**: 执行过程中显示详细进度

### deploy-database.sh 脚本特性

- ✅ **交互式**: 友好的用户交互界面
- ✅ **自动备份**: 部署前可选择备份现有数据
- ✅ **错误处理**: 遇到错误立即停止并提示
- ✅ **颜色输出**: 清晰的彩色进度提示
- ✅ **环境检查**: 自动检查 PostgreSQL 和数据库状态
- ✅ **配置灵活**: 支持环境变量配置

### verify-deployment.sh 脚本特性

- ✅ **全面验证**: 检查表、扩展、数据、索引、触发器
- ✅ **统计信息**: 显示数据库统计和模板详情
- ✅ **彩色输出**: 清晰的成功/失败提示
- ✅ **快速诊断**: 快速发现部署问题

## 📋 部署内容清单

### 数据库对象

| 类型 | 数量 | 说明 |
|------|------|------|
| 表 | 10 | 核心业务表 |
| 索引 | 40+ | 优化查询性能 |
| 触发器 | 6 | 自动更新时间戳 |
| 视图 | 2 | 用户统计视图 |
| 函数 | 1 | 更新时间戳函数 |
| 扩展 | 2 | uuid-ossp, pgcrypto |

### 默认数据

| 类型 | 数量 | 详情 |
|------|------|------|
| 管理员账号 | 1 | admin / admin123 |
| 智能模板 | 3 | 日报、会议、月报 |

## 🏗️ 表结构概览

```
users (用户表)
├── id, username, email, password_hash
├── role, status, avatar_url
└── 时间戳字段

items (条目表) - 核心表
├── 基本字段: id, user_id, raw_text, type, title
├── 任务字段: due_date, priority, status
├── 事件字段: start_time, end_time, recurrence_rule
├── URL字段: url, url_title, url_summary
├── 智能模板: collection_type, sub_items
└── 元数据: tags, entities, timestamps

user_templates (智能模板表) - 新增
├── trigger_word (触发词)
├── template_name (模板名称)
├── default_sub_items (默认子任务)
└── 统计: usage_count

tags (标签表)
activity_logs (活动日志)
user_statistics (用户统计)
system_logs (系统日志)
sessions (会话管理)
backups (备份记录)
user_settings (用户配置)
```

## 🔐 安全说明

### 默认账号

```
用户名: admin
密码: admin123
```

**⚠️ 重要安全提醒**:

1. ✅ 首次登录后立即修改密码
2. ✅ 生产环境使用强密码
3. ✅ 定期更新密码
4. ✅ 启用双因素认证（如有）

### 修改管理员密码

```sql
-- 方式一：SQL 修改
UPDATE users 
SET password_hash = crypt('new_secure_password', gen_salt('bf', 10))
WHERE username = 'admin';

-- 方式二：通过应用修改（推荐）
```

## 📊 性能优化

部署脚本已包含以下优化：

### 索引策略

- ✅ 用户 ID 索引（所有关联表）
- ✅ 时间字段索引（created_at, due_date, start_time）
- ✅ 状态和类型索引（status, type, priority）
- ✅ 标签 GIN 索引（快速标签搜索）
- ✅ 全文搜索索引（title, description, raw_text）
- ✅ 组合索引（user_id + type, user_id + status）

### 查询优化建议

```sql
-- 1. 使用索引字段
SELECT * FROM items WHERE user_id = 'xxx' AND type = 'task';

-- 2. 利用 GIN 索引搜索标签
SELECT * FROM items WHERE tags @> ARRAY['工作'];

-- 3. 全文搜索
SELECT * FROM items 
WHERE to_tsvector('simple', title || ' ' || description) @@ to_tsquery('关键词');
```

## 🔄 维护操作

### 定期备份

```bash
# 每日备份（建议添加到 crontab）
0 2 * * * pg_dump -U postgres cogniflow > /backup/cogniflow_$(date +\%Y\%m\%d).sql

# 手动备份
pg_dump -U postgres cogniflow > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 清理旧数据

```sql
-- 删除 30 天前的已删除条目
DELETE FROM items 
WHERE deleted_at < NOW() - INTERVAL '30 days';

-- 清理过期会话
DELETE FROM sessions 
WHERE expires_at < NOW();

-- 归档旧日志
DELETE FROM activity_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### 数据库维护

```sql
-- 分析表统计信息
ANALYZE;

-- 清理垃圾数据
VACUUM;

-- 重建索引
REINDEX DATABASE cogniflow;
```

## 🐛 常见问题

### Q1: 如何在阿里云 ECS 上部署？

```bash
# 1. 安装 PostgreSQL
sudo apt update && sudo apt install postgresql

# 2. 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. 运行部署脚本
cd /root/vibe-code-100-projects/cogniflow
./database/deploy-database.sh
```

### Q2: 如何重置数据库？

```bash
# 方式一：删除并重建（会丢失所有数据）
dropdb -U postgres cogniflow
createdb -U postgres cogniflow
./database/deploy-database.sh

# 方式二：仅清空数据（保留表结构）
psql -U postgres -d cogniflow -f database/clear_data.sql
```

### Q3: 如何检查部署是否成功？

```bash
# 运行验证脚本
./database/verify-deployment.sh

# 或手动检查
psql -U postgres -d cogniflow -c "\dt"
```

### Q4: 如何升级数据库？

```bash
# 1. 备份现有数据
pg_dump -U postgres cogniflow > backup_before_upgrade.sql

# 2. 应用新的迁移脚本
psql -U postgres -d cogniflow -f database/migrations/xxx.sql

# 3. 验证升级
./database/verify-deployment.sh
```

## 📈 监控建议

### 性能监控查询

```sql
-- 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 查看慢查询
SELECT 
    query,
    calls,
    total_time / 1000 as total_seconds,
    mean_time / 1000 as avg_seconds
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## 🚀 生产环境检查清单

部署到生产环境前，请确认：

- [ ] 已安装 PostgreSQL 16+
- [ ] 数据库用户权限配置正确
- [ ] 已设置强密码
- [ ] 已配置防火墙规则
- [ ] 已设置定期备份
- [ ] 已配置 SSL 连接（如需要）
- [ ] 已修改默认管理员密码
- [ ] 已配置环境变量 (.env 文件)
- [ ] 已测试数据库连接
- [ ] 已运行验证脚本

## 📚 相关文档

- [DATABASE_DEPLOYMENT_GUIDE.md](./DATABASE_DEPLOYMENT_GUIDE.md) - 完整部署指南
- [SMART_TEMPLATES_QUICKSTART.md](./SMART_TEMPLATES_QUICKSTART.md) - 智能模板使用
- [database/README.md](./database/README.md) - 数据库脚本说明
- [USER_MANUAL.md](./USER_MANUAL.md) - 用户手册

## 🎉 总结

通过这套完整的部署方案，你可以：

✅ **一键部署**: 30秒内完成数据库初始化  
✅ **自动化**: 无需手动创建表和数据  
✅ **安全性**: 密码加密，权限控制  
✅ **可维护**: 备份、验证、监控工具齐全  
✅ **可扩展**: 易于添加新表和迁移  
✅ **生产就绪**: 包含所有必要的优化和配置  

---

**现在就开始部署吧！** 🚀

```bash
cd /root/vibe-code-100-projects/cogniflow
./database/deploy-database.sh
```
