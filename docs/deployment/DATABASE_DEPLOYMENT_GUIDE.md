# CogniFlow 数据库部署指南

## 📋 目录

- [快速开始](#快速开始)
- [部署方式](#部署方式)
- [环境要求](#环境要求)
- [配置说明](#配置说明)
- [故障排查](#故障排查)

---

## 🚀 快速开始

### 方式一：使用自动化脚本（推荐）

```bash
# 1. 进入数据库目录
cd database

# 2. 添加执行权限
chmod +x deploy-database.sh

# 3. 运行部署脚本
./deploy-database.sh
```

### 方式二：手动执行 SQL

```bash
# 1. 创建数据库（如果不存在）
createdb -U postgres cogniflow

# 2. 执行部署脚本
psql -U postgres -d cogniflow -f database/deploy.sql
```

---

## 🌍 环境要求

### 必需软件

- **PostgreSQL**: 16.0+ （推荐 16.x 或更高版本）
- **操作系统**: Linux / macOS / Windows
- **磁盘空间**: 至少 500MB 可用空间

### 检查 PostgreSQL 版本

```bash
psql --version
```

---

## ⚙️ 配置说明

### 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/cogniflow
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cogniflow
DB_USER=postgres
DB_PASSWORD=your_password

# 服务器配置
PORT=3001
NODE_ENV=production

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 生产环境配置

对于生产环境（如阿里云 ECS），使用以下配置：

```bash
# 在服务器上设置环境变量
export DB_NAME=cogniflow
export DB_USER=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_PASSWORD=your_secure_password

# 然后运行部署脚本
./database/deploy-database.sh
```

---

## 📦 部署脚本说明

### deploy.sql 脚本包含

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1 | 创建扩展 | uuid-ossp, pgcrypto |
| 2 | 创建表结构 | 10个核心表 |
| 3 | 创建触发器 | 自动更新 updated_at |
| 4 | 创建视图 | 用户统计、活跃度视图 |
| 5 | 插入初始数据 | 默认管理员账号 |
| 6 | 创建默认模板 | 日报、会议、月报模板 |

### 创建的表列表

1. **users** - 用户表
2. **user_settings** - 用户配置
3. **items** - 核心条目表（包含智能模板支持）
4. **user_templates** - 智能模板表
5. **tags** - 标签表
6. **activity_logs** - 活动日志
7. **user_statistics** - 用户统计
8. **system_logs** - 系统日志
9. **sessions** - 会话管理
10. **backups** - 备份记录

---

## 🔐 默认账号

部署完成后会创建默认管理员账号：

```
用户名: admin
密码: admin123
邮箱: admin@cogniflow.local
```

⚠️ **重要**: 请在首次登录后立即修改密码！

```sql
-- 修改管理员密码
UPDATE users 
SET password_hash = crypt('new_password', gen_salt('bf', 10))
WHERE username = 'admin';
```

---

## 🎯 智能模板

系统会自动为所有用户创建 3 个默认模板：

### 📰 日报模板
- 触发词: `/日报`
- 默认标签: 工作、日报
- 子任务:
  - 总结今日完成的工作
  - 记录遇到的问题
  - 规划明日工作计划

### 👥 会议模板
- 触发词: `/会议`
- 默认标签: 会议、工作
- 子任务:
  - 记录会议议题
  - 记录讨论要点
  - 记录行动项

### 📅 月报模板
- 触发词: `/月报`
- 默认标签: 工作、月报
- 子任务:
  - 本月工作完成情况
  - 重点成果与亮点
  - 下月工作计划

---

## 🔧 故障排查

### 问题 1: 无法连接数据库

**错误信息**: `FATAL: database "cogniflow" does not exist`

**解决方案**:
```bash
# 手动创建数据库
createdb -U postgres cogniflow
```

---

### 问题 2: 权限不足

**错误信息**: `ERROR: permission denied to create extension`

**解决方案**:
```bash
# 使用超级用户身份创建扩展
psql -U postgres -d cogniflow -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql -U postgres -d cogniflow -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

---

### 问题 3: 表已存在

**错误信息**: `ERROR: relation "users" already exists`

**解决方案**: 脚本使用 `IF NOT EXISTS`，此警告可以忽略。如需重新部署：

```bash
# 方式一：删除并重建数据库（⚠️ 会丢失所有数据）
dropdb -U postgres cogniflow
createdb -U postgres cogniflow
psql -U postgres -d cogniflow -f database/deploy.sql

# 方式二：仅删除特定表
psql -U postgres -d cogniflow -c "DROP TABLE IF EXISTS users CASCADE;"
```

---

### 问题 4: 密码认证失败

**错误信息**: `FATAL: password authentication failed`

**解决方案**:
```bash
# 检查 pg_hba.conf 配置
sudo nano /etc/postgresql/16/main/pg_hba.conf

# 确保有以下行（根据实际情况调整）
local   all             postgres                                peer
host    all             all             127.0.0.1/32            md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

---

### 问题 5: 端口被占用

**错误信息**: `could not connect to server: Connection refused`

**解决方案**:
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 启动 PostgreSQL
sudo systemctl start postgresql

# 检查端口占用
sudo netstat -tulpn | grep 5432
```

---

## 🔄 数据库管理

### 备份数据库

```bash
# 完整备份
pg_dump -U postgres cogniflow > backup_$(date +%Y%m%d).sql

# 仅备份数据（不包括表结构）
pg_dump -U postgres --data-only cogniflow > data_backup.sql

# 备份特定表
pg_dump -U postgres -t users -t items cogniflow > users_items_backup.sql
```

### 恢复数据库

```bash
# 从备份文件恢复
psql -U postgres -d cogniflow < backup_20251103.sql
```

### 查看数据库信息

```bash
# 连接到数据库
psql -U postgres -d cogniflow

# 查看所有表
\dt

# 查看表结构
\d users

# 查看表大小
\dt+

# 退出
\q
```

---

## 📊 验证部署

部署完成后，执行以下查询验证：

```sql
-- 1. 检查用户表
SELECT username, role, created_at FROM users;

-- 2. 检查默认模板
SELECT trigger_word, template_name, icon FROM user_templates;

-- 3. 检查表数量
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

-- 4. 检查索引
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC;
```

预期结果：
- 1 个管理员用户
- 3 个默认模板（每个用户）
- 10 个主要表
- 40+ 个索引

---

## 🚀 生产环境部署步骤

### 在阿里云 ECS 上部署

```bash
# 1. 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 2. 配置 PostgreSQL
sudo -u postgres psql
ALTER USER postgres PASSWORD 'your_secure_password';
\q

# 3. 克隆项目（或上传文件）
cd /root/vibe-code-100-projects/cogniflow

# 4. 运行部署脚本
chmod +x database/deploy-database.sh
DB_PASSWORD=your_secure_password ./database/deploy-database.sh

# 5. 配置环境变量
cp .env.example .env
nano .env  # 编辑数据库配置

# 6. 启动后端服务
cd server
npm install
npm run build
npm start

# 7. 启动前端服务（生产模式）
cd ..
pnpm install
pnpm run build

# 8. 配置 Nginx（已完成）
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📝 更新日志

### v1.0.0 (2025-11-03)
- ✅ 初始版本发布
- ✅ 包含所有核心表结构
- ✅ 智能模板功能支持
- ✅ 自动化部署脚本
- ✅ 默认数据初始化

---

## 🆘 获取帮助

如遇到其他问题，请检查：

1. **日志文件**: `/var/log/postgresql/postgresql-16-main.log`
2. **系统日志**: 检查 `system_logs` 表
3. **Nginx 日志**: `/var/log/nginx/cogniflow-error.log`

---

## 📚 相关文档

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [CogniFlow 用户手册](../USER_MANUAL.md)
- [智能模板使用指南](../SMART_TEMPLATES_QUICKSTART.md)
- [数据库迁移指南](../DATABASE_MIGRATION_GUIDE.md)

---

**部署完成后，别忘了修改默认密码！** 🔐
