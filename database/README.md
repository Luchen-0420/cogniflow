# CogniFlow 数据库脚本

本目录包含 CogniFlow 项目的数据库部署和管理脚本。

## 🚀 快速开始

### 一键部署（推荐）

```bash
# 在项目根目录执行
./database/deploy-database.sh
```

### 验证部署

```bash
./database/verify-deployment.sh
```

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `deploy.sql` | 完整的数据库部署 SQL 脚本 |
| `deploy-database.sh` | 自动化部署脚本（带备份功能） |
| `verify-deployment.sh` | 部署验证脚本 |
| `init_default_templates.sql` | 默认模板初始化脚本（已集成到 deploy.sql） |
| `clear_data.sql` | 清空数据脚本（谨慎使用） |

## 📋 部署内容

部署脚本会自动创建：

### 核心表（10个）
- ✅ `users` - 用户表
- ✅ `user_settings` - 用户配置
- ✅ `items` - 条目表（支持任务、事件、笔记、URL、集合）
- ✅ `user_templates` - 智能模板表
- ✅ `tags` - 标签表
- ✅ `activity_logs` - 活动日志
- ✅ `user_statistics` - 统计数据
- ✅ `system_logs` - 系统日志
- ✅ `sessions` - 会话管理
- ✅ `backups` - 备份记录

### 默认数据
- ✅ 管理员账号（admin / admin123）
- ✅ 3个智能模板（日报、会议、月报）
- ✅ 40+ 个索引优化查询性能
- ✅ 6个触发器自动更新时间戳

## 🔐 默认账号

```
用户名: admin
密码: admin123
邮箱: admin@cogniflow.local
```

**⚠️ 重要**: 部署后请立即修改默认密码！

## 💡 使用场景

### 场景 1: 本地开发环境

```bash
# 1. 确保 PostgreSQL 正在运行
brew services start postgresql@16  # macOS

# 2. 运行部署脚本
./database/deploy-database.sh

# 3. 验证部署
./database/verify-deployment.sh
```

### 场景 2: 生产环境（阿里云 ECS）

```bash
# 1. SSH 登录服务器
ssh root@your-server-ip

# 2. 进入项目目录
cd /root/vibe-code-100-projects/cogniflow

# 3. 设置环境变量
export DB_USER=postgres
export DB_PASSWORD=your_secure_password

# 4. 运行部署
./database/deploy-database.sh

# 5. 验证部署
./database/verify-deployment.sh
```

### 场景 3: Docker 环境

```bash
# 1. 启动 PostgreSQL 容器
docker-compose up -d postgres

# 2. 等待数据库启动
sleep 5

# 3. 执行部署
docker exec -i cogniflow-db psql -U postgres -d cogniflow < database/deploy.sql
```

## 🔧 环境变量

脚本支持以下环境变量：

```bash
DB_NAME=cogniflow          # 数据库名称
DB_USER=postgres           # 数据库用户
DB_HOST=localhost          # 数据库主机
DB_PORT=5432              # 数据库端口
DB_PASSWORD=your_password  # 数据库密码（可选）
```

## 📊 部署后检查

运行验证脚本会检查：

- ✅ 数据库连接
- ✅ 表结构完整性
- ✅ 扩展安装状态
- ✅ 默认数据存在性
- ✅ 索引和触发器数量
- ✅ 数据统计信息

## 🆘 故障排查

### 问题：无法连接数据库

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 启动 PostgreSQL
sudo systemctl start postgresql
```

### 问题：权限不足

```bash
# 使用超级用户权限
sudo -u postgres ./database/deploy-database.sh
```

### 问题：表已存在

```bash
# 脚本会自动处理，使用 IF NOT EXISTS
# 如需完全重建，请备份后删除数据库重新创建
```

## 📚 更多文档

- [完整部署指南](../DATABASE_DEPLOYMENT_GUIDE.md)
- [智能模板使用](../SMART_TEMPLATES_QUICKSTART.md)
- [数据库迁移](../DATABASE_MIGRATION_GUIDE.md)

## ⚡ 快速命令

```bash
# 部署数据库
./database/deploy-database.sh

# 验证部署
./database/verify-deployment.sh

# 备份数据库
pg_dump -U postgres cogniflow > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U postgres cogniflow < backup_20251103.sql

# 清空数据（保留表结构）
psql -U postgres -d cogniflow -f database/clear_data.sql

# 重新初始化模板
psql -U postgres -d cogniflow -f database/init_default_templates.sql
```

---

**祝你部署顺利！** 🎉

如有问题，请查看 [DATABASE_DEPLOYMENT_GUIDE.md](../DATABASE_DEPLOYMENT_GUIDE.md)
