# CogniFlow 部署优化总结

## 🎯 优化目标

简化部署流程，提供**唯一且完整的一键部署方案**，无需迁移操作。

## ✅ 优化完成

### 1. 统一部署入口

**唯一部署脚本**：`./deploy-all.sh`

- ✅ 包含所有最新功能（包括 API 使用次数限制）
- ✅ 自动清空旧数据
- ✅ 完整初始化数据库
- ✅ 安装依赖和配置环境
- ✅ 不需要迁移脚本

### 2. 简化的部署流程

```bash
# 唯一需要的命令
./deploy-all.sh

# 启动服务
pnpm run dev:postgres
```

### 3. 删除的文件

已删除不需要的迁移相关文件：
- ❌ `database/run-migrations.sh`
- ❌ `database/migrations/008_api_usage_limits.sql`

### 4. 更新的文档

**新增文档**：
- ✅ `DEPLOY_README.md` - 根目录部署说明
- ✅ `docs/deployment/DEPLOY_GUIDE.md` - 完整部署指南

**更新文档**：
- ✅ `docs/quickstart/API_USAGE_LIMITS_QUICKSTART.md` - 移除迁移说明
- ✅ `docs/features/API_USAGE_LIMITS.md` - 更新部署说明

## 📋 完整的部署方案

### 核心脚本

**deploy-all.sh** 包含以下步骤：

1. **检查依赖**
   - Docker
   - Docker Compose
   - pnpm

2. **清理环境**
   - 停止旧容器
   - 删除数据卷
   - 清理网络

3. **启动 PostgreSQL**
   - 创建容器
   - 等待数据库就绪

4. **初始化数据库**
   - 执行 `database/deploy.sql`
   - 创建所有表
   - 创建触发器和函数
   - 插入初始数据

5. **配置环境**
   - 生成 `.env` 文件
   - 配置数据库连接
   - 生成 JWT 密钥

6. **安装依赖**
   - 前端依赖
   - 后端依赖

7. **显示信息**
   - 数据库连接信息
   - 默认管理员账号
   - 启动命令

### 数据库脚本

**database/deploy.sql** 包含完整的数据库定义：

1. **基础表结构**
   - users（包含 API 使用次数字段）
   - user_settings
   - items
   - tags
   - user_templates
   - attachments
   - 等等...

2. **触发器和函数**
   - 自动更新时间戳
   - API 使用次数管理
   - 初始限制设置

3. **初始数据**
   - 默认管理员账号
   - 默认智能模板

## 🚀 使用方式

### 新环境部署

```bash
# 1. 克隆项目
git clone <repository>
cd cogniflow

# 2. 执行部署
./deploy-all.sh

# 3. 启动服务
pnpm run dev:postgres
```

### 现有环境重新部署

```bash
# 1. 备份数据（如需要）
docker exec cogniflow-postgres pg_dump -U cogniflow_user cogniflow > backup.sql

# 2. 执行部署（会清空数据）
./deploy-all.sh

# 3. 恢复数据（如需要）
docker exec -i cogniflow-postgres psql -U cogniflow_user -d cogniflow < backup.sql

# 4. 启动服务
pnpm run dev:postgres
```

## 📊 包含的功能

部署脚本自动包含所有功能：

### 核心功能
- ✅ 用户认证系统
- ✅ 智能卡片记录
- ✅ 日程管理
- ✅ 标签系统
- ✅ 智能模板
- ✅ 附件支持
- ✅ 冲突检测

### API 使用次数限制（最新）
- ✅ 注册用户：100 次
- ✅ 快捷登录用户：50 次
- ✅ 自动识别用户类型
- ✅ 使用次数统计
- ✅ 管理员重置功能

## 🎨 优势对比

### 优化前

```bash
# 新部署
./database/deploy-database.sh

# 升级部署
./database/run-migrations.sh

# 需要手动处理迁移
psql -f migrations/xxx.sql
```

❌ 复杂度高  
❌ 容易出错  
❌ 需要维护迁移脚本

### 优化后

```bash
# 统一部署
./deploy-all.sh
```

✅ 简单明了  
✅ 一键完成  
✅ 不需要迁移脚本

## 📚 文档结构

```
DEPLOY_README.md                    # 快速部署说明
docs/
  deployment/
    DEPLOY_GUIDE.md                 # 完整部署指南
  features/
    API_USAGE_LIMITS.md             # 功能详细文档
  quickstart/
    API_USAGE_LIMITS_QUICKSTART.md  # 快速开始指南
```

## ⚠️ 重要提示

1. **数据清空**：`deploy-all.sh` 会删除所有现有数据
2. **备份重要**：重新部署前务必备份数据
3. **环境变量**：确保 `VITE_USE_POSTGRES=true`
4. **权限检查**：脚本已有执行权限
5. **Docker 必需**：需要 Docker 和 Docker Compose

## 🔍 验证方法

### 1. 检查数据库表

```bash
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "\dt"
```

### 2. 验证 API 使用次数功能

```bash
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('account_type', 'api_usage_count', 'max_api_usage');
"
```

### 3. 检查函数

```bash
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "\df *api_usage*"
```

## 🎯 总结

通过这次优化：

1. ✅ **简化部署**：只需一个脚本 `deploy-all.sh`
2. ✅ **消除迁移**：不需要维护迁移脚本
3. ✅ **统一流程**：新部署和重新部署使用相同脚本
4. ✅ **完整功能**：包含所有最新功能
5. ✅ **文档完善**：提供清晰的部署指南

**部署更简单，维护更轻松！** 🎉

---

**如有问题，请查看**：
- `DEPLOY_README.md` - 快速参考
- `docs/deployment/DEPLOY_GUIDE.md` - 详细指南
