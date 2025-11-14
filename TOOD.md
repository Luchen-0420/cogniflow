# CogniFlow 功能迭代计划

> **产品定位升级**：从"信息工作台"升级为"个人知识资产管理系统"  
> **核心理念**：让知识主动增值，而非被动存储

---

## 📋 目录

- [功能一：智能输入助手](#功能一智能输入助手)
- [功能二：知识输出引擎](#功能二知识输出引擎)
- [功能三：智能知识组织](#功能三智能知识组织)
  - [3.1 对话式知识导航 (/chat 命令)](#31-对话式知识导航)
  - [3.2 辅助写作（实时推荐）](#高级能力主动提醒)
  - [3.3 液态知识流](#32-液态知识流)
- [开发路线图](#开发路线图)

---

## 功能一：智能输入助手

### 🎯 功能概述

**功能名称**：智能调研助手（Smart Research Assistant）

**核心价值**：当用户开始新的调研或学习任务时，系统自动关联历史相关资料、分析知识缺口、推荐补充资源，让用户"站在过去的肩膀上"开始新工作。

**典型场景**：
- 用户输入："调研 AI Agent 产品的竞品分析"
- 用户创建调研类卡片，标题包含"研究""分析""了解"等关键词
- 用户添加特定标签（如 #调研、#学习）

---

### 📐 功能设计

#### 1.1 三层智能推荐机制

##### 第一层：历史关联（实时响应 < 0.5秒）

**功能描述**：
- 自动检索用户知识库中与当前主题相关的内容
- 包括：笔记、资料、链接、项目、任务等所有类型的卡片

**匹配算法**：
```
优先级 1：精确匹配（标题/标签包含相同关键词）
```

**展示规则**：
- 默认显示最相关的 Top 5 项
- 按相关度排序，显示匹配置信度
- 支持"查看全部 N 条相关内容"展开
- 每项显示：标题、创建时间、摘要（前100字）、相关度评分

**交互操作**：
- [一键加载] - 将选中的历史资料关联到当前卡片
- [查看详情] - 在侧边栏预览完整内容
- [查看关系图谱] - 可视化展示知识关联网络

---

##### 第二层：缺口分析（AI 分析 2-3秒）

**功能描述**：
- AI 分析用户已有知识的完整性、时效性、深度
- 智能提示可能缺失的调研维度或需要更新的内容

**分析维度**：
1. **知识结构完整度**
   - 识别缺失的关键维度（如：有技术分析，缺商业模式分析）
   - 对比标准调研框架，提示未覆盖的部分

2. **时效性检查**
   - 检测最新资料的时间
   - 如果超过 30 天，提示"可能需要更新"

3. **深度评估**
   - 判断是表面资料收集还是深度分析
   - 提示"建议补充：案例分析/数据支撑/对比实验"

4. **可行动性**
   - 评估当前知识是否足以支撑决策或输出
   - 给出"可以开始撰写"或"建议继续调研"的明确建议

**输出格式**：
```json
{
  "completeness": {
    "score": 65,
    "gaps": [
      {
        "type": "维度缺失",
        "description": "缺少商业模式和定价策略分析",
        "priority": "high"
      },
      {
        "type": "深度不足",
        "description": "技术实现仅停留在概念层面，缺少实际案例",
        "priority": "medium"
      }
    ]
  },
  "timeliness": {
    "latestDate": "2024-09-15",
    "needsUpdate": true,
    "reason": "最新资料距今已 2 个月，AI 领域变化快速"
  },
  "suggestions": [
    {
      "action": "补充资料",
      "details": "建议添加：产品定价、用户规模、融资情况"
    },
    {
      "action": "深化研究",
      "details": "选择 1-2 个典型产品进行深度体验和拆解"
    }
  ],
  "outline": [
    "1. 市场背景与趋势",
    "2. 竞品对比（功能/技术/商业模式）",
    "3. 核心差异点分析",
    "4. 机会与挑战",
    "5. 结论与建议"
  ]
}
```

**交互操作**：
- [生成调研大纲] - 基于分析结果自动生成结构化大纲
- [按建议创建子任务] - 将缺口转化为待办任务
- [忽略建议] - 用户可选择不采纳（系统记住偏好）

---

##### 第三层：外部推荐（可选，5-10秒）

**功能描述**：
- 基于知识缺口，从互联网推荐高质量补充资料
- 过滤用户已保存的链接，避免重复推荐

**资源来源**：
- 学术：Google Scholar、arXiv、Papers with Code
- 行业：ProductHunt、Hacker News、Reddit 相关社区
- 深度内容：Medium、个人博客、GitHub Awesome 列表

**推荐策略**：
- 优先推荐"高质量 + 针对性强"的内容（不是简单的搜索结果）
- 显示推荐理由："基于你缺少的'定价策略'维度推荐"
- 标注内容类型：[深度文章] [数据报告] [视频教程] [开源项目]

**交互操作**：
- [添加到稍后阅读] - 加入待阅读队列
- [直接导入为资料卡片] - 自动创建卡片并添加摘要
- [在新标签页打开] - 立即查看

---

#### 1.2 自动触发规则

**触发条件**（满足任一即可）：
1. 用户输入包含调研意图关键词：
   - 中文：调研、研究、分析、了解、学习、梳理
   - 英文：research、study、analyze、investigate

2. 创建特定类型卡片：
   - 卡片类型 = "资料"
   - 卡片标签包含：#调研、#学习、#分析

3. 用户手动触发：
   - 卡片操作菜单 → "智能关联"

**不触发的场景**（避免打扰）：
- 创建简短的临时笔记（< 50 字）
- 创建日程、任务类卡片
- 用户在快速记录模式下
- 快速体验的用户

---

#### 1.3 UI/UX 设计

**展示形式**：侧边栏（Sidebar）
```
┌─────────────────────────────────────────┐
│ 🔍 智能助手                              │
│ 正在分析「AI Agent 竞品调研」...         │
├─────────────────────────────────────────┤
│ 📚 历史关联 (5)                          │
│ ✓ 《GPT-4 Agent 框架总结》               │
│   2024-10-15 | 相关度 89%               │
│   [加载] [预览]                          │
│                                          │
│ ✓ 【项目】智能客服 Agent 原型            │
│   2024-09-20 | 相关度 76%               │
│   [加载] [预览]                          │
│                                          │
│ [查看全部 12 条]                         │
├─────────────────────────────────────────┤
│ 💡 缺口分析                              │
│ 知识完整度：65/100                       │
│                                          │
│ ⚠️  缺少维度：                           │
│ • 商业模式和定价策略                     │
│ • 用户规模数据                           │
│                                          │
│ ⏰ 时效性提醒：                          │
│ • 最新资料是 2 个月前，建议更新          │
│                                          │
│ [生成调研大纲] [创建子任务]              │
├─────────────────────────────────────────┤
│ 🌐 推荐资料 (3)                          │
│ • Awesome AI Agents [GitHub]             │
│   理由：缺少技术框架对比                 │
│   [添加]                                 │
│                                          │
│ • AI Agent 产品定价策略分析 [文章]       │
│   理由：补充商业模式维度                 │
│   [添加]                                 │
│                                          │
│ [查看更多推荐]                           │
└─────────────────────────────────────────┘
```

**交互细节**：
- 侧边栏从右侧滑入，不遮挡编辑区域
- 支持折叠/展开各个模块
- 显示加载进度条（第一层 → 第二层 → 第三层）
- 支持拖拽历史资料到编辑区（Markdown 引用格式）

---

## 功能二：知识输出引擎

### 🎯 功能概述

**功能名称**：智能知识结晶（Knowledge Crystallization Engine）

**核心价值**：定期自动盘点用户的笔记和资料，通过 AI 聚类分析，发现可以输出的知识主题，帮助用户将碎片化笔记转化为高价值的博客、文档、演讲等成果。

**核心理念**：
- 知识不输出 = 未完成的资产
- 系统主动提醒，而非依赖用户记忆
- 降低创作门槛，AI 生成初稿

---

### 📐 功能设计

#### 2.1 自动盘点机制

##### 触发方式

**方式 1：定时触发（推荐）**
```
• 每周日晚上 20:00（用户可自定义）
• 每月 1 号上午 9:00
• 发送通知：「本周知识盘点已就绪」
```

**方式 2：智能触发**
```
• 当某个主题积累 ≥ 5 条相关笔记时
• 当某个标签下的内容达到「可输出」成熟度时
• 立即发送通知
```

**方式 3：手动触发**
```
• 用户点击「知识盘点」按钮
• 可选择时间范围：最近 7 天 / 30 天 / 自定义
```

##### 用户偏好设置

```typescript
interface ReviewPreferences {
  enabled: boolean;              // 是否启用自动盘点
  schedule: {
    type: 'weekly' | 'monthly' | 'smart' | 'manual';
    weekday?: number;            // 0-6 (周日-周六)
    time?: string;               // "20:00"
    dayOfMonth?: number;         // 1-31
  };
  notificationChannel: 'app' | 'email' | 'both';
  autoSkip: {
    fragmentThreshold: number;   // 少于 N 条笔记不提醒
    excludeTags: string[];       // 排除特定标签
  };
}
```

---

#### 2.2 智能聚类分析

##### 步骤 1：主题发现

**算法流程**：
```
1. 获取时间范围内的所有笔记（排除任务/日程类）
2. 使用 GLM Embedding 生成向量
3. DBSCAN 聚类算法分组（自动发现主题数量）
4. 为每个聚类生成主题名称（AI 命名）
5. 提取关键词和核心观点
```

**聚类参数**：
```python
DBSCAN_CONFIG = {
  'eps': 0.35,              # 相似度阈值
  'min_samples': 3,         # 最少 3 条笔记成为主题
  'metric': 'cosine'        # 余弦相似度
}
```

**输出示例**：
```json
{
  "clusters": [
    {
      "id": 1,
      "theme": "AI Agent 产品分析",
      "noteCount": 7,
      "keywords": ["AI", "Agent", "多模态", "LangChain"],
      "dateRange": ["2024-10-15", "2024-11-10"],
      "coreInsights": [
        "多模态交互是关键差异点",
        "开源框架降低了开发门槛",
        "商业化路径仍在探索"
      ]
    },
    {
      "id": 2,
      "theme": "React 性能优化",
      "noteCount": 4,
      "keywords": ["React", "性能", "memo", "虚拟化"],
      "dateRange": ["2024-11-01", "2024-11-08"],
      "coreInsights": [
        "useCallback 和 useMemo 不是银弹",
        "虚拟列表对长列表效果显著"
      ]
    }
  ]
}
```

---

##### 步骤 2：成熟度评估

**评估维度**：
1. **完整性**（0-30分）
   - 是否有明确的论点？
   - 是否有支撑论据（数据/案例）？
   - 是否有结论或总结？

2. **逻辑性**（0-30分）
   - 观点之间是否有关联？
   - 是否形成了完整的论证链条？
   - 有无自相矛盾？

3. **深度**（0-20分）
   - 是否有独特洞察？
   - 超越了表面资料收集？
   - 有无实践验证？

4. **可读性**（0-20分）
   - 能否让他人理解？
   - 语言是否清晰？
   - 结构是否合理？

**成熟度等级**：
```
0-40分  → 碎片化 (Fragmented)
         建议：继续积累，暂不输出

41-70分 → 半成品 (Draft)
         建议：需要 1-2 小时整理，可以输出

71-100分 → 可输出 (Ready)
          建议：可直接生成初稿，快速发布
```

**AI 评估 Prompt**：
```typescript
const maturityPrompt = `
你是专业的内容评审专家。请评估以下笔记组是否适合输出为文章/文档：

主题：${theme}
笔记数量：${notes.length}

笔记内容：
${notes.map((n, i) => `
[笔记 ${i+1}] ${n.title}
时间：${n.date}
内容：${n.content}
`).join('\n---\n')}

请按以下维度打分（JSON 格式）：
{
  "completeness": {
    "score": 0-30,
    "hasThesis": boolean,
    "hasEvidence": boolean,
    "hasConclusion": boolean
  },
  "logic": {
    "score": 0-30,
    "isCoherent": boolean,
    "hasStructure": boolean
  },
  "depth": {
    "score": 0-20,
    "hasInsights": boolean,
    "beyondSurface": boolean
  },
  "readability": {
    "score": 0-20,
    "isClear": boolean
  },
  "totalScore": 0-100,
  "level": "碎片化" | "半成品" | "可输出",
  "strengths": string[],
  "gaps": string[],
  "recommendation": {
    "action": "继续积累" | "整理后输出" | "可立即输出",
    "estimatedWorkload": string,  // "需要 2 小时整理"
    "suggestedFormat": string[]   // ["博客文章", "技术文档"]
  }
}
`;
```

---

##### 步骤 3：输出建议

**基于成熟度自动匹配输出形式**：

| 成熟度 | 推荐格式 | 特点 | 预估工作量 |
|--------|----------|------|-----------|
| 碎片化 | 暂不输出 | 继续积累 | - |
| 半成品 | 结构化文档<br>个人知识库 | 内部沉淀，不对外发布 | 1-2 小时整理 |
| 可输出 | 博客文章<br>技术分享<br>演讲大纲<br>社交媒体 | 可对外发布 | 30 分钟润色 |

**具体输出形式**：

**1. 博客文章（2000-3000字）**
```
适合：完整的分析/总结/教程
包含：
• 引言（背景和动机）
• 主体（分小节详细阐述）
• 结论（总结和展望）
• AI 自动生成初稿，用户可编辑
```

**2. 结构化文档（知识库沉淀）**
```
适合：方法论总结/技术规范/经验沉淀
包含：
• 概述
• 详细步骤/要点
• 注意事项
• 示例代码/案例
• 自动生成表格和列表
```

**3. 演讲大纲（15-30分钟）**
```
适合：技术分享/产品介绍
包含：
• 开场（3 分钟）
• 核心内容（12 分钟，分 3-4 部分）
• Q&A 预设（3 个常见问题）
• 总结（2 分钟）
• 可导出为 PPT 提纲
```

**4. 社交媒体卡片**
```
适合：快速分享洞察
包含：
• 提炼 3 条核心观点
• 配图建议
• 话题标签推荐
• 140 字精简版 + 长文链接
```

---

#### 2.3 AI 生成初稿

##### 生成策略

**原则**：
- 保留用户的原始观点和数据（不篡改）
- 补充必要的背景和过渡（用醒目标记 AI 补充部分）
- 调整语言风格（用户可选：专业/通俗/学术）
- 结构化排版（自动添加小标题和分段）

**生成 Prompt**：
```typescript
const draftPrompt = `
你是专业的内容创作助手。请基于用户笔记生成${format}：

【用户笔记】（共 ${notes.length} 条）
${notes.map(n => `
---
标题：${n.title}
时间：${n.date}
内容：
${n.content}
---
`).join('\n')}

【输出要求】
1. 格式：${format}（博客文章/技术文档/演讲大纲）
2. 风格：${style}（专业严谨/通俗易懂/学术规范）
3. 长度：${wordCount} 字左右
4. 结构：
   ${format === '博客文章' ? `
   • 引人入胜的开头（勾起读者兴趣）
   • 清晰的小标题（3-5 个章节）
   • 每段 100-150 字
   • 有力的结尾（总结+展望）
   ` : ''}
5. 内容处理：
   • ✅ 保留：用户的所有观点、数据、案例
   • ✅ 补充：必要的背景介绍、过渡语句
   • ✅ 优化：语言流畅性、逻辑连贯性
   • ❌ 禁止：篡改用户观点、编造数据

【特殊标记】
对于 AI 补充的内容，用 <!-- AI 补充 --> 注释标记，方便用户识别和删除。

【输出格式】
Markdown 格式，包含：
- 标题（吸引人的）
- 正文（结构化排版）
- 引用注释（如果使用了外部资料）

开始创作：
`;
```

##### 初稿编辑器

**功能特性**：
```
• 左右分屏：左侧原始笔记，右侧 AI 初稿
• 高亮 AI 补充部分（可一键删除）
• 支持拖拽原始笔记内容到初稿
• 实时预览 Markdown 渲染效果
• 版本历史（保留生成过程的多个版本）
```

**快捷操作**：
```
• [重新生成]：调整风格/长度后重新生成
• [导出 Markdown]：下载 .md 文件
• [一键发布]：集成个人博客/Notion/GitHub
• [保存为资料卡片]：添加到 CogniFlow 资料库
```

---

#### 2.4 价值追踪

##### 追踪维度

**1. 知识转化率**
```
• 输入：本周新增 15 条笔记
• 聚类：识别出 3 个主题
• 输出：完成 2 篇文章 + 1 个文档
• 转化率：13.3%（2/15）
```

**2. 知识复用度**
```
• 该文章引用了 8 条历史笔记
• 其中 3 条是 2 个月前创建的
• 说明：知识被"激活"，产生复利效应
```

**3. 时间成本**
```
• 原始输入时间：5 小时（记笔记）
• 输出时间：1.5 小时（AI 生成 + 人工润色）
• 传统方式：约 4 小时（从零开始写）
• 节省：2.5 小时（62.5%）
```

**4. 内容质量**
```
• 字数：2800 字
• 结构完整度：95%
• 原创度：85%（用户内容占比）
• AI 辅助度：15%（补充背景和过渡）
```

##### 可视化展示

**个人知识资产仪表盘**：
```
┌─────────────────────────────────────────┐
│ 📊 本月知识资产报告                       │
├─────────────────────────────────────────┤
│ 📝 输入                                  │
│ • 新增笔记：45 条                         │
│ • 新增资料：12 条                         │
│ • 累计知识库：328 条                      │
│                                          │
│ 💎 输出                                  │
│ • 博客文章：3 篇                          │
│ • 技术文档：2 份                          │
│ • 演讲大纲：1 个                          │
│                                          │
│ ⚡ 效率                                   │
│ • 知识转化率：13.3% ↑                    │
│ • 节省时间：8.5 小时                      │
│ • 知识复用：激活 15 条历史笔记            │
│                                          │
│ 🏆 成就                                  │
│ • 连续输出 4 周 🔥                        │
│ • 累计发布 12 篇文章                      │
│ • 知识影响力：235 次引用                  │
│                                          │
│ [查看详细报告] [分享成就]                 │
└─────────────────────────────────────────┘
```

---

#### 2.5 完整交互流程

**阶段 1：收到通知**
```
📱 通知：「本周知识盘点已就绪，发现 3 个可输出主题」
[立即查看] [稍后提醒] [本周跳过]
```

**阶段 2：查看盘点结果**
```
┌─────────────────────────────────────────┐
│ 🎯 本周知识盘点（2024-11-04 ~ 11-10）    │
├─────────────────────────────────────────┤
│ 📊 本周概览                              │
│ • 新增笔记：12 条                         │
│ • 新增资料：5 条                          │
│ • 识别主题：3 个                          │
│ • 可输出：2 个 ⭐                         │
│ • 继续积累：1 个                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💎 主题 1：AI Agent 产品分析              │
│ ⭐ 可输出                                 │
├─────────────────────────────────────────┤
│ 📝 包含 7 条笔记（2024-10-15 ~ 11-10）   │
│ 🏷️ 关键词：AI, Agent, 多模态, LangChain  │
│                                          │
│ ✅ 优势                                  │
│ • 数据完整（3 篇论文 + 2 个实测案例）     │
│ • 观点清晰（识别出 3 个核心差异点）       │
│ • 逻辑连贯（形成完整的分析框架）          │
│                                          │
│ 💡 建议输出                              │
│ • 博客文章（推荐）- 预计 30 分钟润色      │
│ • 技术文档 - 适合内部沉淀                │
│ • 演讲大纲 - 可用于技术分享               │
│                                          │
│ [开始创作] [查看笔记] [暂不处理]          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🌱 主题 2：产品规划思考                   │
│ ⏳ 继续积累                               │
├─────────────────────────────────────────┤
│ 📝 包含 3 条笔记                          │
│ 🏷️ 关键词：产品, 规划, 用户需求          │
│                                          │
│ 💡 当前状态                              │
│ • 完整度：45/100                         │
│ • 建议：观点还较零散，建议继续积累 2 周   │
│                                          │
│ [查看详情]                                │
└─────────────────────────────────────────┘
```

**阶段 3：AI 生成初稿**
```
用户点击 [开始创作] → [选择博客文章]

┌────────────────────┬────────────────────┐
│ 📚 原始笔记 (7)     │ ✨ AI 生成初稿      │
├────────────────────┼────────────────────┤
│ • GPT-4 Agent...   │ # AI Agent 产品... │
│ • LangChain...     │                    │
│ • AutoGPT...       │ ## 引言             │
│                    │ 近年来，AI Agent...│
│ [全部展开]          │ <!-- AI 补充 -->    │
│                    │                    │
│                    │ ## 核心差异点       │
│                    │ ### 1. 多模态...    │
│                    │                    │
│                    │ [重新生成]          │
│                    │ [导出 MD]           │
│                    │ [一键发布]          │
└────────────────────┴────────────────────┘

💡 提示：高亮部分为 AI 补充内容，可点击删除
```

**阶段 4：完成输出**
```
✅ 输出完成

┌─────────────────────────────────────────┐
│ 📝《AI Agent 产品的三个进化方向》         │
│ • 类型：博客文章                          │
│ • 字数：2800 字                           │
│ • 来源：7 条笔记 + 5 条资料               │
│ • 创建时间：2024-11-10 21:30             │
│ • 发布平台：[添加链接]                    │
│                                          │
│ 📊 价值统计                              │
│ • 知识复用：整合了 12 条碎片知识           │
│ • 时间节省：2.5 小时（相比从零开始）       │
│ • 质量评分：A+ （结构完整，论据充分）      │
│                                          │
│ 🔗 自动关联                              │
│ • 已将该文章添加到资料库                  │
│ • 下次调研时会智能推荐                    │
│                                          │
│ [查看文章] [分享] [继续下一个主题]         │
└─────────────────────────────────────────┘
```

---

#### 2.6 技术实现

##### 数据库设计

**新增表：knowledge_reviews（知识盘点记录）**
```sql
CREATE TABLE knowledge_reviews (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  review_type VARCHAR(20),                    -- weekly/monthly/manual
  time_range_start DATE,
  time_range_end DATE,
  clusters JSONB,                              -- 聚类结果
  outputs JSONB,                               -- 输出记录
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_reviews ON knowledge_reviews(user_id, created_at);
```

**新增表：knowledge_outputs（知识输出）**
```sql
CREATE TABLE knowledge_outputs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  review_id INT REFERENCES knowledge_reviews(id),
  title VARCHAR(500),
  output_type VARCHAR(50),                    -- blog/doc/speech/card
  content TEXT,
  source_note_ids INT[],                      -- 来源笔记 IDs
  word_count INT,
  quality_score INT,                          -- 0-100
  time_saved_hours DECIMAL(4,2),
  published_url VARCHAR(1000),
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX idx_user_outputs ON knowledge_outputs(user_id, created_at);
```

**扩展表：items（添加向量字段）**
```sql
ALTER TABLE items 
ADD COLUMN embedding_vector vector(1024);     -- 存储 GLM Embedding

-- 创建向量索引（加速相似度搜索）
CREATE INDEX idx_embedding ON items 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);
```

##### API 设计

**端点 1：触发知识盘点**
```typescript
POST /api/knowledge/review
Request Body:
{
  "timeRange": {
    "start": "2024-11-04",
    "end": "2024-11-10"
  },
  "options": {
    "minClusterSize": 3,
    "includeTypes": ["note", "material"]
  }
}

Response:
{
  "reviewId": 123,
  "summary": {
    "totalNotes": 12,
    "clustersFound": 3,
    "readyToOutput": 2
  },
  "clusters": [
    {
      "id": 1,
      "theme": "AI Agent 产品分析",
      "noteCount": 7,
      "maturity": {
        "score": 85,
        "level": "可输出"
      },
      "suggestions": [ /* ... */ ]
    }
  ]
}
```

**端点 2：生成输出初稿**
```typescript
POST /api/knowledge/generate-draft
Request Body:
{
  "clusterId": 1,
  "outputType": "blog",          // blog/doc/speech/card
  "style": "professional",        // professional/casual/academic
  "wordCount": 2500
}

Response (Stream):
{
  "status": "generating",
  "progress": 0.3,
  "preview": "# AI Agent 产品的三个进化方向\n\n近年来..."
}

Final Response:
{
  "outputId": 456,
  "content": "完整的 Markdown 内容",
  "metadata": {
    "wordCount": 2800,
    "sourceNotes": [12, 34, 56],
    "generatedAt": "2024-11-10T21:30:00Z"
  }
}
```

**端点 3：获取价值统计**
```typescript
GET /api/knowledge/stats?period=month

Response:
{
  "period": {
    "start": "2024-11-01",
    "end": "2024-11-30"
  },
  "input": {
    "newNotes": 45,
    "newMaterials": 12,
    "totalInLibrary": 328
  },
  "output": {
    "blogs": 3,
    "docs": 2,
    "speeches": 1
  },
  "efficiency": {
    "conversionRate": 0.133,
    "timeSavedHours": 8.5,
    "knowledgeReused": 15
  },
  "achievements": [
    {
      "type": "streak",
      "value": 4,
      "label": "连续输出 4 周"
    }
  ]
}
```

##### 核心算法

**聚类算法（DBSCAN）**
```typescript
import { DBSCAN } from 'density-clustering';

async function clusterNotes(notes: Item[], userId: number) {
  // 1. 获取所有笔记的向量（从数据库读取预计算的）
  const vectors = notes.map(n => n.embedding_vector);
  
  // 2. DBSCAN 聚类
  const dbscan = new DBSCAN();
  const clusters = dbscan.run(
    vectors,
    0.35,    // eps: 半径
    3        // minPts: 最小点数
  );
  
  // 3. 处理噪声点（未分类的笔记）
  const noise = notes.filter((_, i) => 
    !clusters.some(c => c.includes(i))
  );
  
  // 4. 为每个聚类生成主题名称
  const namedClusters = await Promise.all(
    clusters.map(async (indices) => {
      const clusterNotes = indices.map(i => notes[i]);
      return {
        notes: clusterNotes,
        theme: await generateThemeName(clusterNotes),
        keywords: extractKeywords(clusterNotes),
        maturity: await assessMaturity(clusterNotes)
      };
    })
  );
  
  return {
    clusters: namedClusters,
    noise: noise
  };
}
```

**主题命名 Prompt**
```typescript
const themeNamingPrompt = `
以下是一组相关的笔记，请提炼出一个简洁的主题名称（5-10 个字）：

${notes.map(n => `• ${n.title}`).join('\n')}

要求：
1. 准确概括核心内容
2. 简洁易懂
3. 不要太宽泛（避免"学习笔记"这类）
4. 不要太具体（避免过于细节的技术术语）

只返回主题名称，不要解释：
`;
```

**成熟度评估（完整版在 2.2 节）**
```typescript
async function assessMaturity(notes: Item[]) {
  const prompt = maturityPrompt(notes);  // 见 2.2 节
  const result = await callGLM4(prompt, { responseFormat: 'json' });
  
  return {
    score: result.totalScore,
    level: result.level,
    strengths: result.strengths,
    gaps: result.gaps,
    recommendation: result.recommendation
  };
}
```

---

#### 2.7 性能优化

**策略 1：后台预处理**
```
• 定时任务在凌晨 2:00 预先聚类分析
• 用户查看时直接返回缓存结果
• 避免用户等待 AI 分析的时间
```

**策略 2：渐进式生成**
```
• 使用 Server-Sent Events (SSE) 流式返回
• 用户看到"正在生成..."的动画和实时预览
• 体验类似 ChatGPT 的打字效果
```

**策略 3：向量索引**
```
• 使用 pgvector 插件存储 embedding
• 创建 IVFFlat 索引加速相似度检索
• 聚类性能提升 10-50 倍
```

---

#### 2.8 开发优先级

**MVP 版本（2-3 周）**：
- [ ] 手动触发盘点
- [ ] 基础聚类算法（基于标签和关键词）
- [ ] 简单的主题展示
- [ ] AI 生成博客初稿

**V1.0 版本（4-6 周）**：
- [ ] 定时自动触发
- [ ] 语义聚类（使用 embedding）
- [ ] 成熟度评估
- [ ] 多种输出格式（博客/文档/演讲）
- [ ] 基础价值统计

**V2.0 版本（8-12 周）**：
- [ ] 智能触发（主题成熟时提醒）
- [ ] 完整的价值追踪仪表盘
- [ ] 一键发布到外部平台（Notion/GitHub/WordPress）
- [ ] 用户偏好学习（记住输出偏好）
- [ ] 知识资产报告（月度/年度）

---

## 开发路线图

### 🎯 总体规划

```
Phase 1: MVP（1-2 个月）
├─ 功能一 MVP：历史关联（关键词匹配）
├─ 功能二 MVP：手动盘点 + 基础聚类
├─ 功能三 MVP：/chat 对话 + 基础写作辅助
└─ 目标：验证核心价值，收集用户反馈

Phase 2: V1.0（3-4 个月）
├─ 功能一 V1.0：语义检索 + 缺口分析
├─ 功能二 V1.0：自动盘点 + 成熟度评估
├─ 功能三 V1.0：智能对话 + 实时写作推荐 + 液态知识流
└─ 目标：完整的知识资产管理闭环

Phase 3: V2.0（6-8 个月）
├─ 功能一 V2.0：外部推荐 + 知识图谱
├─ 功能二 V2.0：价值追踪 + 智能触发
├─ 功能三 V2.0：对话上下文记忆 + 知识时间线
└─ 目标：打磨用户体验，形成产品壁垒
```

---

### 📅 详细时间表

#### 第 1-2 周：功能一 MVP

- [ ] 数据库设计：knowledge_links 表
- [ ] API：获取历史关联（关键词匹配）
- [ ] UI：侧边栏组件
- [ ] 测试：覆盖 5 个典型场景

**验收标准**：
- 用户输入"调研 XXX"时，0.5 秒内显示相关笔记
- 准确率 ≥ 70%（人工评估 20 个案例）

---

#### 第 3-4 周：功能二 MVP

- [ ] 数据库设计：knowledge_reviews、knowledge_outputs 表
- [ ] API：手动触发盘点
- [ ] 聚类算法：基于标签和关键词
- [ ] UI：盘点结果展示页面
- [ ] AI：博客初稿生成

**验收标准**：
- 用户可以手动触发盘点，3 秒内看到结果
- 聚类准确率 ≥ 60%（人工评估）
- AI 生成的初稿可用度 ≥ 70%（需要人工润色）

---

#### 第 5-8 周：功能一 V1.0

- [ ] 集成 GLM Embedding API
- [ ] 实现语义检索（余弦相似度）
- [ ] 缺口分析 AI Prompt 设计与优化
- [ ] 调研大纲自动生成
- [ ] 性能优化：向量预计算和缓存

**验收标准**：
- 语义检索准确率 ≥ 85%
- 缺口分析有效率 ≥ 75%（用户采纳建议的比例）
- 响应时间：第一层 < 0.5s，第二层 < 3s

---

#### 第 9-12 周：功能二 V1.0

- [ ] 定时任务：自动触发盘点
- [ ] 语义聚类：使用 embedding + DBSCAN
- [ ] 成熟度评估：完整的 AI 打分体系
- [ ] 多种输出格式：博客/文档/演讲/卡片
- [ ] 价值统计：基础版仪表盘

**验收标准**：
- 自动盘点准时触发率 100%
- 聚类准确率 ≥ 80%
- 成熟度评估准确率 ≥ 75%
- 用户每周输出 ≥ 1 篇内容

---

#### 第 13-16 周：功能三 MVP + 迭代优化

**功能三开发（2周）**：

- [ ] /chat 命令对话功能
- [ ] 知识检索问答实现
- [ ] 基础写作辅助（关键词匹配推荐）
- [ ] 对话界面 UI 开发
- [ ] 侧边栏实时推荐组件

**验收标准**：
- 用户可以通过 /chat 与 AI 对话查找知识
- 写作时侧边栏能推荐相关笔记（准确率 ≥ 60%）
- 响应时间：对话 < 2s，写作推荐 < 1s

**整体迭代优化（2周）**：

- [ ] 用户反馈收集与分析
- [ ] A/B 测试：不同 Prompt 效果对比
- [ ] 性能优化：数据库查询、API 调用
- [ ] UI/UX 打磨：交互细节优化
- [ ] 文档完善：用户手册、开发文档

---

### 🔬 实验验证

在开发前，建议先做小规模实验：

**实验 1：语义检索效果**
- 准备 50 条真实笔记
- 人工标注相关关系
- 测试不同 embedding 模型和相似度阈值
- 选择最优方案

**实验 2：聚类效果**
- 准备 3 周的笔记数据（约 30-50 条）
- 尝试不同聚类算法（DBSCAN、K-means、Hierarchical）
- 人工评估聚类合理性
- 确定最佳参数

**实验 3：AI 生成初稿质量**
- 准备 5 组笔记（不同主题和成熟度）
- 测试不同 Prompt 策略
- 人工评分：准确性、完整性、可用性
- 迭代优化 Prompt

---

## 📊 成功指标

### 功能一：智能输入助手

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 触发率 | ≥ 60% | 调研类卡片中有多少触发了智能助手 |
| 采纳率 | ≥ 50% | 用户接受了多少推荐的历史资料 |
| 准确率 | ≥ 80% | 推荐的资料中，用户认为相关的比例 |
| 响应速度 | < 0.5s | 第一层推荐的加载时间 |
| 节省时间 | ≥ 2h/周 | 用户调研效率提升（用户调研统计） |

### 功能二：知识输出引擎

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 参与率 | ≥ 40% | 收到盘点通知后，有多少用户查看 |
| 输出率 | ≥ 20% | 查看盘点后，有多少用户完成输出 |
| 输出频率 | ≥ 1 次/月 | 用户平均每月输出内容数量 |
| 初稿可用度 | ≥ 75% | AI 生成的初稿，用户保留的内容比例 |
| 转化率 | ≥ 10% | 笔记转化为输出内容的比例 |

### 功能三：智能知识组织

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| /chat 使用率 | ≥ 30% | 用户使用过对话功能的比例 |
| 对话满意度 | ≥ 80% | AI 回答的有效性评分 |
| 写作辅助采纳率 | ≥ 40% | 用户接受推荐的笔记/链接的比例 |
| 写作效率提升 | +25% | 相比未开启辅助时的写作速度 |
| 引用准确率 | ≥ 75% | 推荐内容被实际引用的比例 |

### 整体产品指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| 日活跃用户（DAU）| +30% | 相比改版前 |
| 留存率（7 日）| ≥ 50% | 新用户 7 天后仍在使用 |
| NPS 得分 | ≥ 50 | 用户推荐意愿 |
| 知识库规模增长 | +50% | 用户笔记数量增长 |
| 用户满意度 | ≥ 4.2/5 | 功能评分 |

---

## 🔧 技术准备

### 依赖库

**前端**：
```json
{
  "react-force-graph": "^1.43.0",      // 知识图谱可视化
  "recharts": "^2.8.0",                 // 价值统计图表
  "react-markdown": "^9.0.0",           // Markdown 渲染
  "react-split": "^2.0.14",             // 分屏编辑器
  "@uiw/react-md-editor": "^4.0.0",    // Markdown 编辑器
  "lodash.debounce": "^4.0.8",         // 防抖处理
  "lru-cache": "^10.0.0"               // 缓存管理
}
```

**后端**：
```json
{
  "pgvector": "^0.1.0",                 // PostgreSQL 向量扩展
  "density-clustering": "^1.3.0",       // DBSCAN 聚类
  "natural": "^6.7.0",                  // 关键词提取
  "node-cron": "^3.0.2",                // 定时任务
  "diff": "^5.1.0",                     // 文本差异对比
  "uuid": "^9.0.0"                      // 会话 ID 生成
}
```

**AI API**：
- 智谱 GLM-4：文本生成
- 智谱 GLM Embedding：语义检索
- （可选）Perplexity API：外部推荐

---

### 数据库准备

**1. 安装 pgvector 扩展**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**2. 添加向量字段**
```sql
ALTER TABLE items 
ADD COLUMN embedding_vector vector(1024);
```

**3. 创建索引**
```sql
-- 向量相似度索引
CREATE INDEX idx_embedding ON items 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- 全文搜索索引
CREATE INDEX idx_content_search ON items 
USING gin(to_tsvector('english', content));
```

**4. 批量计算历史数据的向量**
```typescript
// 脚本：scripts/compute-embeddings.ts
async function computeAllEmbeddings() {
  const items = await db.query('SELECT id, content FROM items');
  
  for (const item of items) {
    const embedding = await getEmbedding(item.content);
    await db.query(
      'UPDATE items SET embedding_vector = $1 WHERE id = $2',
      [embedding, item.id]
    );
  }
}
```

---

## 功能三：智能知识组织

### 🎯 创新方向概述

传统知识管理工具（Roam/Obsidian）的问题：
- ❌ 需要手动建立双向链接
- ❌ 图谱炫酷但难以理解（一团乱麻）
- ❌ 维护成本高，链接越多越乱
- ❌ 用"网状结构"模拟大脑，但人脑不是这样工作的

**核心创新**：不是让用户"整理"知识，而是让 AI 主动"组织"知识

---

### 📐 功能设计

#### 3.1 对话式知识导航

##### 核心理念
> 不是让用户"翻找"知识，而是让用户"对话"获取知识。AI 是知识管家，负责理解需求并召回内容

##### 产品形态：/chat 命令

**功能名称**：知识对话助手（Knowledge Chat Assistant）

**触发方式**：
```
用户在任意输入框输入：/chat
或点击顶部工具栏的「💬 对话」按钮
```

**核心能力**：

**1. 知识检索问答**
```
用户：上次那个 React 性能优化的笔记在哪？

AI 管家：找到了 3 条相关笔记：
  1. 《useCallback 使用心得》2024-11-05
  2. 《虚拟列表实现》2024-10-20
  3. 《memo 优化案例》2024-09-15
  
  你最近在看第 1 条，是这个吗？
  
用户：对，就是这个

AI 管家：已打开。顺便提醒，你在第 2 条笔记中
        提到要"后续补充具体数据"，现在补充吗？
```

**2. 知识总结与提炼**
```
用户：帮我总结一下关于 AI Agent 的所有笔记

AI 管家：你有 7 条关于 AI Agent 的笔记，
        主要观点包括：
        
        1. 技术架构（3条笔记）
           • 多模态交互是关键差异点
           • LangChain 提供了完整的开发框架
           
        2. 产品分析（2条笔记）
           • AutoGPT vs GPT-4：对比实测
           • 商业化路径仍在探索
           
        3. 实践经验（2条笔记）
           • 开发智能客服的踩坑记录
           
        要生成完整的总结报告吗？
```

**3. 知识关联发现**
```
用户：这个笔记和我之前的哪些内容相关？

AI 管家：发现了 5 条相关笔记：
  
  强相关（相似度 > 85%）：
  • 《LangChain 实践》- 都提到了 Agent 框架
  • 《GPT-4 API 使用》- 都涉及多模态能力
  
  弱相关（相似度 60-85%）：
  • 《产品技术选型》- 都讨论了技术决策
  • 《用户体验优化》- 都关注交互设计
  
  [查看关联图谱] [批量关联]
```

**4. 知识时间线回顾**
```
用户：我对 AI 的理解是怎么演变的？

AI 管家：分析了你 6 个月的笔记，发现了 3 个认知转折点：
  
  阶段 1（6月）：初步了解
  • 认为 AI = GPT = 聊天机器人
  
  阶段 2（8月）：深入探索
  • 开始研究 Agent、多模态、Fine-tuning
  • 笔记从"是什么"转向"怎么做"
  
  阶段 3（11月）：实践应用
  • 关注商业化、产品化、用户体验
  • 开始输出系统性总结
  
  [查看完整时间线] [生成成长报告]
```

##### UI/UX 设计

**界面布局**：

```
┌─────────────────────────────────────────┐
│ 💬 知识对话助手                          │
├─────────────────────────────────────────┤
│                                          │
│ 你：我想了解之前调研的 AI Agent 产品      │
│                                          │
│ AI：我找到了你的调研笔记（7条），         │
│     主要包括：                            │
│     • 产品对比：AutoGPT vs LangChain     │
│     • 技术实现：多模态交互                │
│     • 商业模式：还在探索阶段              │
│                                          │
│     你想深入了解哪个方面？                │
│     或者我帮你生成一份完整报告？          │
│                                          │
│ 你：生成报告                              │
│                                          │
│ AI：好的，我把 7 条笔记整合成了一份       │
│     2500字的分析报告，包括：              │
│     1. 市场现状                           │
│     2. 产品对比                           │
│     3. 技术分析                           │
│     4. 趋势预测                           │
│                                          │
│     [查看报告] [导出 PDF] [继续补充]      │
│                                          │
├─────────────────────────────────────────┤
│ 💡 快捷操作：                             │
│ • 总结最近一周的笔记                      │
│ • 查找关于「性能优化」的内容              │
│ • 我对某个主题的理解演变                  │
│                                          │
├─────────────────────────────────────────┤
│ 输入你的问题...                  [发送]   │
└─────────────────────────────────────────┘
```

**快捷入口**：
```
1. 全局触发：任意输入框输入 /chat
2. 顶部工具栏：💬 对话按钮
3. 卡片右键菜单：「与 AI 讨论这条笔记」
4. 搜索框：「问 AI」按钮（在搜索结果页）
```

##### 高级能力：主动提醒

**场景 1：知识召回（已有功能）**
```
用户正在写博客提到"性能优化"
→ AI 自动提示：「你有 3 条相关笔记，要引用吗？」
```

**场景 2：辅助写作（新增功能）** ⭐

**功能描述**：
在用户使用 Markdown 编辑器写作时，侧边栏实时分析写作内容，智能推荐相关笔记、链接和资料，帮助用户获取灵感、补充论据、完善观点。

**触发条件**：
- 用户在 Markdown 编辑器中输入
- 使用 `/blog` 命令打开写作模式
- 创建「博客」或「文章」类型的卡片

**实时分析机制**：

```typescript
// 写作辅助引擎
interface WritingAssistant {
  // 实时分析用户正在写的内容
  async analyzeWritingContext(content: string, cursorPosition: number) {
    // 1. 提取当前段落和上下文
    const currentParagraph = extractCurrentParagraph(content, cursorPosition);
    const context = {
      currentSentence: extractSentence(content, cursorPosition),
      currentParagraph: currentParagraph,
      wholDocument: content,
      keywords: extractKeywords(currentParagraph)
    };
    
    // 2. 语义分析：用户在讨论什么？
    const intent = await analyzeIntent(context);
    
    // 3. 根据意图检索相关知识
    const recommendations = await this.getRecommendations(intent, context);
    
    return recommendations;
  }
  
  // 智能推荐
  async getRecommendations(intent: Intent, context: Context) {
    return {
      // 相关笔记（提供论据支持）
      relatedNotes: await searchSimilarNotes(context.keywords),
      
      // 相关链接（提供外部资料）
      relatedLinks: await searchSimilarLinks(context.keywords),
      
      // 可引用的数据/案例
      quotableContent: await findQuotableContent(context),
      
      // AI 建议（写作建议）
      suggestions: await generateWritingSuggestions(context)
    };
  }
}
```

**UI 展示**：

```
写作界面（左右分屏）：

┌────────────────────┬────────────────────┐
│ ✍️ 写作区           │ 💡 智能助手         │
├────────────────────┼────────────────────┤
│ # AI Agent 的发展  │ 🔍 实时建议         │
│                    │                    │
│ 近年来，AI Agent   │ 相关笔记 (3)        │
│ 技术快速发展，     │ ┌────────────────┐ │
│ 多模态交互成为...  │ │ 📝 LangChain   │ │
│ [光标在这里]        │ │    使用心得     │ │
│                    │ │    提到：多模态 │ │
│ [用户正在输入...]   │ │    [插入引用]   │ │
│                    │ └────────────────┘ │
│                    │                    │
│                    │ ┌────────────────┐ │
│                    │ │ 📝 AutoGPT测试 │ │
│                    │ │    包含案例数据 │ │
│                    │ │    [查看详情]   │ │
│                    │ └────────────────┘ │
│                    │                    │
│                    │ 相关资料 (2)        │
│                    │ • AI Agent论文     │
│                    │ • 技术博客         │
│                    │                    │
│                    │ 💬 AI 建议          │
│                    │ • 建议补充具体案例 │
│                    │ • 可以引用数据支撑 │
│                    │                    │
│                    │ [暂时关闭助手]      │
└────────────────────┴────────────────────┘

💡 提示：输入 @ 可快速引用笔记，输入 /ask 可向 AI 提问
```

**智能交互**：

**1. 自动刷新推荐**
```
• 用户每输入 50-100 字，自动刷新一次推荐
• 避免频繁刷新打扰（使用防抖）
• 如果写作主题变化明显，立即更新
```

**2. 一键引用**
```
用户点击「插入引用」：

在光标位置自动插入：
> 根据之前的测试[^1]，多模态交互确实能显著提升...

文末自动添加：
[^1]: 来自笔记《LangChain 使用心得》(2024-10-20)
```

**3. 拖拽插入**
```
• 用户可以从侧边栏拖拽笔记到编辑区
• 自动转换为引用格式
• 保留源笔记的链接
```

**4. 智能问答**
```
用户在写作中遇到问题：
输入 /ask 我当时是怎么解决性能问题的？

AI 立即在侧边栏回答：
根据你的笔记《React 性能优化》，你用了 3 个方法：
1. 使用 React.memo
2. 虚拟列表
3. 代码分割

[插入详细内容] [查看原笔记]
```

**性能优化**：
```typescript
// 1. 防抖处理（避免频繁调用）
const debouncedAnalyze = debounce(analyzeWritingContext, 1000);

// 2. 增量更新（只分析变化部分）
function incrementalAnalyze(newContent: string, oldContent: string) {
  const diff = getDiff(oldContent, newContent);
  if (diff.length < 50) {
    // 变化太小，不刷新
    return;
  }
  // 只分析新增部分
  analyzePartial(diff);
}

// 3. 缓存机制
const cache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 5 // 5分钟缓存
});
```

**用户控制**：
```
• 用户可以关闭辅助写作功能
• 用户可以调整刷新频率（实时/每段/手动）
• 用户可以选择只显示笔记/链接/建议
```

**场景 3：知识更新（已有功能）**
```
AI 发现用户的笔记中提到"GPT-4"
但最近 OpenAI 发布了新版本
→ AI 提示：「你的笔记可能需要更新，要看最新信息吗？」
```

**场景 4：知识增值（已有功能）**
```
AI 发现某个主题积累了 5 条笔记
→ AI 提示：「你的 AI Agent 笔记可以整理成文章了」
```

**场景 5：知识盘点（已有功能）**
```
每周五下午
→ AI 提示：「本周你新增了 12 条笔记，我帮你整理了 3 个主题」
```

##### 技术实现

**1. 对话系统架构**

```typescript
// 对话管理器
class ChatManager {
  private conversationHistory: Message[] = [];
  private userContext: UserContext;
  
  async handleUserMessage(message: string): Promise<AIResponse> {
    // 1. 更新对话历史
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // 2. 分析用户意图
    const intent = await this.analyzeIntent(message);
    
    // 3. 根据意图执行操作
    const result = await this.executeIntent(intent);
    
    // 4. 生成回复
    const reply = await this.generateReply(result, intent);
    
    // 5. 更新对话历史
    this.conversationHistory.push({
      role: 'assistant',
      content: reply,
      timestamp: new Date()
    });
    
    return reply;
  }
  
  // 意图识别
  async analyzeIntent(message: string): Promise<Intent> {
    const prompt = `
分析用户在知识管理系统中的对话意图：

用户消息："${message}"

对话历史：
${this.conversationHistory.slice(-5).map(m => 
  `${m.role}: ${m.content}`
).join('\n')}

用户当前上下文：
- 正在查看：${this.userContext.currentItem?.title || '无'}
- 最近操作：${this.userContext.recentActions.join(', ')}
- 活跃标签：${this.userContext.activeTags.join(', ')}

可能的意图类型：
1. search - 查找知识（关键词：找、搜索、哪里、记得）
2. summarize - 总结知识（关键词：总结、归纳、概括）
3. connect - 关联发现（关键词：相关、关联、有什么联系）
4. timeline - 时间线回顾（关键词：演变、变化、发展历程）
5. output - 生成内容（关键词：写、生成、整理、输出）
6. question - 一般问答（其他问题）

返回 JSON：
{
  "type": "意图类型",
  "entities": {
    "keywords": ["提取的关键词"],
    "timeRange": "时间范围（如有）",
    "targetItems": ["相关的笔记ID（如有）"]
  },
  "confidence": 0.0-1.0
}
`;
    
    return await callGLM4(prompt, { responseFormat: 'json' });
  }
  
  // 执行意图
  async executeIntent(intent: Intent): Promise<any> {
    switch (intent.type) {
      case 'search':
        return await this.searchKnowledge(intent.entities.keywords);
        
      case 'summarize':
        return await this.summarizeKnowledge(intent.entities);
        
      case 'connect':
        return await this.findConnections(intent.entities);
        
      case 'timeline':
        return await this.generateTimeline(intent.entities);
        
      case 'output':
        return await this.prepareOutput(intent.entities);
        
      default:
        return await this.answerQuestion(intent);
    }
  }
}
```

**2. 写作辅助 API**

```typescript
// 端点：实时写作建议
POST /api/writing/assist

Request Body:
{
  "content": "用户正在写的内容",
  "cursorPosition": 256,
  "context": {
    "itemId": 123,
    "itemType": "blog"
  }
}

Response:
{
  "relatedNotes": [
    {
      "id": 45,
      "title": "LangChain 使用心得",
      "snippet": "多模态交互是关键...",
      "relevance": 0.89,
      "quotable": true  // 是否适合引用
    }
  ],
  "relatedLinks": [
    {
      "id": 67,
      "title": "AI Agent 论文",
      "url": "https://...",
      "relevance": 0.76
    }
  ],
  "suggestions": [
    {
      "type": "add_evidence",
      "message": "建议补充具体案例支撑观点",
      "priority": "high"
    },
    {
      "type": "add_data",
      "message": "可以引用相关数据增强说服力",
      "priority": "medium"
    }
  ]
}
```

**3. 数据库扩展**

```sql
-- 对话历史表
CREATE TABLE chat_conversations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  session_id VARCHAR(100),
  messages JSONB,                    -- 对话消息数组
  context JSONB,                     -- 对话上下文
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions ON chat_conversations(user_id, session_id);

-- 写作辅助历史
CREATE TABLE writing_assistance_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  item_id INT REFERENCES items(id),
  content_snapshot TEXT,             -- 写作内容快照
  recommendations JSONB,             -- 推荐结果
  user_actions JSONB,                -- 用户操作（接受/忽略）
  created_at TIMESTAMP DEFAULT NOW()
);
```

##### 开发优先级

**MVP 版本（1-2 周）**：
- [ ] /chat 命令基础对话功能
- [ ] 简单的知识检索问答
- [ ] 对话界面 UI

**V1.0 版本（3-4 周）**：
- [ ] 完整的意图识别系统
- [ ] 知识总结、关联发现功能
- [ ] 写作辅助基础版（关键词匹配）
- [ ] 侧边栏实时推荐

**V2.0 版本（6-8 周）**：
- [ ] 写作辅助高级版（语义分析）
- [ ] 知识时间线回顾
- [ ] 对话上下文记忆
- [ ] 多轮对话优化

---

#### 3.2 液态知识流

##### 核心理念
> 知识不是固体（固定结构），也不是气体（完全混乱），而是液体——**既保持连接，又能灵活流动**

**知识流定义**：
```
知识流 = 按某种规则动态筛选的知识集合

不是文件夹，而是"流"：
• 流1：「最近在思考的」→ 最近 7 天频繁查看/修改的笔记
• 流2：「待深化的碎片」→ 单条笔记、没有关联、内容较短
• 流3：「可以输出的成熟知识」→ 某个主题下积累了 5+ 条笔记
• 流4：「冷落的旧知识」→ 30 天未查看，但曾经重要的笔记
```

##### 产品形态

```
┌─────────────────────────────────────────┐
│ 🌊 知识河流                              │
├─────────────────────────────────────────┤
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 🔥 热流：最近在思考的（12）           │ │
│ ├─────────────────────────────────────┤ │
│ │ [AI Agent产品] [React性能] [周报]    │ │
│ │    ↓            ↓          ↓         │ │
│ │ 自动流动，最新的在上方                 │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 💎 成熟流：可以输出的（3个主题）       │ │
│ ├─────────────────────────────────────┤ │
│ │ [AI Agent分析]  ← 7条笔记，可写博客   │ │
│ │ [性能优化总结]  ← 4条笔记，可做文档   │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 🌱 碎片流：待深化的（8）              │ │
│ ├─────────────────────────────────────┤ │
│ │ [产品想法] [技术笔记] ...             │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 💤 冷流：被冷落的（15）               │ │
│ ├─────────────────────────────────────┤ │
│ │ [2个月前的调研] ← AI提示：可能需要更新│ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [自定义流] [查看全部流]                  │
└─────────────────────────────────────────┘
```

##### 开发优先级

**MVP 版本（2-3 周）**：
- [ ] 四个基础流（热流/成熟流/碎片流/冷流）
- [ ] 基于规则的自动分类
- [ ] 流的展示界面

**V1.0 版本（4-6 周）**：
- [ ] 自定义流规则
- [ ] 知识在流之间的自动流转
- [ ] 流的洞察和建议

---

## 📖 相关文档

- [产品规划文档](./docs/prd.md) - 完整的产品需求
- [开发指南](./docs/development/DEVELOPER_GUIDE.md) - 开发规范
- [API 文档](./docs/api/) - 接口定义
- [用户手册](./docs/user/) - 功能使用说明

---

## 💬 讨论与反馈

如有疑问或建议，请：
1. 提交 GitHub Issue
2. 在微信交流群讨论
3. 发送邮件至 product@cogniflow.app

---

## 📝 变更日志

### v1.1 (2024-11-13)
- ✨ 新增：功能三 - 智能知识组织
- ✨ 新增：/chat 命令 - 对话式知识导航
- ✨ 新增：辅助写作功能 - 实时智能推荐
- ✨ 新增：液态知识流概念
- 📝 更新：开发路线图，加入功能三的开发计划
- 📝 更新：成功指标，加入对话和写作辅助相关指标
- 📝 更新：技术依赖，加入相关库

### v1.0 (2024-11-13)
- 🎉 初始版本
- ✨ 功能一：智能输入助手
- ✨ 功能二：知识输出引擎
- 📋 完整的开发路线图和成功指标

---

**最后更新**：2024-11-13  
**版本**：v1.1  
**负责人**：产品团队

