# CogniFlow 数据库脚本

本目录包含 CogniFlow 项目的数据库相关脚本和配置。

## ⚠️ 重要说明

**请使用项目根目录的统一部署脚本：**

```bash
# 在项目根目录执行
./deploy-all.sh
```

这是**唯一推荐的部署方式**，包含完整的数据库初始化、环境配置和依赖安装。

## 📁 目录结构

```
database/
├── deploy.sql                      # 完整的数据库 SQL 脚本
├── init/                           # 初始化脚本（被 deploy.sql 包含）
│   ├── 01_schema.sql              # 数据库架构
│   └── 02_test_data.sql           # 测试数据
├── migrations/                     # 历史迁移记录
├── backups/                        # 备份目录
├── verify-deployment-docker.sh    # 部署验证脚本（Docker 版本）
└── clear-data-docker.sh           # 清空数据脚本（Docker 版本）
```

## 🚀 快速部署

### 使用统一部署脚本（推荐）

```bash
# 在项目根目录执行
./deploy-all.sh
```

此脚本会：
1. ✅ 停止并删除旧容器
2. ✅ 清理旧数据
3. ✅ 启动 PostgreSQL 容器
4. ✅ 执行 `database/deploy.sql` 初始化数据库
5. ✅ 安装依赖并配置环境

### 验证部署

```bash
./database/verify-deployment-docker.sh
```

## 📋 数据库内容

`deploy.sql` 包含完整的数据库定义：

### 核心表（12个）
- ✅ `users` - 用户表（包含 API 使用次数限制）
- ✅ `user_settings` - 用户配置
- ✅ `items` - 条目表（任务、事件、笔记、URL、集合）
- ✅ `user_templates` - 智能模板表
- ✅ `tags` - 标签表
- ✅ `attachments` - 附件表
- ✅ `activity_logs` - 活动日志
- ✅ `user_statistics` - 统计数据
- ✅ `system_logs` - 系统日志
- ✅ `sessions` - 会话管理
- ✅ `backups` - 备份记录
- ✅ `attachment_configs` - 附件配置

### 功能特性

#### 1. API 使用次数限制 🆕
- 注册用户：100 次 AI 功能调用
- 快捷登录用户：50 次 AI 功能调用
- 自动识别用户类型
- 使用次数统计和管理函数

#### 2. 智能模板
- 默认 3 个模板（日报、会议、月报）
- 自定义模板支持
- 子项目管理

#### 3. 附件支持
- 图片、文档、音频、视频
- 自动生成缩略图
- AI 图片分析

#### 4. 冲突检测
- 日程时间冲突检测
- 自动标记冲突事项

### 性能优化
- ✅ 40+ 个索引优化查询
- ✅ 自动更新时间戳触发器
- ✅ 统计视图优化报表查询

### 默认数据
- ✅ 管理员账号：`admin` / `admin123`
- ✅ 3 个智能模板

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
