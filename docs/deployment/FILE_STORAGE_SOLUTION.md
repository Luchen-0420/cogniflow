# 文件存储路径问题 - 完整解决方案

## 问题背景

用户提问：**如果切换到阿里云 ECS 部署，路径存在变更，是否会影响图片附件、文件附件？**

## 简短回答

✅ **不会影响，已优化支持灵活配置！**

通过环境变量 `UPLOAD_DIR` 配置上传目录，数据库存储相对路径，迁移时只需：
1. 同步文件到新服务器
2. 修改 `.env` 中的 `UPLOAD_DIR`
3. 重启应用

## 技术实现

### 修改前的问题

```typescript
// ❌ 硬编码路径，不灵活
const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');
```

**问题**：
- 路径相对于代码文件
- 迁移服务器需要修改代码
- 多环境部署困难

### 修改后的方案

```typescript
// ✅ 支持环境变量配置
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR 
  ? (path.isAbsolute(process.env.UPLOAD_DIR) 
      ? process.env.UPLOAD_DIR 
      : path.resolve(process.cwd(), process.env.UPLOAD_DIR))
  : path.join(__dirname, '../../uploads');

// 启动时输出配置信息
console.log('📁 [AttachmentService] 上传目录配置:');
console.log('   UPLOAD_BASE_DIR:', UPLOAD_BASE_DIR);
console.log('   THUMBNAIL_DIR:', THUMBNAIL_DIR);
console.log('   当前工作目录:', process.cwd());
console.log('   环境变量 UPLOAD_DIR:', process.env.UPLOAD_DIR || '(未设置)');
```

**优势**：
- ✅ 支持相对路径和绝对路径
- ✅ 环境变量灵活配置
- ✅ 启动时自动验证
- ✅ 便于调试和监控

## 部署配置

### 开发环境

```bash
# .env
UPLOAD_DIR=./uploads
```

### 阿里云 ECS

```bash
# .env
UPLOAD_DIR=/data/cogniflow/uploads

# 创建目录
sudo mkdir -p /data/cogniflow/uploads
sudo chown -R $USER:$USER /data/cogniflow/uploads
sudo chmod 755 /data/cogniflow/uploads
```

### Docker 部署

```yaml
# docker-compose.yml
services:
  cogniflow:
    volumes:
      - /data/cogniflow/uploads:/app/uploads
    environment:
      - UPLOAD_DIR=/app/uploads
```

## 数据库设计

### 存储策略

数据库中存储**相对路径**，不存储绝对路径：

```sql
-- ✅ 正确：相对路径
INSERT INTO attachments (file_path) VALUES ('images/1234567890-abc.jpg');

-- ❌ 错误：绝对路径
INSERT INTO attachments (file_path) VALUES ('/data/cogniflow/uploads/images/1234567890-abc.jpg');
```

### 访问逻辑

```typescript
// 运行时拼接完整路径
const fullPath = path.join(UPLOAD_BASE_DIR, relativePath);
// 例如: /data/cogniflow/uploads + images/xxx.jpg
//     = /data/cogniflow/uploads/images/xxx.jpg
```

**好处**：
- 数据库记录与物理位置解耦
- 迁移服务器无需修改数据库
- 支持多环境（开发/测试/生产）

## 迁移步骤

### 从本地到 ECS

**步骤 1**：同步文件
```bash
rsync -avz --progress ./uploads/ user@ecs-ip:/data/cogniflow/uploads/
```

**步骤 2**：配置环境变量
```bash
# 在 ECS 的 .env 中
UPLOAD_DIR=/data/cogniflow/uploads
```

**步骤 3**：重启应用
```bash
pnpm run start
```

**验证**：查看启动日志
```
📁 [AttachmentService] 上传目录配置:
   UPLOAD_BASE_DIR: /data/cogniflow/uploads ✓
```

### 更换服务器

```bash
# 1. 备份旧服务器
tar -czf uploads-backup.tar.gz /old/path/uploads/
pg_dump -U cogniflow_user cogniflow > backup.sql

# 2. 新服务器恢复
tar -xzf uploads-backup.tar.gz -C /data/cogniflow/
psql -U cogniflow_user cogniflow < backup.sql

# 3. 配置新路径
echo "UPLOAD_DIR=/data/cogniflow/uploads" >> .env

# 4. 重启
pnpm run start
```

## 验证工具

### 检查脚本

运行自动检查脚本：
```bash
./scripts/check-upload-dir.sh
```

输出示例：
```
================================
文件上传路径配置检查
================================

1. 检查环境变量配置
   ✓ .env 文件存在
   UPLOAD_DIR=/data/cogniflow/uploads

2. 检查上传目录
   完整路径: /data/cogniflow/uploads
   ✓ 目录存在

3. 检查目录权限
   ✓ 具有写入权限

4. 检查磁盘空间
   可用空间: 50G

5. 测试文件写入
   ✓ 写入测试成功

6. 检查子目录结构
   ✓ images/
   ✓ documents/
   ✓ videos/
   ✓ audios/
   ✓ others/
   ✓ thumbnails/

================================
✓ 所有检查通过！
================================
```

### 手动验证

```bash
# 1. 检查配置
cat .env | grep UPLOAD_DIR

# 2. 检查目录
ls -la /data/cogniflow/uploads/

# 3. 查看应用日志
journalctl -u cogniflow -n 50 | grep "UPLOAD_BASE_DIR"
```

## 常见问题

### Q1: 图片上传后 404

**原因**：`UPLOAD_DIR` 配置错误或目录不存在

**解决**：
```bash
# 检查配置
echo $UPLOAD_DIR

# 创建目录
mkdir -p $UPLOAD_DIR/{images,documents,videos,audios,others,thumbnails}

# 设置权限
chmod 755 $UPLOAD_DIR
```

### Q2: 权限问题

**原因**：应用进程无权访问目录

**解决**：
```bash
# 修改所有者
sudo chown -R app-user:app-user /data/cogniflow/uploads

# 设置权限
sudo chmod -R 755 /data/cogniflow/uploads
```

### Q3: 需要修改数据库吗？

**答**：不需要！数据库中存储的是相对路径，只需配置环境变量。

## 文件清单

### 修改的文件

1. **server/services/attachmentService.ts**
   - 添加环境变量支持
   - 添加配置日志输出
   - 支持相对/绝对路径

2. **server/.env.example**
   - 添加 `UPLOAD_DIR` 详细说明
   - 提供多环境配置示例

### 新增文件

1. **docs/deployment/ALIYUN_ECS_DEPLOYMENT.md**
   - 完整的 ECS 部署指南
   - 包含配置、迁移、监控等

2. **docs/deployment/FILE_STORAGE_CONFIG.md**
   - 快速参考文档
   - TL;DR 版本

3. **scripts/check-upload-dir.sh**
   - 自动检查工具
   - 验证配置正确性

## 架构优势

### 灵活性

| 场景 | 配置方式 | 说明 |
|------|---------|------|
| 本地开发 | `UPLOAD_DIR=./uploads` | 相对路径，简单 |
| ECS 部署 | `UPLOAD_DIR=/data/cogniflow/uploads` | 绝对路径，独立存储 |
| Docker | `UPLOAD_DIR=/app/uploads` + volume | 容器化部署 |
| 多实例 | 共享 NFS/OSS | 高可用架构 |

### 可维护性

- ✅ 配置集中在 `.env`
- ✅ 日志自动输出验证
- ✅ 测试脚本自动检查
- ✅ 文档完善清晰

### 可扩展性

- ✅ 未来可扩展支持 OSS
- ✅ 支持多环境配置
- ✅ 支持容器化部署
- ✅ 支持集群部署

## 总结

### 核心原则

1. **数据库存相对路径** - 便于迁移
2. **环境变量配基础路径** - 灵活部署
3. **运行时拼接完整路径** - 自动适配

### 一句话总结

**配置好 `UPLOAD_DIR`，数据库不用改，文件同步好，重启就能跑！**

## 相关文档

- [阿里云 ECS 部署完整指南](./ALIYUN_ECS_DEPLOYMENT.md)
- [文件存储配置快速参考](./FILE_STORAGE_CONFIG.md)
- [环境变量配置说明](../configuration/ENVIRONMENT.md)

## 技术支持

如有问题，请检查：
1. 运行 `./scripts/check-upload-dir.sh`
2. 查看应用启动日志
3. 参考部署文档

---

**最后更新**: 2025-11-04  
**作者**: CogniFlow Team
