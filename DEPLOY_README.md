# CogniFlow 部署说明

## 🚀 唯一部署方式

CogniFlow 提供**统一的一键部署脚本**，无需任何迁移操作。

```bash
./deploy-all.sh
```

## ⚠️ 重要提示

- **此脚本会清空所有现有数据**
- 包含所有最新功能（包括 API 使用次数限制）
- 适用于新部署和重新部署
- 不需要单独的迁移脚本

## 📋 快速开始

### 1. 执行部署

```bash
# 进入项目根目录
cd /path/to/cogniflow

# 执行一键部署
./deploy-all.sh

# 输入 yes 确认
```

### 2. 启动服务

```bash
# 推荐：同时启动前后端
pnpm run dev:postgres

# 或分别启动
# 终端1: cd server && pnpm run dev
# 终端2: pnpm run dev
```

### 3. 访问应用

- 前端：http://127.0.0.1:5173
- 后端：http://localhost:3001
- 默认管理员：`admin` / `admin123`

## 📚 详细文档

- [完整部署指南](docs/deployment/DEPLOY_GUIDE.md)
- [API 使用次数限制说明](docs/features/API_USAGE_LIMITS.md)
- [快速开始](docs/quickstart/API_USAGE_LIMITS_QUICKSTART.md)

## 🔧 常用命令

```bash
# 查看容器日志
docker logs -f cogniflow-postgres

# 进入数据库
docker exec -it cogniflow-postgres psql -U cogniflow_user -d cogniflow

# 停止容器
docker-compose down

# 验证部署
./database/verify-deployment-docker.sh
```

## ❓ 常见问题

**Q: 已有数据怎么办？**  
A: 部署前备份数据，部署后恢复：
```bash
# 备份
docker exec cogniflow-postgres pg_dump -U cogniflow_user cogniflow > backup.sql

# 恢复
docker exec -i cogniflow-postgres psql -U cogniflow_user -d cogniflow < backup.sql
```

**Q: 部署失败怎么办？**  
A: 清理后重试：
```bash
docker-compose down -v
./deploy-all.sh
```

**Q: 需要迁移吗？**  
A: **不需要**。每次部署都是完整的全新部署，包含所有最新功能。

---

**祝部署顺利！** 🎉
