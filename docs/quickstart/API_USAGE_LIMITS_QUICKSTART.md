# API 使用次数限制 - 快速开始

## 🚀 唯一部署方式

使用 CogniFlow 的一键部署脚本，所有功能（包括 API 使用次数限制）都已内置：

```bash
./deploy-all.sh
```

⚠️ **重要提示**：此脚本会清空所有现有数据，适用于新部署和重新部署。

## 📋 部署步骤

### 1. 执行部署脚本

```bash
cd /path/to/cogniflow
./deploy-all.sh
```

### 2. 确认操作

当提示确认时，输入 `yes`：

```
警告: 此操作将删除所有现有数据！
确认继续部署? (输入 yes 继续): yes
```

### 3. 等待完成

脚本会自动完成所有操作，包括：
- ✅ 清理旧数据
- ✅ 启动 PostgreSQL 容器
- ✅ 初始化数据库（包含 API 使用次数限制功能）
- ✅ 安装依赖
- ✅ 配置环境变量

### 4. 启动服务

```bash
# 推荐方式：同时启动前后端
pnpm run dev:postgres
```

## ✅ 验证功能

## ✅ 验证功能

### 1. 数据库验证

```bash
# 进入数据库
docker exec -it cogniflow-postgres psql -U cogniflow_user -d cogniflow

# 查看用户表结构
\d users

# 应该看到以下字段：
# account_type | character varying(20)
# api_usage_count | integer
# max_api_usage | integer
# usage_reset_at | timestamp with time zone

# 检查 API 管理函数
\df *api_usage*

# 应该看到：
# check_and_increment_api_usage
# get_user_api_usage
# reset_user_api_usage
# set_initial_api_limits
```

### 2. 功能测试

#### 测试注册用户
```bash
# 1. 访问应用
http://127.0.0.1:5173/register

# 2. 注册新用户后查看数据库
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
  SELECT username, account_type, api_usage_count, max_api_usage 
  FROM users 
  WHERE username = '你的用户名';
"

# 应该看到：
# account_type = 'registered'
# max_api_usage = 100
```

#### 测试快捷登录用户
```bash
# 1. 点击"快速体验"按钮
# 2. 查看最新创建的 guest 用户
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
  SELECT username, account_type, api_usage_count, max_api_usage 
  FROM users 
  WHERE username LIKE 'guest_%' 
  ORDER BY created_at DESC 
  LIMIT 1;
"

# 应该看到：
# account_type = 'quick_login'
# max_api_usage = 50
```

#### 测试使用次数扣减
```bash
# 1. 登录系统
# 2. 创建一条卡片记录（使用 AI 处理）
# 3. 查看使用次数
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
  SELECT username, api_usage_count, max_api_usage, 
         (max_api_usage - api_usage_count) as remaining
  FROM users 
  WHERE username = '你的用户名';
"

# api_usage_count 应该增加 1
```

### 3. UI 验证

访问登录页面：`http://127.0.0.1:5173/login`

应该看到底部小字提醒：
> * 注册用户可使用 100 次 AI 功能，快捷登录用户可使用 50 次

## 🔧 管理操作

## 🔧 管理操作

### 查看所有用户使用情况

```bash
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
SELECT 
  username,
  account_type,
  api_usage_count as used,
  max_api_usage as max,
  (max_api_usage - api_usage_count) as remaining,
  ROUND(api_usage_count::NUMERIC / max_api_usage * 100, 2) as usage_percent
FROM users
ORDER BY api_usage_count DESC;
"
```

### 重置特定用户

```bash
# 方式一：使用函数
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
SELECT reset_user_api_usage('user_id_here');
"

# 方式二：直接更新
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
UPDATE users 
SET api_usage_count = 0, 
    usage_reset_at = CURRENT_TIMESTAMP
WHERE username = '特定用户名';
"
```

### 批量重置（月初操作）

```bash
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
UPDATE users 
SET api_usage_count = 0, 
    usage_reset_at = CURRENT_TIMESTAMP;
"
```

### 调整用户限额

```bash
# 提升 VIP 用户限额
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
UPDATE users 
SET max_api_usage = 200 
WHERE username = 'vip_user';
"

# 批量提升注册用户限额
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
UPDATE users 
SET max_api_usage = 150 
WHERE account_type = 'registered';
"
```

## 🐛 故障排除

### 问题：部署失败

**解决方案**：
```bash
# 1. 清理所有容器和卷
docker-compose down -v

# 2. 重新部署
./deploy-all.sh
```

### 问题：无法连接数据库

**检查步骤**：
```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs cogniflow-postgres

# 测试数据库连接
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "SELECT 1;"
```

### 问题：前端不检查次数

**解决方案**：
确认环境变量配置正确：

```bash
# 检查前端 .env 文件
cat .env

# 应该包含
# VITE_USE_POSTGRES=true

# 如果没有，添加后重启
echo "VITE_USE_POSTGRES=true" >> .env
pnpm run dev
```

## 📚 更多文档

- 完整部署指南：`docs/deployment/DEPLOY_GUIDE.md`
- 功能详细文档：`docs/features/API_USAGE_LIMITS.md`
- 变更日志：`docs/CHANGELOG.md`

## 💡 重要提示

1. **唯一部署方式**：只使用 `deploy-all.sh`，无需迁移脚本
2. **数据清空**：每次部署都会清空数据，请提前备份
3. **环境配置**：确保 `VITE_USE_POSTGRES=true`
4. **默认密码**：部署后立即修改管理员密码

---

**祝部署顺利！** 🎉
