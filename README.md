# CogniFlow · AI 驱动的信息工作台

<div align="center">
  <strong>让 AI 接手信息杂务，团队与个人都能专注在真正重要的事情上。</strong>
  <br/><br/>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  <img alt="node" src="https://img.shields.io/badge/node-%3E=20-43853d.svg"/>
  <img alt="postgres" src="https://img.shields.io/badge/database-PostgreSQL%2016-4169e1.svg"/>
  <img alt="status" src="https://img.shields.io/badge/status-beta-f97316.svg"/>
  <br/><br/>
  <a href="https://ci.ai-knowledgepoints.cn/">🚀 在线体验</a> ·
  <a href="#-快速开始">⚡ 快速开始</a> ·
  <a href="#-系统架构">🧱 系统架构</a> ·
  <a href="#-文档导航">📚 文档导航</a>
</div>

---

## 🚀 简介

CogniFlow 是一款为“信息爆炸时代”打造的智能工作台，支持多种卡片类型（任务、日程、笔记、资料、链接），通过智谱 GLM 模型自动解析文本与附件，完成分类、字段抽取、冲突检测、报告生成等操作。项目支持本地离线体验和 PostgreSQL 持久化部署，并提供完整的部署脚本、任务调度与成本控制体系。

---

## ✨ 核心亮点

- **全栈 AI 能力**：基于智谱 GLM 文本与视觉 API，支持自然语言输入、文件识别、智能标签、自动摘要与报告，内置 `@help` 快捷命令，随时唤出指引弹窗查看常见操作。
- **双模存储**：浏览器 IndexedDB 秒级体验 + PostgreSQL 多人协同模式，随时切换，覆盖个人与团队需求。
- **事件提醒闭环**：内置日程冲突检测、提醒队列与 QQ SMTP 邮件推送，可自定义提醒窗口与发送频率，提醒日志完整可追踪。
- **附件与写作**：支持图片、PDF、Office 文档等上传并自动生成摘要、标签，同时 `/blog` 快捷命令可直接打开 Markdown 编辑器，沉浸式撰写文章或知识卡片。
- **API 成本护栏**：按照用户类型扣减 AI 调用次数，支持个人 API Key，部署脚本会自动写入默认配额。
- **安全与可运维性**：JWT 鉴权、角色控制、日志审计、数据库验证脚本、一键部署与回滚、详细安全指南。

---

## 🧱 系统架构

```
┌────────────────────────────┐
│ 前端 (Vite + React + TS)   │
│ • UI + 状态管理            │
│ • IndexedDB 本地模式       │
│ • 通过 REST 调用后端       │
└────────────┬─────────────┘
             │
             ▼
┌────────────────────────────┐
│ API 服务 (Node.js + Express)│
│ • JWT 认证 / RBAC           │
│ • 业务路由 & 校验           │
│ • Cron 提醒服务             │
│ • 附件处理 & AI 调用        │
└───────┬───────────┬───────┘
        │           │
        │           │
        ▼           ▼
┌────────────┐  ┌────────────────────────┐
│PostgreSQL  │  │外部服务                │
│• 主数据存储│  │• 智谱 GLM 文本/视觉 API │
│• 触发器函数│  │• QQ SMTP 邮件           │
│• API 配额   │  │• 本地文件系统(附件)     │
└────────────┘  └────────────────────────┘
```

- 通过 `deploy-all.sh` 自动拉起 PostgreSQL 与 pgAdmin、初始化表结构与索引、写入默认模板与管理员账号。
- 附件统一存储在 `server/uploads`（可通过 `UPLOAD_DIR` 指定绝对路径），支持生成缩略图与 AI 分析结果。
- 提醒服务默认每分钟巡检一次即将开始的日程并发送邮件，可通过 `server/services/reminderService.ts` 调整。

---

## 🛠 技术栈与服务

| 模块 | 技术/依赖 | 说明 |
|------|-----------|------|
| Web 前端 | React 18 · TypeScript · Vite · Tailwind · shadcn/ui | 主界面、看板、日历、报告等功能 |
| API 服务 | Node.js · Express · pg · jsonwebtoken · multer · nodemailer | REST API、认证、文件上传、提醒与日志 |
| AI 能力 | 智谱 GLM-4/GLM-4V · eventsource-parser | 文本与视觉分析、流式输出 |
| 数据存储 | PostgreSQL 16 · Docker Compose · SQL 脚本 | 多表设计（users/items/tags/attachments/...）+ 54 个索引 |
| 调度 & 工具 | Cron Scheduler · scripts/* | API 使用统计、提醒任务、部署自检、测试脚本 |

更多细节请参见 `docs/development/DEVELOPER_GUIDE.md` 与 `docs/deployment/DATABASE_DEPLOYMENT_GUIDE.md`。

---

## ⚙️ 环境要求

- macOS / Linux / Windows (WSL2)。
- Node.js ≥ 20.x、pnpm ≥ 9.x（首次运行会自动安装）。
- Docker + Docker Compose（PostgreSQL 模式必需）。
- 外部服务：
  - 智谱 AI API Key（系统默认 Key 可用于开发，生产建议为每位用户配置个人 Key）。
  - QQ 邮箱 SMTP（开启授权码后写入 `EMAIL_USER/EMAIL_PASSWORD` 即可启用邮件提醒）。

---

## 🚀 快速开始

### 方式一：本地极速体验（IndexedDB）

```bash
git clone https://github.com/your-repo/cogniflow.git
cd cogniflow
pnpm install
cp .env.example .env              # 保持 VITE_STORAGE_MODE=local
pnpm run dev
```

打开 `http://127.0.0.1:5173` 即可体验全部前端功能（数据保存在浏览器 IndexedDB，支持离线，关闭浏览器后仍可保留）。

### 方式二：PostgreSQL 团队部署（推荐）

```bash
cd cogniflow
chmod +x deploy-all.sh
./deploy-all.sh                   # 按提示输入 yes，脚本会清空旧容器和数据
pnpm run dev:postgres             # 同时启动前端 + API 服务
```

- 前端：`http://127.0.0.1:5173`
- API：`http://localhost:3001/api`
- pgAdmin：`http://localhost:5050`（账号 `admin@example.com` / 密码 `admin123`）
- 默认管理员：`admin` / `admin123`（首次登录后请立即修改）

部署脚本还会自动生成：
- API 使用配额（注册用户 40 次、快速体验 10 次，个人 API Key 可无限制）
- `server/.env` 与 `.env`（含数据库、JWT、邮件、前端地址等配置）
- 数据库校验脚本：`./database/verify-deployment-docker.sh`

更多环境与排障指南可参考 `docs/quickstart/QUICK_START.md` 与 `docs/deployment/DEPLOY_GUIDE.md`。

---

## 🧭 快捷命令与帮助

- `/blog`：在任意输入框触发后立即打开全屏 Markdown 编辑器，可用于日报、周报、博客文章或知识库内容撰写，保存后自动生成资料卡片并支持版本管理。
- `@help`：弹出操作指引，内置常见任务（创建卡片、切换视图、配置 AI、附件上传等）的快速教程与跳转入口，新手无需离开当前页面即可查阅。
- 邮件提醒：在 PostgreSQL 模式下默认启用后台巡检，结合 QQ SMTP 自动发送“日程开始前 5 分钟”提醒邮件，历史记录可在 `reminder_logs` 表中追踪。

---

## 🔧 环境变量

### 前端 (`.env`)

| 变量 | 说明 | 示例 / 默认 | 备注 |
|------|------|-------------|------|
| `VITE_STORAGE_MODE` | 存储模式 | `local` / `postgres` | `postgres` 时会启用全部 API 功能 |
| `VITE_API_URL` | API 根地址 | `http://127.0.0.1:3001/api` | PostgreSQL 模式必填 |
| `VITE_GLM_API_KEY` | 系统级智谱 Key | `sk-xxxxx` | 个人 Key 可在前端设置中覆盖 |
| `VITE_GLM_MODEL` | 默认文本模型 | `glm-4-flash` | 支持热切换 |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 历史遗留的对象存储/认证支持 | - | 可留空 |
| `VITE_PRIVACY_POLICY_URL` / `VITE_USER_POLICY_URL` | 隐私/用户协议链接 | 可选 | 登录页开关由 `VITE_SHOW_POLICY` 控制 |

完整说明见 `docs/configuration/ENVIRONMENT.md`。

### 后端 (`server/.env`)

| 变量 | 说明 | 示例 / 默认 |
|------|------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL 连接信息 | `localhost:5432 / cogniflow / cogniflow_user / cogniflow_password_2024` |
| `PORT` | API 服务端口 | `3001` |
| `FRONTEND_URL` | CORS 白名单 | `http://127.0.0.1:5173` |
| `JWT_SECRET` | JWT 加密密钥 | 自动生成 |
| `EMAIL_USER`, `EMAIL_PASSWORD` | 邮件提醒账号 & 授权码 | 需要手动补充 |
| `ZHIPU_API_KEY` | 默认智谱 Key | 可与前端一致 |
| `UPLOAD_DIR` | 附件根目录 | 默认 `server/uploads` |

---

## 📂 项目结构速览

```
cogniflow/
├── src/                     # 前端源码
│   ├── components/          # UI 与业务组件
│   ├── pages/               # 仪表盘 / 报告 / 设置
│   ├── db/                  # IndexedDB & PostgreSQL 适配层
│   ├── services/            # API/AI/成本服务
│   └── utils/               # AI 解析、提醒、导入导出等工具
├── server/                  # Express API 服务
│   ├── routes/              # items/users/templates/attachments 等 REST 路由
│   ├── services/            # Reminder、Email、AI Vision、Attachment
│   └── db/                  # pg Pool、事务封装
├── database/                # SQL 脚本、迁移、验证工具
├── scripts/                 # test-api / verify-database / install-db-deps 等脚本
├── docs/                    # 用户、开发、部署、功能文档
└── deploy-all.sh            # 一键部署脚本
```

---

## 🧪 验证与开发脚本

- `./database/verify-deployment-docker.sh`：验证容器状态、表结构、索引、默认数据。
- `./scripts/test-api.sh`：快速检查核心 API（登录、创建条目、查询、删除）。
- `./scripts/test-smart-templates.sh`：校验模板触发词与生成内容。
- `pnpm run lint`：Biome + ast-grep 组合校验。
- `pnpm run dev:postgres`：以双进程模式启动前端（Vite）与后端（Express）。

---

## 📚 文档导航

- **快速上手**：[docs/quickstart/QUICK_START.md](./docs/quickstart/QUICK_START.md)、[docs/quickstart/STARTUP_GUIDE.md](./docs/quickstart/STARTUP_GUIDE.md)
- **部署运维**：[docs/deployment/DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md)、[docs/deployment/DATABASE_DEPLOYMENT_GUIDE.md](./docs/deployment/DATABASE_DEPLOYMENT_GUIDE.md)、[docs/deployment/SECURITY_GUIDE.md](./docs/deployment/SECURITY_GUIDE.md)
- **功能说明**：智能模板、冲突检测、附件、API 配额等详见 `docs/features/*`
- **开发指南**：`docs/development/DEVELOPER_GUIDE.md`、`docs/development/DATABASE_GUIDE.md`、`docs/development/TESTING_GUIDE.md`
- **更新记录**：`docs/CHANGELOG.md`
- **产品规划**：`docs/prd.md`

---

## 📅 更新与路线图

- 版本更新详见 `docs/CHANGELOG.md`，最新脚本版本为 `deploy-all.sh v1.2.0`，新增个人 API Key、AI 调用限额与提醒队列。
- 中长期规划（移动端、第三方日历、通知中心等）可参考 `docs/prd.md`。

---

## 🤝 参与贡献

欢迎提交 Issue、PR 或文档修订：

1. Fork 仓库并创建分支：`git checkout -b feature/awesome`
2. 提交代码：`git commit -m "feat: add awesome feature"`
3. 运行 `pnpm run lint` 与相关脚本
4. 发起 Pull Request 并附上测试说明

我们使用 Conventional Commits 语义提交，更多规范见 `docs/development/DEVELOPER_GUIDE.md`。

---

## 📞 支持与社区

- 📧 邮箱：support@cogniflow.app
- 🐞 Bug / 功能建议：GitHub Issues（仓库开放后会补充链接）
- 📖 文档中心：`./docs`
- 💬 微信交流群（二维码 7 天有效，失效请在群公告或 Issue 中索取最新图）

<div align="center">
  <img src="./imgs/group.png" alt="CogniFlow 微信交流群二维码" width="260"/>
  <p><em>扫码加入「cogniflow 交流群」，与核心团队直接交流</em></p>
</div>

---

## 📝 许可证

项目遵循 MIT License（待在仓库根目录补充 LICENSE 文件）。使用或二次开发时请保留原作者版权信息。

---

## 🙏 致谢

感谢 React、Tailwind、shadcn/ui、PostgreSQL、智谱 AI、Vite 等优秀项目的支持，以及所有为 CogniFlow 贡献代码、文档与反馈的伙伴。