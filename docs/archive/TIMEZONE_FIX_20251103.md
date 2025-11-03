# 时区问题修复（2025-11-03）

## 问题描述

用户报告时间显示相差 8 小时的问题。例如：
- 创建时间：2025-11-03 15:15
- 显示时间：2025-11-04 01:30 → 02:30（相差 8 小时）

## 根本原因

JavaScript 的 `Date.toISOString()` 方法会生成 UTC 时间字符串（带 `Z` 后缀），当这些字符串被存储后再读取时，会被当作 UTC 时间处理，从而在显示时加上时区偏移（东八区 +8 小时）。

### 问题流程

```
存储时：new Date().toISOString()
  ↓
生成：2025-11-03T15:15:00.000Z (UTC 时间)
  ↓
存储到数据库：2025-11-03T15:15:00.000Z
  ↓
读取时：new Date("2025-11-03T15:15:00.000Z")
  ↓
解析为本地时间：UTC 15:15 + 8小时 = 本地 23:15
  ↓
显示错误！
```

## 解决方案

### 1. 创建本地时间工具函数

在 `src/lib/utils.ts` 中添加：

```typescript
/**
 * 获取本地时间的 ISO 格式字符串（不带时区信息）
 */
export function getLocalISOString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * 将不带时区的 ISO 时间字符串解析为本地时间
 */
export function parseLocalDateTime(dateTimeString: string): Date {
  if (!dateTimeString) return new Date();
  
  // 只有日期，没有时间
  if (!dateTimeString.includes('T')) {
    return new Date(dateTimeString + 'T00:00:00');
  }
  
  // 如果有时区信息（Z 或 +08:00 等），正常解析
  if (dateTimeString.includes('Z') || dateTimeString.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateTimeString);
  }
  
  // 没有时区信息，手动解析为本地时间
  const parts = dateTimeString.split(/[-T:]/);
  return new Date(
    parseInt(parts[0]), // year
    parseInt(parts[1]) - 1, // month (0-indexed)
    parseInt(parts[2]), // day
    parseInt(parts[3] || '0'), // hour
    parseInt(parts[4] || '0'), // minute
    parseInt(parts[5] || '0')  // second
  );
}
```

### 2. 修复数据存储

将所有使用 `new Date().toISOString()` 的地方替换为 `getLocalISOString()`：

#### 修改的文件：

1. **src/db/localApi.ts**
   - `createItem()` - 创建时间
   - `updateItem()` - 更新时间
   - `archiveItem()` - 归档时间
   - `getTodayItems()` - 今日日期比较
   - `getUpcomingItems()` - 未来事项查询

2. **src/db/userDataApi.ts**
   - `createItem()` - 创建时间
   - `updateItem()` - 更新时间
   - `archiveItem()` - 归档时间
   - `bulkUpdateItems()` - 批量更新时间

3. **src/db/localAuth.ts**
   - `createDefaultUser()` - 用户创建时间
   - `loginByPhoneOrEmail()` - 用户创建时间

4. **src/utils/ai.ts**
   - AI 时间解析时使用本地时间格式，不使用 `toISOString()`

### 3. 修复时间显示

将所有使用 `new Date(item.created_at)` 的地方替换为 `parseLocalDateTime(item.created_at)`：

#### 修改的文件：

1. **src/components/url/URLCard.tsx**
   - 显示创建时间

2. **src/components/items/ItemCard.tsx** （已存在，无需修改）
3. **src/components/calendar/CalendarView.tsx** （已存在，无需修改）
4. **src/components/items/TodoCard.tsx** （已存在，无需修改）

## 技术要点

### 为什么不能用 toISOString()?

`toISOString()` 生成的格式：
```
2025-11-03T15:15:00.000Z
                      ↑ 
                  表示 UTC 时间
```

当这个字符串被 `new Date()` 解析时，JavaScript 会：
1. 识别出 `Z` 后缀（表示 UTC）
2. 转换为本地时区
3. 对于东八区，会加 8 小时

### 为什么手动解析？

使用 `new Date(year, month, day, hour, minute, second)` 构造函数创建的是**本地时间**，不会进行时区转换：

```typescript
// 直接创建本地时间 2025-11-03 15:15:00
new Date(2025, 10, 3, 15, 15, 0)
// 这个时间就是本地的 15:15，不会有时区转换
```

## 测试验证

### 测试用例

1. **创建新事项**
   ```
   输入: "今天下午五点半沟通算子相关问题"
   期望: 显示当天 17:30
   ```

2. **查看创建时间**
   ```
   创建时间: 2025-11-03 15:15
   期望显示: 2025-11-03 15:15（不是次日 23:15）
   ```

3. **跨日事项**
   ```
   输入: "明天早上十点开会"
   期望: 显示明天 10:00
   ```

## 后续维护

### 注意事项

1. **新增时间字段时**：使用 `getLocalISOString()` 而不是 `new Date().toISOString()`

2. **显示时间时**：使用 `parseLocalDateTime()` 而不是 `new Date()`

3. **时间比较时**：确保两个时间都是相同格式（都不带时区）

### 示例代码

```typescript
// ✅ 正确：存储时间
const item = {
  created_at: getLocalISOString(),
  updated_at: getLocalISOString()
};

// ✅ 正确：显示时间
format(parseLocalDateTime(item.created_at), 'yyyy-MM-dd HH:mm')

// ❌ 错误：使用 toISOString
const item = {
  created_at: new Date().toISOString() // 会产生 UTC 时间
};

// ❌ 错误：直接 new Date
format(new Date(item.created_at), 'yyyy-MM-dd HH:mm') // 会时区转换
```

## 影响范围

- ✅ 创建新事项时的时间存储
- ✅ 更新事项时的时间记录
- ✅ 归档事项时的时间记录
- ✅ AI 解析时间时的格式生成
- ✅ 所有时间显示组件
- ✅ 时间查询和过滤功能

## 修复完成时间

2025-11-03

## 相关文档

- [时区修复总结 (第一次)](./TIMEZONE_FIX_SUMMARY.md)
- [时区修复完成](./TIMEZONE_FIX_COMPLETE.md)
