# Commit Message

```
feat: 优化 URL 总结、编辑面板、时间显示和编辑器体验

## 主要优化

### 1. URL 总结功能优化
- 优化 fetchURLContent 函数，调用后端 Edge Function 获取实际网页内容
- 优化 generateURLSummary 函数，使用实际抓取的网页内容生成更准确的总结
- 优化 AI 提示词，针对 GitHub、技术文档等不同类型提供更具体的分析指导
- 移除 Supabase 依赖，改用直接 fetch 和降级方案，提高兼容性
- 修复外部推荐链接的可访问性检查

### 2. 编辑面板 UI 优化
- 优化 EditItemDialog UI，统一整体风格，添加图标和视觉引导
- 添加开始时间（start_time）和结束时间（end_time）字段支持
- 添加同步状态显示，实时显示保存状态和保存时间戳
- 优化时间设置区域，独立显示并支持响应式布局
- 改进按钮样式和交互反馈

### 3. 时间显示逻辑修复
- 修复 ItemCard 的时间显示逻辑，优先使用 end_time，如果没有则使用 due_date
- 在 EditItemDialog 中，当设置了 due_date 但没有 end_time 时，自动将 end_time 设置为 due_date
- 确保更新后重新检测时间冲突，包括 due_date 变更的情况
- 修复后端 API，当更新 due_date 时也触发冲突检测

### 4. Markdown 编辑器自动换行
- 为 Markdown 编辑器添加自动换行样式，支持长文本自动换行
- 优化编辑器输入区域和预览区域的换行显示
- 代码块保持不换行（使用横向滚动）
- 表格和链接支持自动换行

### 5. Dialog 滚动锁定修复
- 修复 Dialog 关闭后 body 滚动被锁定的问题
- 添加双重保障机制：Dialog 组件层面和 DialogContent 组件层面
- 使用 MutationObserver 监听 Dialog 状态变化
- 恢复 body 和 html 元素的滚动样式，移除锁定类名
- 支持多个延迟恢复，确保在所有情况下都能恢复滚动

## 技术改进

- 移除对 Supabase Edge Function 的硬依赖，提高系统兼容性
- 优化时间冲突检测逻辑，支持 due_date 变更触发检测
- 改进 UI 组件的状态管理和用户反馈
- 增强错误处理和降级方案

## 修复的问题

- 修复 URL 总结不准确的问题（如 RAGFlow 被错误描述为"文本生成工具"）
- 修复时间显示不更新的问题（设置截止时间后卡片仍显示旧时间）
- 修复时间冲突检测不触发的问题（更新 due_date 后未重新检测）
- 修复 Markdown 编辑器长文本无法换行的问题
- 修复 Dialog 关闭后页面无法滚动的问题

## 影响的文件

- src/utils/urlProcessor.ts - URL 处理逻辑优化
- src/db/supabase.ts - Supabase 客户端安全初始化
- src/components/items/EditItemDialog.tsx - 编辑面板 UI 优化
- src/components/items/ItemCard.tsx - 时间显示逻辑修复
- src/components/blog/BlogEditorDialog.tsx - 编辑器自动换行
- src/components/blog/blog-editor.css - 编辑器样式优化
- src/components/items/NoteViewDialog.tsx - 编辑器自动换行
- src/components/ui/dialog.tsx - 滚动锁定修复
- server/routes/items.ts - 时间冲突检测优化
- src/pages/Dashboard.tsx - 预览/加载功能实现
- src/components/items/QuickInput.tsx - URL 总结优化
- src/components/items/URLCard.tsx - URL 总结优化
```

