# 附件图片显示功能 - 快速参考

## 快速开始

### 在任何卡片中使用

```tsx
import { AttachmentImages } from '@/components/attachments/AttachmentImages';

// 基础用法
<AttachmentImages itemId={item.id} />

// 紧凑模式
<AttachmentImages itemId={item.id} compact />

// 自定义配置
<AttachmentImages 
  itemId={item.id} 
  maxDisplay={3}
  compact={false}
  className="my-4"
/>
```

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `itemId` | `string` | 必填 | 条目ID |
| `maxDisplay` | `number` | `4` | 最多显示图片数量 |
| `compact` | `boolean` | `false` | 紧凑模式 |
| `className` | `string` | - | 自定义CSS类名 |

## 使用场景

### ItemCard（笔记、日程、资料）
```tsx
<AttachmentImages itemId={item.id} maxDisplay={4} />
```
- 常规显示模式
- 最多显示4张图片
- 完整的AI标签显示

### TodoCard（待办事项）
```tsx
<AttachmentImages itemId={item.id} maxDisplay={3} compact />
```
- 紧凑显示模式
- 最多显示3张图片
- 节省空间

### URLCard（链接）
```tsx
<AttachmentImages itemId={item.id} maxDisplay={3} />
```
- 常规显示模式
- 最多显示3张图片
- 与URL缩略图区分

## 功能特性

### ✅ 已实现
- 自动加载条目的图片附件
- 智能布局（1-4张自动调整）
- 点击图片全屏预览
- 加载状态显示
- 加载失败提示
- AI描述悬浮显示
- AI标签展示
- 深色模式支持
- 响应式设计

### 🎨 视觉效果
- 悬浮放大效果
- 边框高亮
- 缩放图标显示
- 平滑动画过渡
- 渐进式加载

### 📐 布局规则

**常规模式**:
- 1张: 16:9 单张大图
- 2张: 1x2 网格
- 3张: 1x3 网格
- 4张+: 2x2 网格

**紧凑模式**:
- 全部: 1x4 小图网格

## 集成位置

### ItemCard
```
标题
├─ 状态/日期
├─ 描述
├─ 📸 附件图片 ← 这里
├─ 标签
└─ 时间
```

### TodoCard
```
标题
├─ 状态/优先级
├─ 描述
├─ 📸 附件图片 ← 这里
└─ [操作按钮]
```

### URLCard
```
URL信息
├─ 标题/域名
├─ AI梗概
├─ 链接操作
├─ 标签
├─ 📸 附件图片 ← 这里
└─ 时间
```

## 常见问题

### Q: 为什么我的卡片不显示附件图片？
A: 确保该条目有图片类型的附件（file_type === 'image'）。

### Q: 如何自定义显示数量？
A: 使用 `maxDisplay` 参数，例如：`<AttachmentImages itemId={id} maxDisplay={6} />`

### Q: 紧凑模式和普通模式有什么区别？
A: 紧凑模式使用4列小图网格，不显示AI标签，适合空间有限的场景。

### Q: 图片预览支持哪些操作？
A: 目前支持点击放大查看，点击对话框外关闭预览。

### Q: 如何处理加载失败的图片？
A: 组件会自动显示图标和"加载失败"提示，不影响其他图片显示。

## 性能建议

1. **限制数量**: 根据场景合理设置 `maxDisplay`
2. **延迟加载**: 组件已实现按需加载
3. **错误处理**: 加载失败不会阻塞其他内容

## 样式自定义

```tsx
// 添加外边距
<AttachmentImages 
  itemId={item.id} 
  className="mt-4 mb-2" 
/>

// 自定义容器样式
<div className="rounded-lg border p-2">
  <AttachmentImages itemId={item.id} />
</div>
```

## 相关组件

- `AttachmentList` - 完整的附件列表（包含非图片）
- `AttachmentUploader` - 附件上传组件
- `Dialog` - 图片预览对话框（shadcn/ui）

## 更新日志

### 2025-11-04
- ✅ 创建 AttachmentImages 组件
- ✅ 集成到 ItemCard
- ✅ 集成到 TodoCard
- ✅ 集成到 URLCard
- ✅ 添加图片预览功能
- ✅ 添加AI标签显示
- ✅ 优化加载状态
