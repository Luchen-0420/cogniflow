# 🚀 CogniFlow 一键部署指南

## 快速开始（3 步完成）

### 第一步：确保已安装依赖

```bash
# macOS 用户
brew install docker docker-compose node

# 或检查是否已安装
docker --version
docker-compose --version
node --version
```

### 第二步：运行部署脚本

```bash
# 进入项目目录
cd cogniflow

# 运行一键部署脚本
./deploy-all.sh
```

### 第三步：启动服务

```bash
# 同时启动前后端（推荐）
pnpm run dev:postgres

# 或分别启动
# 终端1: cd server && pnpm run dev
# 终端2: pnpm run dev
```

---

## 🎯 部署脚本功能

`deploy-all.sh` 会自动完成以下操作：

✅ **Step 1**: 检查系统依赖 (Docker, Node.js, pnpm)  
✅ **Step 2**: 清理旧环境 (停止容器、删除数据卷)  
✅ **Step 3**: 启动 PostgreSQL 容器  
✅ **Step 4**: 初始化数据库 (创建 10 个表、默认数据)  
✅ **Step 5**: 配置环境变量 (.env 文件)  
✅ **Step 6**: 安装项目依赖 (pnpm install)  
✅ **Step 7**: 显示部署信息和启动命令  

---

## 📋 部署后信息

### 数据库信息
- **容器名称**: `cogniflow-postgres`
- **数据库名**: `cogniflow`
- **用户名**: `cogniflow_user`
- **密码**: `cogniflow_password_2024`
- **端口**: `5432`
- **pgAdmin**: http://localhost:5050

### 默认管理员账号
- **用户名**: `admin`
- **密码**: `admin123`
- ⚠️ **请登录后立即修改密码！**

### 应用访问地址
- **前端**: http://127.0.0.1:5173
- **后端 API**: http://localhost:3001
- **API 文档**: http://localhost:3001/api

---

## 🔍 验证部署

```bash
# 运行验证脚本
./database/verify-deployment-docker.sh
```

验证脚本会检查：
- ✅ 容器运行状态
- ✅ 数据库连接
- ✅ 表结构完整性
- ✅ 默认数据
- ✅ 索引和触发器

---

## 📚 常用命令

### 容器管理
```bash
# 查看容器状态
docker ps

# 查看容器日志
docker logs -f cogniflow-postgres

# 停止所有容器
docker-compose down

# 重启容器
docker-compose restart

# 完全清理（删除数据）
docker-compose down -v
```

### 数据库操作
```bash
# 进入数据库命令行
docker exec -it cogniflow-postgres psql -U cogniflow_user -d cogniflow

# 查看所有表
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c '\dt'

# 查看用户数据
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c 'SELECT * FROM users;'

# 备份数据库
docker exec cogniflow-postgres pg_dump -U cogniflow_user cogniflow > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20251103.sql | docker exec -i cogniflow-postgres psql -U cogniflow_user -d cogniflow
```

### 项目开发
```bash
# 安装依赖
pnpm install

# 启动开发服务器（前后端一起）
pnpm run dev:postgres

# 仅启动前端
pnpm run dev

# 仅启动后端
cd server && pnpm run dev

# 构建生产版本
pnpm run build

# 运行 lint 检查
pnpm run lint
```

---

## 🛠️ 故障排查

### 问题 1: 端口被占用

**错误**: `port is already allocated`

**解决**:
```bash
# 查看占用端口的进程
lsof -i :5432
lsof -i :3001
lsof -i :5173

# 停止占用端口的容器
docker stop $(docker ps -q --filter "publish=5432")

# 或修改 docker-compose.yml 中的端口映射
```

### 问题 2: Docker 未启动

**错误**: `Cannot connect to the Docker daemon`

**解决**:
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### 问题 3: 容器启动失败

**解决**:
```bash
# 查看详细日志
docker-compose logs postgres

# 完全清理后重新部署
docker-compose down -v
./deploy-all.sh
```

### 问题 4: 数据库连接失败

**解决**:
```bash
# 检查容器是否运行
docker ps | grep cogniflow-postgres

# 检查数据库是否就绪
docker exec cogniflow-postgres pg_isready -U cogniflow_user -d cogniflow

# 重启容器
docker-compose restart postgres
```

### 问题 5: pnpm 未安装

**解决**:
```bash
# 全局安装 pnpm
npm install -g pnpm

# 或使用 npm 代替
npm install
npm run dev
```

---

## 🔄 重新部署

如果需要完全重新部署（清空所有数据）：

```bash
# 方式一: 使用部署脚本（推荐）
./deploy-all.sh

# 方式二: 手动清理后部署
docker-compose down -v
./deploy-all.sh
```

---

## 🌍 生产环境部署

在阿里云 ECS 或其他服务器上部署：

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd cogniflow

# 2. 运行部署脚本
./deploy-all.sh

# 3. 修改 vite.config.ts 添加域名
# 参考之前的配置添加 allowedHosts

# 4. 使用 PM2 管理进程（可选）
npm install -g pm2
pm2 start ecosystem.config.js
```

---

## 📊 数据库结构

部署脚本会创建以下表：

1. **users** - 用户表
2. **user_settings** - 用户配置
3. **items** - 条目表（任务、事件、笔记、URL、集合）
4. **user_templates** - 智能模板表
5. **tags** - 标签表
6. **activity_logs** - 活动日志
7. **user_statistics** - 用户统计
8. **system_logs** - 系统日志
9. **sessions** - 会话管理
10. **backups** - 备份记录

---

## 🎯 智能模板

系统会自动创建 3 个默认模板：

### 📰 日报模板
- 触发词: `/日报`
- 快速记录每日工作

### 👥 会议模板
- 触发词: `/会议`
- 快速创建会议纪要

### 📅 月报模板
- 触发词: `/月报`
- 快速创建月度总结

---

## 📖 相关文档

- [数据库部署指南](./DATABASE_DEPLOYMENT_GUIDE.md)
- [智能模板快速开始](./SMART_TEMPLATES_QUICKSTART.md)
- [用户手册](./USER_MANUAL.md)
- [开发者指南](./docs/DEVELOPER_GUIDE.md)

---

## 🆘 获取帮助

如遇到问题：

1. 查看容器日志: `docker logs -f cogniflow-postgres`
2. 运行验证脚本: `./database/verify-deployment-docker.sh`
3. 查看 Nginx 日志: `/var/log/nginx/cogniflow-error.log`
4. 检查环境变量: `cat server/.env`

---

## ✨ 特性

- 🚀 **一键部署** - 30秒完成所有配置
- 🐳 **Docker 容器化** - 环境隔离，便于管理
- 🔄 **自动清理** - 每次部署从零开始
- 📊 **完整数据库** - 10个表，40+索引
- 🎨 **智能模板** - 开箱即用的模板系统
- 🔐 **安全配置** - 密码加密，JWT 认证
- 📝 **详细日志** - 彩色输出，清晰明了

---

**现在就开始使用吧！** 🎉

```bash
./deploy-all.sh
```
