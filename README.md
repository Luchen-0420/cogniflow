# CogniFlow - AI 驱动的智能信息管理工具

<div align="center">

**让 AI 成为你的信息管家**

你只管记录，AI负责整理、分类、提醒

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-blue.svg)](database/)

[快速开始](#-快速开始) · [功能特性](#-核心功能) · [产品展示](#-产品展示) · [文档](#-文档中心)

</div>

---

## 🎬 产品预览

<div align="center">
  <table>
    <tr>
      <td width="50%">
        <img src="./imgs/main.png" alt="主界面" />
        <p align="center"><b>智能卡片管理</b></p>
      </td>
      <td width="50%">
        <img src="./imgs/broad.png" alt="看板视图" />
        <p align="center"><b>多维度看板</b></p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <img src="./imgs/cal.png" alt="日历视图" />
        <p align="center"><b>日历与冲突检测</b></p>
      </td>
      <td width="50%">
        <img src="./imgs/report.png" alt="统计报告" />
        <p align="center"><b>智能统计分析</b></p>
      </td>
    </tr>
  </table>
  
  <p><i>👆 点击查看<a href="#-产品展示">完整产品展示</a>了解更多界面细节</i></p>
</div>

---

## 📑 目录

- [💡 产品愿景](#-产品愿景)
- [📸 产品展示](#-产品展示)
- [✨ 核心功能](#-核心功能)
  - [🎴 多样化卡片类型](#-多样化卡片类型)
  - [🗄️ 灵活的存储模式](#️-灵活的存储模式)
  - [💰 API 成本控制](#-api-成本控制)
  - [⚡ 快捷输入](#-快捷输入)
  - [📊 智能报告与统计](#-智能报告与统计)
  - [🔔 时间冲突检测](#-时间冲突检测)
- [🚀 快速开始](#-快速开始)
- [🎯 使用场景](#-使用场景)
- [🗓️ 后续规划](#️-后续规划)
- [📚 文档中心](#-文档中心)
- [🤝 参与贡献](#-参与贡献)
- [📄 开源协议](#-开源协议)
- [💬 联系我们](#-联系我们)

---

## 💡 产品愿景

在信息爆炸的时代，我们每天面对大量碎片化信息：临时想法、待办事项、会议安排、学习笔记、重要链接...这些信息散落在不同的地方，难以管理和追踪。

**CogniFlow 的诞生是为了解决这个问题**：提供一个统一的入口，让你随手记录任何信息，AI 自动帮你分类、整理、提醒，让信息管理变得简单高效。

### 核心理念

- 🎯 **零心智负担** - 不用思考该把信息放在哪里，直接记录即可
- 🤖 **AI 智能处理** - 自动识别信息类型、提取关键信息、分类归档
- 📊 **统一管理** - 一个工具管理所有碎片化信息，不再需要多个应用
- 🚀 **快捷高效** - 像聊天一样快速输入，支持自然语言和快捷指令

---

## 📸 产品展示

### 主界面 - 智能卡片管理

<div align="center">
  <img src="./imgs/main.png" alt="CogniFlow 主界面" width="800"/>
  <p><i>统一的信息管理界面，支持多种卡片类型和快速输入</i></p>
</div>

**主要特性：**
- ✨ 卡片式设计，信息一目了然
- 🎯 快速筛选（任务/日程/笔记/资料/链接）
- 🔍 全文搜索，快速定位
- 📝 流式输入框，AI 自动识别和分类
- 🏷️ 标签系统，灵活组织信息

### 看板视图 - 多维度信息展示

<div align="center">
  <img src="./imgs/broad.png" alt="看板视图" width="800"/>
  <p><i>灵活的看板视图，按状态、优先级、标签等维度组织信息</i></p>
</div>

**主要特性：**
- 📋 看板布局（待办/进行中/已完成）
- 🖱️ 拖拽操作，快速更新状态
- 🎨 优先级颜色标识
- 📊 任务统计概览
- 🔄 实时同步更新

### 日历视图 - 时间安排可视化

<div align="center">
  <img src="./imgs/cal.png" alt="日历视图" width="800"/>
  <p><i>日历视图展示日程安排，自动检测时间冲突</i></p>
</div>

**主要特性：**
- 📅 月/周/日多种视图切换
- ⚠️ 时间冲突自动标红提醒
- 🕐 时间轴清晰展示
- 📌 一键创建日程
- 🔔 即将到来的事项提醒

### 统计报告 - 数据分析洞察

<div align="center">
  <img src="./imgs/report.png" alt="统计报告" width="800"/>
  <p><i>智能统计和数据可视化，了解工作效率和时间分配</i></p>
</div>

**主要特性：**
- 📈 任务完成率趋势图
- ⏰ 时间分配分析
- 🏷️ 标签使用热力图
- 📊 工作效率评估
- 💡 AI 智能建议

### 个人中心 - 设置与管理

<div align="center">
  <img src="./imgs/self.png" alt="个人中心" width="800"/>
  <p><i>个性化设置、API 配置、数据管理等功能</i></p>
</div>

**主要特性：**
- 🤖 AI 模型配置（API Key、模型选择）
- 💾 存储模式切换（本地/数据库）
- 📥 数据导入导出
- 🎨 主题切换（亮色/暗色）
- 💰 API 使用统计和成本控制

---

## ✨ 核心功能

### 🎴 多样化卡片类型

CogniFlow 支持五种智能卡片类型，满足不同的信息管理需求：

> 💡 在[主界面](#主界面---智能卡片管理)和[看板视图](#看板视图---多维度信息展示)中查看卡片的实际展示效果

- **📋 任务卡片** - 待办事项管理
  - 优先级标记（高/中/低）
  - 状态跟踪（待办/进行中/已完成）
  - 截止日期提醒
  - 标签分类

- **📅 日程卡片** - 时间安排管理
  - 开始/结束时间
  - 时间冲突自动检测
  - 日历视图展示
  - 提前提醒功能

- **📝 笔记卡片** - 知识记录
  - 富文本内容
  - 标签分组
  - 全文搜索
  - Markdown 支持

- **📚 资料卡片** - 文档资料管理
  - 文档描述
  - 附件支持
  - 分类归档
  - 快速检索

- **🔗 链接卡片** - URL 智能管理
  - 自动抓取网页标题
  - 网站图标显示
  - 描述摘要
  - 一键访问

### 🗄️ 灵活的存储模式

根据你的使用场景，选择最适合的存储方案：

#### 本地存储模式
- ✅ 开箱即用，无需配置
- ✅ 数据完全本地化，隐私安全
- ✅ 离线可用
- ✅ 适合个人使用
- ⚠️ 数据仅存储在浏览器，不支持跨设备同步

#### 多端同步存储模式（PostgreSQL）
- ✅ 数据持久化存储
- ✅ 多设备自动同步
- ✅ 团队协作支持
- ✅ 数据备份和恢复
- ✅ 企业级数据安全
- ✅ 支持大规模数据存储
- 💡 适合团队使用和长期使用

### 💰 API 成本控制

针对 AI 功能的 API 调用，CogniFlow 提供完善的成本控制机制：

- **预算设置** - 设置调用上限
- **详细日志** - 记录每次 API 调用详情，便于成本分析
- **【TODO】模型选择** - 支持不同价格档位的 AI 模型切换

### ⚡ 快捷输入

多种输入方式，让信息记录更快捷：

- **自然语言输入** - 像聊天一样输入，AI 自动识别类型
  ```
  "明天下午3点开会" → 自动创建日程
  "完成报告 #重要" → 自动创建任务
  ```

- **声明式前缀** - 使用前缀明确指定类型
  ```
  "任务: 完成项目文档"
  "笔记: React Hooks 学习心得"
  "@会议 周五团队例会"
  ```

- **智能模板** - 预设常用模板，一键创建
  - 日报模板（今日完成/遇到问题/明日计划）
  - 会议纪要（议题/讨论/行动项）
  - 周报/月报模板

### 📊 智能报告与统计

数据可视化和智能分析，让你全面了解工作状态：

> 📈 查看[统计报告界面](#统计报告---数据分析洞察)了解详细的数据可视化效果

- **任务统计**
  - 任务完成率趋势
  - 优先级分布
  - 标签分类统计
  - 逾期任务提醒

- **时间分析**
  - 日程时间分布
  - 工作时长统计
  - 时间冲突检测

- **效率报表**
  - 每日/每周/每月完成情况
  - 工作效率趋势图
  - 生产力报告

- **智能洞察**
  - AI 分析工作模式
  - 提供优化建议

### 🔔 时间冲突检测

智能检测日程冲突，避免时间安排重叠：

> 📅 在[日历视图](#日历视图---时间安排可视化)中查看冲突检测的实际效果

- ⚠️ 自动识别时间重叠的日程
- 🔴 醒目的红色视觉提示
- 💬 鼠标悬停显示冲突详情
- 🔄 实时更新冲突状态
- 📅 日历视图高亮显示



---

## 🚀 快速开始

> 💡 **新用户建议**：先使用本地存储模式快速体验，后续可随时切换到数据库模式
> 
> 📸 查看[产品展示](#-产品展示)了解界面和功能

### 本地存储模式（推荐新用户）

最快 3 步开始使用：

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/cogniflow.git

# 2. 安装依赖
cd cogniflow && pnpm install

# 3. 启动应用
pnpm run dev
```

访问 http://localhost:5173 立即体验！

### 数据库模式（推荐团队用户）

一键部署脚本，30 秒完成：

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/cogniflow.git && cd cogniflow

# 2. 一键部署（包含数据库、依赖、初始数据）
./deploy-all.sh

# 3. 启动应用
pnpm run dev:postgres
```

访问 http://localhost:5173 开始使用！

**默认账号**: admin / admin123（首次登录后请修改密码）

📚 **详细文档**: [快速开始指南](./docs/quickstart/QUICK_START.md) | [部署指南](./docs/deployment/DEPLOYMENT_GUIDE.md)

---

## 🎯 使用场景

### 个人知识管理
- 📝 学习笔记整理
- 💡 灵感快速捕捉
- 🔗 资料链接收藏
- 📖 读书笔记记录

### 工作任务管理
- ✅ 待办事项跟踪
- 📅 会议安排管理
- 📊 项目进度追踪
- 🎯 目标达成监控

### 团队协作
- 👥 多人信息共享
- 📋 任务分配协调
- 📝 会议纪要记录
- 🔄 工作交接文档

---

## 🗓️ 后续规划

我们正在积极开发更多功能，让 CogniFlow 成为你的全能信息助手：

### 即将推出

- **📆 日历应用同步**
  - 与 Google Calendar 双向同步
  - 支持 Outlook 日历集成
  - 与 Apple Calendar 互通
  - iCal 格式导入导出

- **📧 邮件应用集成**
  - 邮件内容自动转换为任务/笔记
  - 重要邮件智能提醒
  - 邮件中的日程自动添加到日历
  - 快捷邮件发送功能

- **🔔 通知提醒系统**
  - 桌面推送通知
  - 邮件提醒
  - 微信/钉钉提醒（webhook）
  - 自定义提醒规则
  - 智能提醒时间建议

- **📱 移动应用**
  - iOS 原生应用
  - Android 原生应用
  - PWA 离线支持
  - 移动端优化体验

### 长期愿景

- **🌐 更多集成**
  - Notion、飞书、企业微信等工具集成
  - GitHub Issues 同步
  - Jira 任务导入
  - Trello 看板集成

- **🤖 AI 能力升级**
  - 智能推荐相关内容
  - 自动生成总结报告
  - 语音转文字输入
  - 图像识别和OCR

- **👥 协作功能增强**
  - 实时协作编辑
  - 评论和讨论
  - 任务委派和跟进
  - 团队看板视图

---

## 🛠️ 技术栈

**前端**: React 18 · TypeScript · Tailwind CSS · Vite

**后端**: Node.js · Express · PostgreSQL

**AI**: 智谱 GLM-4 · 流式处理

**部署**: Docker · Docker Compose

---

## 📚 文档中心

- 📖 [用户手册](./docs/user-guide/USER_MANUAL.md) - 完整功能使用指南
- 🎯 [快速开始](./docs/quickstart/QUICK_START.md) - 3分钟上手
- 🛠️ [开发指南](./docs/development/DEVELOPER_GUIDE.md) - 开发者文档
- 🚀 [部署指南](./docs/deployment/DEPLOYMENT_GUIDE.md) - 生产环境部署
- 🔧 [配置说明](./docs/configuration/ENVIRONMENT.md) - 环境变量配置
- 📝 [更新日志](./docs/CHANGELOG.md) - 版本历史

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

### 声明式输入（指定类型）
使用前缀明确指定类型，AI 将按指定类型处理：

#### 笔记类型
```
笔记: 今天学习了 React Hooks，特别是 useEffect 的依赖数组机制很重要
需要注意清理副作用，避免内存泄漏
```
→ 创建为**笔记**，AI 生成简洁标题，内容保持原文

**支持的笔记前缀**：`笔记:`、`@笔记`、`note:`、`@note`

#### 任务类型
```
任务: 完成项目文档编写，包括API说明和使用指南
```
或
```
@待办 修复登录页面的样式问题
```
→ 创建为**任务**，AI 提取标题、优先级等信息

**支持的任务前缀**：`任务:`、`@任务`、`task:`、`@task`、`待办:`、`@待办`、`todo:`、`@todo`

#### 日程类型
```
日程: 明天下午3点团队会议，讨论Q4规划
```
或
```
@会议 周五上午10点产品评审会
```
→ 创建为**日程**，AI 提取时间、标题等信息

**支持的日程前缀**：`日程:`、`@日程`、`event:`、`@event`、`活动:`、`@活动`、`会议:`、`@会议`

#### 资料类型
```
资料: React 官方文档 - Hooks API 参考
```
或
```
@文档 项目架构设计说明书
```
→ 创建为**资料**，AI 提取标题和描述

**支持的资料前缀**：`资料:`、`@资料`、`data:`、`@data`、`文档:`、`@文档`

### 声明式输入特性
- ✅ **用户优先**：如果用户指定了类型，以用户输入为准
- ✅ **AI 辅助**：AI 仍会提取标题、时间、优先级、标签等信息
- ✅ **灵活便捷**：支持中英文、多种符号（冒号、@符号）
- ✅ **笔记特殊**：笔记类型标题由 AI 生成，内容保持原文

### URL 链接
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


## 🤝 参与贡献

我们欢迎任何形式的贡献！

- 🐛 [提交 Bug](https://github.com/your-repo/cogniflow/issues)
- 💡 [功能建议](https://github.com/your-repo/cogniflow/issues)
- 📖 [改进文档](./docs/)
- 💻 [提交代码](https://github.com/your-repo/cogniflow/pulls)

**贡献流程**:
1. Fork 本仓库
2. 创建特性分支 `git checkout -b feature/amazing-feature`
3. 提交更改 `git commit -m 'Add amazing feature'`
4. 推送分支 `git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议

这意味着你可以自由地：
- ✅ 商业使用
- ✅ 修改源码
- ✅ 分发
- ✅ 私人使用

唯一的要求是保留版权声明和许可声明。

---

## 💬 联系我们

我们很乐意听取你的反馈和建议！

- 📧 **邮箱**: support@cogniflow.app
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/your-repo/cogniflow/issues)
- 💬 **功能建议**: [GitHub Discussions](https://github.com/your-repo/cogniflow/discussions)
- 📖 **文档**: [在线文档](./docs/)
- 🌟 **给我们 Star**: 如果这个项目对你有帮助，请在 [GitHub](https://github.com/your-repo/cogniflow) 上给我们一个 ⭐

---

## 🙏 致谢

感谢以下开源项目和服务：

- [React](https://reactjs.org/) - 强大的 UI 框架
- [Tailwind CSS](https://tailwindcss.com/) - 优雅的样式解决方案
- [智谱 AI](https://open.bigmodel.cn/) - 卓越的 AI 能力
- [PostgreSQL](https://www.postgresql.org/) - 可靠的数据库
- [Vite](https://vitejs.dev/) - 极速的构建工具

以及所有为这个项目贡献代码、文档、建议的开发者们 ❤️

---