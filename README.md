# CogniFlow - 智能信息管理工具

> 你只管记录，我负责管理 - AI 驱动的智能信息管理工具  
> 让 AI 帮你整理碎片化信息

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-blue.svg)](database/)
[![Deploy](https://img.shields.io/badge/deploy-one--click-success.svg)](#-一键部署)

---

## 📖 简介

CogniFlow 是一款由 AI 驱动的智能信息管理工具，帮助您轻松管理日常工作和生活中的碎片化信息。

**核心理念**：
- 你只管记录，我负责管理
- 让 AI 帮你整理碎片化信息，自动识别和分类任务、日程、笔记等内容

---

## 🚀 一键部署

**30秒完成部署！** 支持 Docker 容器化部署，自动创建数据库和所有表。

### 一键部署（推荐）
```bash
# 1. 克隆项目
git clone

# 2. 进入项目目录
cd cogniflow

# 3. 运行一键部署脚本（会清空旧数据）
./deploy-all.sh

# 4. 启动服务
pnpm run dev:postgres
```

**就这么简单！** 脚本会自动：
- ✅ 清理旧容器和数据
- ✅ 启动 PostgreSQL 容器
- ✅ 创建 10 个数据库表
- ✅ 插入默认管理员账号（admin/admin123）
- ✅ 创建 3 个智能模板（日报、会议、月报）
- ✅ 安装所有依赖

访问 http://localhost:5173 开始使用！

📚 详细说明：[快速开始指南](./docs/quickstart/QUICK_START.md) | [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md)

### 手动部署
```bash
# 1. 启动数据库
docker-compose up -d

# 2. 初始化数据库
cd database
./deploy-database-docker.sh

# 3. 安装依赖
pnpm install

# 4. 启动开发服务
pnpm run dev:postgres
```

---

## 🚀 快速开始

### 方式一：快速体验（LocalStorage 模式，默认）
**适用场景**：简单试用，无需跨设备同步

```bash
# 1. 安装依赖
pnpm install

# 2. 配置 AI API（可选）
cp .env.example .env
# 编辑 .env 文件，填入 GLM API Key

# 3. 启动开发服务器
pnpm run dev

# 4. 访问应用
open http://127.0.0.1:5173
```

### 方式二：使用 PostgreSQL 数据库（推荐用于生产）
**适用场景**：
- ✅ 需要跨设备同步数据
- ✅ 多用户协作
- ✅ 大量数据存储
- ✅ 企业级应用

**快速启动（3 步）**：
```bash
# 1. 启动数据库
docker-compose up -d

# 2. 启动 API 服务器（新终端）
cd server && pnpm tsx index.ts

# 3. 修改 .env 切换到 PostgreSQL 模式
VITE_STORAGE_MODE=postgres
VITE_API_URL=http://localhost:3001/api

# 4. 启动前端
pnpm run dev
```

**详细指南**：
- 📚 [PostgreSQL 快速启动](./QUICKSTART_POSTGRES.md) - 5 分钟上手
- 📖 [数据库完整指南](./docs/DATABASE_GUIDE.md) - 深入了解
- 🔄 [数据迁移指南](./DATABASE_MIGRATION_GUIDE.md) - LocalStorage → PostgreSQL

### 方式三：使用 Supabase（已废弃）

---

## ✨ 主要特性

### 🤖 AI 智能处理
- **自动分类** - AI 自动识别并分类为任务、日程、笔记、资料、URL
- **智能提取** - 自动提取标题、标签、时间、优先级等信息
- **流式输入** - 像聊天一样快速记录信息

### 📊 高效管理
- **四大视图** - 即将发生、待办清单、笔记库、链接库
- **智能模板** - 预设日报、会议、月报等常用模板
- **时间冲突检测** - 自动检测日程时间冲突并提醒

### 🔄 数据安全
- **自动备份** - 定时自动备份数据到本地
- **导入导出** - 支持一键导出和导入所有数据
- **多用户支持** - 支持多用户独立数据管理

### 📱 响应式设计
- **移动端优化** - 完美支持手机、平板访问
- **暗黑模式** - 支持亮色/暗色主题切换
- **离线使用** - IndexedDB 本地存储支持

### 其他核心特性
- 📅 **日历视图** - 可视化查看日程安排
- 🏷️ **自动标签** - AI 自动提取关键词标签
- 🔗 **链接智能处理** - 自动获取网页标题和摘要
- 💾 **双模式存储** - 支持 LocalStorage 和 PostgreSQL
- 🔄 **数据迁移** - 一键迁移 LocalStorage 到数据库
- 🗄️ **PostgreSQL 数据库** - 企业级数据存储和管理（可选）
- 🔍 **自然语言查询** - 用自然语言搜索信息

---

## 📚 文档导航

### 🎯 快速上手
- [快速开始](./docs/quickstart/QUICK_START.md) - 3步完成部署
- [用户手册](./docs/user-guide/USER_MANUAL.md) - 完整功能使用指南
- [界面指南](./docs/user-guide/USER_INTERFACE_GUIDE.md) - 界面操作说明

### 🛠️ 开发文档
- [开发指南](./docs/development/DEVELOPER_GUIDE.md) - 开发者文档
- [数据库指南](./docs/development/DATABASE_GUIDE.md) - 数据库设计和操作
- [测试指南](./docs/development/TESTING_GUIDE.md) - 测试文档

### 🚀 部署运维
- [部署指南](./docs/deployment/DEPLOYMENT_GUIDE.md) - 生产环境部署
- [Docker 部署](./docs/deployment/DOCKER_DEPLOYMENT.md) - Docker 容器部署
- [安全指南](./docs/deployment/SECURITY_GUIDE.md) - 安全配置

### 📖 功能说明
- [AI 智能处理](./docs/features/AI_PROCESSING.md) - AI 功能详解
- [智能模板](./docs/features/SMART_TEMPLATES.md) - 模板系统使用
- [时间冲突检测](./docs/features/CONFLICT_DETECTION.md) - 冲突检测说明
- [自动备份](./docs/features/AUTO_BACKUP.md) - 备份功能说明
- [URL 智能处理](./docs/features/URL_PROCESSING.md) - URL 功能说明

### 🔧 配置说明
- [GLM API 配置](./docs/configuration/GLM_SETUP.md) - 智谱 AI 配置
- [环境变量](./docs/configuration/ENVIRONMENT.md) - 环境变量说明

---

## 💡 使用示例

### 快速记录
直接输入文本，AI 自动识别类型：
```
明天下午3点开会讨论项目进度
```
→ 自动创建为**日程**，提取时间、标题

```
完成用户认证模块的开发 #重要 #开发
```
→ 自动创建为**任务**，提取标签和优先级

```
https://github.com/example/project
```
→ 自动创建为**URL链接**，获取标题和描述

### 使用智能模板
输入触发词快速创建：
- 输入“日报” → 自动创建包含"今日完成"、"遇到问题"、"明日计划"的日报模板
- 输入“会议” → 自动创建包含"议题"、"讨论要点"、"行动项"的会议纪要

---

## 🔧 配置说明

复制 `.env.example` 为 `.env`：
```env
# AI API
VITE_GLM_API_KEY=your_api_key_here
VITE_GLM_MODEL=glm-4-flash

# Database
DATABASE_URL=postgresql://cogniflow_user:cogniflow_password_2024@localhost:5432/cogniflow
```

**获取 API Key**：访问 [智谱AI开放平台](https://open.bigmodel.cn/)

---

## 🗄️ 数据库说明

CogniFlow 现在支持 PostgreSQL 数据库，提供更强大的数据管理能力：
- **多用户支持** - 完善的用户系统和权限管理
- **数据持久化** - 企业级数据存储
- **高性能查询** - 优化的索引和查询性能
- **全文搜索** - 支持复杂的搜索功能
- **数据统计** - 丰富的数据分析和统计
- **活动日志** - 完整的操作记录
- **自动备份** - 定期数据备份机制

### 数据库管理
访问 pgAdmin 界面: http://localhost:5050
- 邮箱: `admin@example.com`
- 密码: `admin123`

### 数据库连接信息
- Host: localhost (或从 Docker 内部: postgres)
- Port: 5432
- Database: cogniflow
- Username: cogniflow_user
- Password: cogniflow_password_2024

### 相关文档
- [数据库快速启动](./DATABASE_QUICKSTART.md)
- [数据库完整指南](./DATABASE_GUIDE.md)
- [迁移状态和进度](./DATABASE_MIGRATION_STATUS.md)

---

## 🏗️ 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **IndexedDB** - 本地存储
- **React Router** - 路由管理
- **React Hooks** - 状态管理

### 后端
- **Node.js** - 运行时
- **Express** - Web 框架
- **PostgreSQL** - 数据库
- **Docker** - 容器化

### AI 服务
- **智谱 GLM-4** - AI 模型
- **流式处理** - 实时响应

---

## 📁 项目结构

```
cogniflow/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── services/           # 服务层
│   ├── db/                 # 数据库操作
│   ├── utils/              # 工具函数
│   ├── types/              # 类型定义
│   └── hooks/              # 自定义 Hooks
├── server/                 # 后端源码
│   ├── routes/             # API 路由
│   ├── services/           # 业务逻辑
│   └── db/                 # 数据库连接
├── database/               # 数据库脚本
│   ├── deploy.sql          # 建表脚本
│   └── init_default_templates.sql  # 默认数据
├── docs/                   # 文档目录
│   ├── quickstart/         # 快速开始
│   ├── user-guide/         # 用户指南
│   ├── development/        # 开发文档
│   ├── deployment/         # 部署文档
│   ├── features/           # 功能说明
│   └── configuration/      # 配置说明
├── public/                 # 静态资源
├── scripts/                # 工具脚本
├── .env.example            # 环境变量示例
└── package.json            # 项目配置
```

详细结构请查看 [开发指南](./docs/DEVELOPER_GUIDE.md)

---

## 🗄️ 数据库设计

项目使用 PostgreSQL，包含 10 个核心表：
- **users** - 用户信息
- **items** - 核心数据项（任务、日程、笔记等）
- **tags** - 标签系统
- **item_tags** - 项目标签关联
- **collections** - 集合/模板
- **collection_items** - 集合项目
- **backups** - 备份记录
- **user_templates** - 用户自定义模板
- **user_settings** - 用户设置
- **api_logs** - API 调用日志

详细设计：[数据库指南](./docs/development/DATABASE_GUIDE.md)

---

## 🔐 默认账号

部署后自动创建管理员账号：
- **用户名**: admin
- **密码**: admin123

⚠️ **重要**：首次登录后请立即修改密码！

### 测试账号
- 管理员: `admin` / `admin123`
- 测试用户: `testuser1` / `password123`

---

## 📋 最新更新

### v1.6.0 (2025-11-02)
- ⚠️ **新增时间冲突检测功能**
  - 自动检测日程事项之间的时间重叠
  - 醒目的红色视觉标识（边框、背景、标签）
  - 鼠标悬停显示详细冲突说明
  - 实时更新冲突状态（创建、编辑、删除、归档）
- 数据库查询性能优化
- 完整的测试用例和文档

### v1.5.0 (2025-01-29)
- 🎉 新增数据自动备份功能
- 💾 定期自动备份到本地
- 🔄 支持手动备份和恢复
- 📥 支持导出/导入备份文件
- ⚙️ 完整的备份管理界面

### v1.4.0
- ✅ 完全移除第三方依赖，使用本地存储
- ✅ 迁移到智谱 AI (GLM) API
- ✅ 优化 UI/UX，提高信息密度
- ✅ 实现卡片悬浮操作按钮
- ✅ 优化 URL 卡片布局

---

## 📝 更新日志

查看 [CHANGELOG.md](./docs/CHANGELOG.md) 了解版本更新信息。

---

## 🤝 贡献指南

欢迎贡献代码！请查看 [开发指南](./docs/development/DEVELOPER_GUIDE.md)

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 🙏 致谢

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [智谱 AI](https://open.bigmodel.cn/)
- [PostgreSQL](https://www.postgresql.org/)

---

## 📞 联系方式

- 问题反馈：[GitHub Issues](https://github.com/your-repo/cogniflow/issues)
- 文档：[docs](./docs/)

---
