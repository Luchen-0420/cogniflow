# 登录状态持久化问题修复

## 问题描述

**日期**: 2025年11月5日

### 问题场景

用户在使用快捷登录后，会遇到以下问题：

1. ✅ 初次登录后可以正常使用
2. ❌ 过一段时间后（7天后），刷新浏览器会丢失登录状态
3. ⚠️ 但仍然能看到历史的输入记录、卡片等数据（因为保存在 localStorage/IndexedDB）
4. ❌ 用户再次尝试输入时，会弹出登录/注册窗口
5. 😵 用户感到困惑：为什么能看到数据却不能操作？

### 根本原因

1. **Token 有效期过短**：
   - 后端 JWT token 设置为 7 天有效期
   - 7 天后 token 过期，用户需要重新登录
   
2. **缺少自动刷新机制**：
   - Token 过期后，前端没有自动刷新 token 的机制
   - 用户必须手动重新登录
   
3. **初始化验证不完善**：
   - 页面刷新时验证 token，发现过期就直接清除
   - 没有尝试刷新 token
   
4. **数据与认证分离**：
   - 历史数据保存在本地存储中，不依赖认证
   - 但所有写操作（创建、更新、删除）需要有效 token
   - 造成"能看不能改"的尴尬局面

## 解决方案

### 核心策略

采用**三层防护**策略，确保用户登录状态持久化：

1. **延长 Token 有效期**：从 7 天延长到 30 天
2. **自动刷新机制**：Token 过期前自动刷新
3. **智能重试机制**：API 请求失败时自动刷新 token 并重试

### 修改的文件

#### 1. 后端 - 延长 Token 有效期

**文件**: `server/routes/users.ts`

##### 注册接口

```typescript
// 生成 JWT token (30天有效期)
const token = jwt.sign(
  { userId: user.id, username: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: '30d' }  // ✨ 从 7d 改为 30d
);
```

##### 登录接口

```typescript
// 生成 JWT token (30天有效期)
const token = jwt.sign(
  { userId: user.id, username: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: '30d' }  // ✨ 从 7d 改为 30d
);
```

##### 新增 Token 刷新接口

```typescript
/**
 * 刷新 token
 * POST /api/auth/refresh
 * 需要认证
 */
router.post('/refresh', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const username = req.user?.username;
    const role = req.user?.role;

    if (!userId || !username || !role) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证用户仍然存在且状态正常
    const result = await query(
      'SELECT id, status FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (result.rows[0].status !== 'active') {
      return res.status(403).json({ error: '账户已被禁用' });
    }

    // 生成新的 JWT token (30天有效期)
    const newToken = jwt.sign(
      { userId, username, role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Token 刷新成功',
      token: newToken
    });
  } catch (error) {
    next(error);
  }
});
```

#### 2. 前端 - 优化初始化验证

**文件**: `src/db/postgresAuth.ts`

```typescript
async initialize(): Promise<void> {
  // 如果有 token，验证是否有效
  if (this.token) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        // Token 无效或过期，尝试刷新
        console.log('🔄 Token 无效，尝试刷新...');
        
        // 如果是 401 错误，尝试刷新 token
        if (response.status === 401) {
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.token}`
              }
            });

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              // 更新 token
              this.token = data.token;
              localStorage.setItem('cogniflow_auth_token', data.token);
              console.log('✅ Token 刷新成功');
              return;
            }
          } catch (refreshError) {
            console.error('❌ Token 刷新失败:', refreshError);
          }
        }
        
        // 刷新失败，清除认证信息
        console.log('⚠️ Token 无法刷新，清除登录状态');
        this.clearAuth();
      } else {
        console.log('✅ Token 验证成功');
      }
    } catch (error) {
      console.error('验证 token 失败:', error);
      // 网络错误时保留 token，不清除
      console.log('⚠️ 网络错误，保留当前登录状态');
    }
  }
}
```

#### 3. 前端 - API 请求自动重试

**文件**: `src/db/postgresApi.ts`

添加了 token 刷新和自动重试机制：

```typescript
// Token 刷新状态
let isRefreshingToken = false;
let refreshPromise: Promise<string | null> | null = null;

// 刷新 token
async function refreshAuthToken(): Promise<string | null> {
  // 如果正在刷新，返回现有的 Promise（避免并发刷新）
  if (isRefreshingToken && refreshPromise) {
    return refreshPromise;
  }

  isRefreshingToken = true;
  refreshPromise = (async () => {
    try {
      const currentToken = getAuthToken();
      if (!currentToken) {
        console.log('⚠️ 没有 token，无法刷新');
        return null;
      }

      console.log('🔄 开始刷新 token...');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Token 刷新失败:', response.status);
        // 清除无效的认证信息
        localStorage.removeItem('cogniflow_auth_token');
        localStorage.removeItem('cogniflow_current_user');
        return null;
      }

      const data = await response.json();
      const newToken = data.token;
      
      // 保存新 token
      localStorage.setItem('cogniflow_auth_token', newToken);
      console.log('✅ Token 刷新成功');
      
      return newToken;
    } catch (error) {
      console.error('❌ Token 刷新异常:', error);
      return null;
    } finally {
      isRefreshingToken = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// 通用请求方法（带 token 自动刷新）
async function fetchAPI(endpoint: string, options: RequestInit = {}, retryCount = 0) {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 如果是 401 错误且还没重试过，尝试刷新 token 后重试
  if (response.status === 401 && retryCount === 0) {
    console.log('🔄 收到 401 响应，尝试刷新 token...');
    const newToken = await refreshAuthToken();
    
    if (newToken) {
      console.log('✅ Token 刷新成功，重试请求...');
      // 使用新 token 重试请求
      const newHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        ...options.headers,
      };
      
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: newHeaders,
      });
      
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${retryResponse.status}`);
      }
      
      return retryResponse.json();
    } else {
      console.error('❌ Token 刷新失败，请重新登录');
      throw new Error('登录已过期，请重新登录');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
```

## 工作流程

### 场景 1: 正常使用（Token 有效）

```
用户操作 → API 请求 → Token 验证通过 → 正常响应
```

### 场景 2: Token 即将过期

```
用户操作 → API 请求 → Token 过期 (401)
    ↓
刷新 Token → 使用新 Token 重试 → 成功响应
    ↓
保存新 Token 到 localStorage
```

### 场景 3: 页面刷新时

```
页面加载 → 初始化 → 验证 Token
    ↓
Token 过期? → 尝试刷新 Token
    ↓
成功 → 保存新 Token，继续使用
失败 → 清除认证，显示登录界面
```

### 场景 4: Token 完全无效（用户被禁用等）

```
刷新请求 → 服务器拒绝 → 清除本地认证信息 → 显示登录界面
```

## 用户体验改进

### 优化前的体验

❌ **第 1-7 天**：正常使用  
❌ **第 8 天**：刷新页面 → 登录失效 → 能看到数据但不能操作  
❌ **用户困惑**："为什么能看到我的笔记却不让我编辑？"  
❌ **被迫操作**：重新登录，输入用户名密码  

### 优化后的体验

✅ **第 1-30 天**：正常使用（延长 4 倍）  
✅ **第 8 天**：刷新页面 → 自动刷新 token → 继续使用  
✅ **第 15 天**：API 请求 → Token 过期 → 自动刷新 → 继续使用  
✅ **第 30 天**：刷新页面 → 尝试刷新 → 失败 → 友好提示重新登录  
✅ **用户无感知**：大部分情况下不需要重新登录  

## 技术细节

### Token 刷新时机

1. **页面初始化时**：
   - 验证现有 token
   - 如果过期，尝试刷新
   - 成功则继续，失败则清除认证

2. **API 请求时**：
   - 收到 401 响应
   - 自动刷新 token
   - 使用新 token 重试请求

### 并发控制

使用全局状态管理，防止多个请求同时触发 token 刷新：

```typescript
let isRefreshingToken = false;
let refreshPromise: Promise<string | null> | null = null;
```

所有请求都会等待同一个刷新 Promise 完成。

### 安全性考虑

1. **Token 存储**：
   - 存储在 localStorage（XSS 风险）
   - ⚠️ 生产环境建议使用 HttpOnly Cookie

2. **刷新限制**：
   - 每次 API 请求最多重试一次
   - 避免无限重试循环

3. **用户验证**：
   - 刷新 token 时验证用户状态
   - 确保用户账户仍然有效

### 错误处理

1. **网络错误**：保留 token，不清除认证（可能是临时网络问题）
2. **401 错误**：尝试刷新，失败则清除认证
3. **其他错误**：正常抛出，由上层处理

## 测试建议

### 手动测试

1. **长期使用测试**：
   ```
   1. 登录系统
   2. 创建一些数据
   3. 等待 8 天（或手动修改 token 过期时间）
   4. 刷新页面
   5. 验证：应该能继续使用，不需要重新登录
   ```

2. **Token 过期测试**：
   ```
   1. 登录系统
   2. 修改 token 过期时间为 1 分钟
   3. 等待 2 分钟
   4. 创建新条目
   5. 验证：应该自动刷新 token 并成功创建
   ```

3. **网络错误测试**：
   ```
   1. 登录系统
   2. 断开网络
   3. 刷新页面
   4. 验证：应该保留登录状态（显示缓存数据）
   5. 恢复网络
   6. 创建新条目
   7. 验证：应该能正常创建
   ```

### 自动化测试

```typescript
describe('Token Refresh', () => {
  it('should refresh token when expired', async () => {
    // 1. 登录获取 token
    const { token } = await login('testuser', 'password');
    
    // 2. 等待 token 过期
    await wait(tokenExpireTime);
    
    // 3. 发送 API 请求
    const response = await createItem({ title: 'Test' });
    
    // 4. 验证：应该成功（自动刷新了 token）
    expect(response.success).toBe(true);
  });
  
  it('should clear auth when refresh fails', async () => {
    // 1. 使用无效 token
    localStorage.setItem('cogniflow_auth_token', 'invalid_token');
    
    // 2. 刷新页面
    await initialize();
    
    // 3. 验证：应该清除认证信息
    expect(localStorage.getItem('cogniflow_auth_token')).toBeNull();
  });
});
```

## 监控指标

建议添加以下监控指标：

1. **Token 刷新成功率**：
   ```typescript
   metrics.increment('auth.token.refresh.success');
   metrics.increment('auth.token.refresh.failure');
   ```

2. **Token 过期频率**：
   ```typescript
   metrics.increment('auth.token.expired');
   ```

3. **自动重试成功率**：
   ```typescript
   metrics.increment('api.retry.success');
   metrics.increment('api.retry.failure');
   ```

## 后续优化建议

### 1. 定期自动刷新

不等到 token 过期，而是定期刷新：

```typescript
// 每 7 天自动刷新一次
setInterval(async () => {
  if (isAuthenticated) {
    await refreshAuthToken();
  }
}, 7 * 24 * 60 * 60 * 1000);
```

### 2. 使用 HttpOnly Cookie

更安全的 token 存储方式：

```typescript
// 后端设置 cookie
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 天
});
```

### 3. 添加 Token 过期提示

在 token 即将过期时提醒用户：

```typescript
const tokenExpiresIn = getTokenExpiresIn();
if (tokenExpiresIn < 3 * 24 * 60 * 60 * 1000) { // 少于 3 天
  showNotification('您的登录即将过期，请注意保存工作');
}
```

### 4. Refresh Token 机制

实现双 token 机制（Access Token + Refresh Token）：

```typescript
interface TokenPair {
  accessToken: string;  // 短期（1小时）
  refreshToken: string; // 长期（30天）
}
```

## 影响范围

### 后端 API

- ✅ `POST /api/auth/register` - 延长 token 有效期
- ✅ `POST /api/auth/login` - 延长 token 有效期
- ✅ `POST /api/auth/refresh` - 新增刷新端点

### 前端

- ✅ `src/db/postgresAuth.ts` - 优化初始化逻辑
- ✅ `src/db/postgresApi.ts` - 添加自动重试机制

### 数据库

- ✅ 无需修改数据库结构

### 兼容性

- ✅ 向后兼容，不影响现有功能
- ✅ 旧 token 仍然有效直到过期
- ✅ 用户无需重新登录

## 总结

这次修复通过**三层防护**机制，显著提升了用户体验：

1. **延长有效期**：从 7 天到 30 天（4 倍提升）
2. **自动刷新**：页面初始化时智能刷新过期 token
3. **智能重试**：API 请求失败时自动刷新并重试

### 关键改进

- ✅ Token 有效期延长到 30 天
- ✅ 新增 `/api/auth/refresh` 端点
- ✅ 页面初始化时自动刷新过期 token
- ✅ API 请求收到 401 时自动刷新并重试
- ✅ 并发控制，避免重复刷新
- ✅ 网络错误时保留登录状态
- ✅ 友好的错误处理和日志

### 用户体验

- **优化前**：7 天后必须重新登录，体验中断
- **优化后**：30 天内无感知自动续期，几乎不需要重新登录

---

**修改时间**: 2025年11月5日  
**修改人**: GitHub Copilot  
**影响版本**: 当前版本  
**风险级别**: 低（增强功能，向后兼容）
