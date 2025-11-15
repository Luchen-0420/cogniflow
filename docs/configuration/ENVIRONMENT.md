# 环境变量配置说明

本文档说明 CogniFlow 项目的环境变量配置。

---

## 📁 配置文件

项目使用以下配置文件：

- **`.env`** - 主配置文件（本地开发）
- **`.env.example`** - 配置模板
- **`server/.env`** - 服务端配置（可选）

---

## 🔧 必需配置

### 数据库配置

```env
# PostgreSQL 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cogniflow
DB_USER=postgres
DB_PASSWORD=postgres123
```

### 智谱（GLM）API 配置

```env
# 智谱 AI API 配置（AI 功能必需）
VITE_ZHIPUAI_API_KEY=your_api_key_here
VITE_ZHIPUAI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
VITE_ZHIPUAI_MODEL=glm-4-flash
# 兼容旧变量：VITE_GLM_API_KEY / VITE_GLM_API_URL / VITE_GLM_MODEL

# 智谱网络搜索 API 配置（AI 主动辅助功能需要）
# 搜索引擎选项：search_std（基础版）、search_pro（高阶版）、search_pro_sogou（搜狗）、search_pro_quark（夸克）
VITE_ZHIPUAI_SEARCH_ENGINE=search_std
# 兼容旧变量：VITE_GLM_SEARCH_ENGINE
```

获取 API Key：查看 [智谱（GLM）API 配置文档](./GLM_SETUP.md)

---

## ⚙️ 可选配置

### 应用配置

```env
# 应用端口
PORT=3000
VITE_PORT=5173

# 环境模式
NODE_ENV=development
```

### 备份配置

```env
# 自动备份设置
BACKUP_ENABLED=true
BACKUP_INTERVAL=24  # 小时
BACKUP_PATH=./backups
```

### 日志配置

```env
# 日志级别
LOG_LEVEL=info

# 日志文件路径
LOG_PATH=./logs
```

---

## 🐳 Docker 配置

使用 Docker Compose 时，配置在 `docker-compose.yml` 中：

```yaml
environment:
  - POSTGRES_USER=postgres
  - POSTGRES_PASSWORD=postgres123
  - POSTGRES_DB=cogniflow
```

---

## 🔐 安全建议

### 生产环境

1. **修改默认密码**
```env
DB_PASSWORD=your_strong_password_here
```

2. **保护 API Key**
- 不要将 API Key 提交到版本控制
- 使用环境变量或密钥管理服务

3. **限制数据库访问**
```env
DB_HOST=127.0.0.1  # 仅本地访问
```

### 示例配置

**开发环境：**
```env
NODE_ENV=development
DB_HOST=localhost
VITE_ZHIPUAI_API_KEY=test_key
```

**生产环境：**
```env
NODE_ENV=production
DB_HOST=your_db_host
DB_PASSWORD=strong_password
VITE_ZHIPUAI_API_KEY=production_key
```

---

## 📝 配置步骤

### 1. 复制配置模板

```bash
cp .env.example .env
```

### 2. 编辑配置文件

```bash
# 使用你喜欢的编辑器
vim .env
# 或
code .env
```

### 3. 配置必需项

至少配置以下项目：
- ✅ 数据库连接信息
- ✅ ZHIPUAI API Key（兼容 VITE_GLM_API_KEY）

### 4. 验证配置

```bash
# 启动服务测试
pnpm run dev:postgres
```

---

## ⚠️ 常见问题

### 数据库连接失败

**错误信息：**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案：**
1. 检查数据库是否启动：`docker ps`
2. 验证端口配置：`DB_PORT=5432`
3. 检查防火墙设置

### API Key 无效

**错误信息：**
```
Error: Invalid API key
```

**解决方案：**
1. 验证 API Key 是否正确
2. 检查环境变量名称：`VITE_ZHIPUAI_API_KEY`（兼容 `VITE_GLM_API_KEY`）
3. 重启开发服务器

### 环境变量未生效

**原因：**
- 修改后未重启服务
- 环境变量名称错误
- 配置文件路径不对

**解决方案：**
```bash
# 重启开发服务器
# 按 Ctrl+C 停止，然后重新运行
pnpm run dev:postgres
```

---

## 📚 相关文档

- [快速开始](../quickstart/QUICK_START.md)
- [智谱（GLM）API 配置](./GLM_SETUP.md)
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md)
- [安全指南](../deployment/SECURITY_GUIDE.md)

---

## 🔄 环境变量优先级

1. **命令行参数** - 最高优先级
2. **`.env` 文件** - 本地配置
3. **`.env.example`** - 默认值
4. **系统环境变量** - 最低优先级

---

**提示**：生产环境建议使用密钥管理服务（如 AWS Secrets Manager、HashiCorp Vault）来管理敏感信息。
