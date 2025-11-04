# 配色系统快速参考

## 常用颜色替换对照表

### 文本颜色

```tsx
// ❌ 旧的硬编码方式
<h1 className="text-gray-900 dark:text-white">标题</h1>
<p className="text-gray-600 dark:text-gray-400">描述</p>
<span className="text-gray-500 dark:text-gray-500">提示</span>

// ✅ 新的设计系统方式
<h1 className="text-foreground">标题</h1>
<p className="text-muted-foreground">描述</p>
<span className="text-muted-foreground">提示</span>
```

### 背景颜色

```tsx
// ❌ 旧的硬编码方式
<div className="bg-white dark:bg-gray-900">页面</div>
<div className="bg-white dark:bg-gray-800">卡片</div>
<div className="bg-gray-100 dark:bg-gray-800">次要背景</div>

// ✅ 新的设计系统方式
<div className="bg-background">页面</div>
<div className="bg-card">卡片</div>
<div className="bg-muted">次要背景</div>
```

### 主题色

```tsx
// ❌ 旧的硬编码方式
<Button className="bg-blue-600 text-white">按钮</Button>
<Loader2 className="text-blue-600 dark:text-blue-400" />
<div className="bg-blue-50 dark:bg-blue-950/30">强调区域</div>

// ✅ 新的设计系统方式
<Button className="bg-primary text-primary-foreground">按钮</Button>
<Loader2 className="text-primary" />
<div className="bg-primary/5">强调区域</div>
```

### 边框颜色

```tsx
// ❌ 旧的硬编码方式
<div className="border border-gray-200 dark:border-gray-800">
<div className="border border-blue-200 dark:border-blue-800">

// ✅ 新的设计系统方式
<div className="border border-border">
<div className="border border-primary/30">
```

## 完整颜色变量列表

| Tailwind 类 | CSS 变量 | 使用场景 |
|------------|---------|---------|
| `text-foreground` | `--foreground` | 主要文本 |
| `text-muted-foreground` | `--muted-foreground` | 次要文本、说明 |
| `text-primary` | `--primary` | 主题色文本 |
| `text-primary-foreground` | `--primary-foreground` | 主题色上的文字 |
| `text-card-foreground` | `--card-foreground` | 卡片内的文字 |
| `bg-background` | `--background` | 页面背景 |
| `bg-card` | `--card` | 卡片背景 |
| `bg-muted` | `--muted` | 静音/次要背景 |
| `bg-primary` | `--primary` | 主题色背景 |
| `border-border` | `--border` | 边框 |
| `border-primary` | `--primary` | 主题色边框 |

## 透明度使用

使用 `/` 语法设置透明度：

```tsx
// 5% 透明度的主题色背景
<div className="bg-primary/5">

// 30% 透明度的主题色边框
<div className="border-primary/30">

// 30% 透明度的静音文字
<Icon className="text-muted-foreground/30" />
```

## 状态颜色（特殊情况）

某些语义化的状态颜色可以保留硬编码：

```tsx
// ✅ 可以保留 - 有明确语义
<Badge className="bg-red-100 dark:bg-red-900/20 text-red-600">错误</Badge>
<Badge className="bg-green-100 dark:bg-green-900/20 text-green-600">成功</Badge>
<Badge className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600">警告</Badge>

// ❌ 普通标签应该用系统颜色
<Badge className="bg-muted text-muted-foreground">标签</Badge>
```

## 检查清单

在提交代码前检查：

- [ ] 没有使用 `text-gray-*` + `dark:text-*` 的组合
- [ ] 没有使用 `bg-white` + `dark:bg-gray-*` 的组合
- [ ] 没有使用 `text-blue-*` / `bg-blue-*`（除非是状态色）
- [ ] 使用了语义化的设计系统变量
- [ ] 在亮色和暗色模式下都测试过

## VSCode 搜索替换

使用正则表达式批量查找需要修复的代码：

```regex
text-gray-\d+\s+dark:text-
bg-gray-\d+\s+dark:bg-
text-blue-\d+
bg-blue-\d+
```

## 快速修复命令

```bash
# 查找所有使用硬编码颜色的文件
grep -r "text-gray-[0-9]* dark:text-" src/components/

# 查找使用蓝色的文件
grep -r "text-blue-" src/components/
```
