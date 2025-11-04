# 文件存储路径配置 - 快速参考

## TL;DR (太长不看版)

### 当前状态
✅ **已优化**：代码已支持环境变量配置，可灵活部署到任何环境

### 快速配置

1. **开发环境**（默认）
   ```bash
   # .env
   UPLOAD_DIR=./uploads
   ```

2. **阿里云 ECS**
   ```bash
   # .env
   UPLOAD_DIR=/data/cogniflow/uploads
   
   # 创建目录
   sudo mkdir -p /data/cogniflow/uploads
   sudo chown -R $USER:$USER /data/cogniflow/uploads
   ```

3. **验证配置**
   ```bash
   # 运行检查脚本
   ./scripts/check-upload-dir.sh
   
   # 或启动应用查看日志
   pnpm run dev:server
   # 查看输出中的 "上传目录配置" 信息
   ```

## 架构设计

### 核心原理

```
用户上传文件
    ↓
保存到: $UPLOAD_DIR/images/1234567890-abc.jpg
    ↓
数据库存储: images/1234567890-abc.jpg (相对路径)
    ↓
访问时: $UPLOAD_DIR + 相对路径 = 完整路径
```

**优势**：
- ✅ 数据库记录与实际存储位置解耦
- ✅ 更换服务器只需修改环境变量
- ✅ 不需要修改数据库数据
- ✅ 支持多环境部署

### 文件结构

```
$UPLOAD_DIR/
├── images/           # 图片文件
│   └── 1234567890-abc.jpg
├── documents/        # 文档文件
│   └── 1234567890-xyz.pdf
├── videos/          # 视频文件
├── audios/          # 音频文件
├── others/          # 其他文件
└── thumbnails/      # 缩略图
```

## 部署场景

### 场景 1: 本地开发

```bash
# .env
UPLOAD_DIR=./uploads

# 自动创建在项目目录下
# /path/to/cogniflow/uploads/
```

### 场景 2: 阿里云 ECS

```bash
# .env
UPLOAD_DIR=/data/cogniflow/uploads

# 使用独立的数据目录
# 好处：与代码分离，易于备份和迁移
```

### 场景 3: Docker 容器

```yaml
# docker-compose.yml
services:
  cogniflow:
    volumes:
      - /data/cogniflow/uploads:/app/uploads
    environment:
      - UPLOAD_DIR=/app/uploads
```

### 场景 4: 多实例部署

```bash
# 所有实例共享 NFS 或 OSS
UPLOAD_DIR=/mnt/shared-storage/cogniflow/uploads

# 或使用对象存储
# (需要代码扩展支持 OSS SDK)
```

## 迁移指南

### 从开发环境到生产环境

**步骤 1**: 同步文件
```bash
# 方式 1: rsync (推荐)
rsync -avz --progress ./uploads/ \
  user@ecs-ip:/data/cogniflow/uploads/

# 方式 2: 打包传输
tar -czf uploads.tar.gz uploads/
scp uploads.tar.gz user@ecs-ip:/tmp/
# 在 ECS 上解压到 /data/cogniflow/uploads/
```

**步骤 2**: 导出导入数据库
```bash
# 本地导出
pg_dump -U cogniflow_user cogniflow > backup.sql

# ECS 导入
psql -U cogniflow_user cogniflow < backup.sql
```

**步骤 3**: 配置生产环境
```bash
# ECS 上的 .env
UPLOAD_DIR=/data/cogniflow/uploads
```

**步骤 4**: 启动应用
```bash
pnpm install
pnpm run build
pnpm run start
```

### 更换服务器

**步骤 1**: 备份旧服务器数据
```bash
# 备份数据库
pg_dump -U cogniflow_user cogniflow > backup.sql

# 备份上传文件
tar -czf uploads-backup.tar.gz /data/cogniflow/uploads/
```

**步骤 2**: 新服务器配置
```bash
# 创建目录
sudo mkdir -p /data/cogniflow/uploads
sudo chown -R app-user:app-user /data/cogniflow/uploads

# 配置 .env
echo "UPLOAD_DIR=/data/cogniflow/uploads" >> .env
```

**步骤 3**: 恢复数据
```bash
# 恢复数据库
psql -U cogniflow_user cogniflow < backup.sql

# 恢复文件
tar -xzf uploads-backup.tar.gz -C /
```

## 常见问题

### Q: 为什么图片上传后 404？

**可能原因**：
1. `UPLOAD_DIR` 配置错误
2. 目录权限不足
3. 文件没有真正上传成功

**检查方法**：
```bash
# 1. 查看应用日志
journalctl -u cogniflow -n 50

# 2. 检查配置
cat .env | grep UPLOAD_DIR

# 3. 验证目录
ls -la /data/cogniflow/uploads/images/

# 4. 检查权限
ls -ld /data/cogniflow/uploads
```

### Q: 需要修改数据库吗？

**答**：不需要！

数据库中存储的是相对路径（如 `images/xxx.jpg`），与 `UPLOAD_DIR` 无关。
只需要配置环境变量，代码会自动拼接完整路径。

### Q: 如何验证配置正确？

**答**：运行检查脚本
```bash
./scripts/check-upload-dir.sh
```

或查看应用启动日志：
```
📁 [AttachmentService] 上传目录配置:
   UPLOAD_BASE_DIR: /data/cogniflow/uploads  ← 应该是你期望的路径
   THUMBNAIL_DIR: /data/cogniflow/uploads/thumbnails
   当前工作目录: /home/ubuntu/cogniflow
   环境变量 UPLOAD_DIR: /data/cogniflow/uploads
```

### Q: 可以使用阿里云 OSS 吗？

**答**：可以，但需要额外开发。

当前架构支持本地文件系统。要使用 OSS：
1. 安装 OSS SDK: `pnpm add ali-oss`
2. 修改 `attachmentService.ts`
3. 配置 OSS 凭证

或者保持当前架构，使用 ECS + 数据盘的方案也很稳定。

## 最佳实践

### ✅ 推荐做法

1. **使用绝对路径**（生产环境）
   ```bash
   UPLOAD_DIR=/data/cogniflow/uploads
   ```

2. **独立的数据目录**
   - 不要放在代码目录下
   - 便于备份和迁移
   - 代码更新不影响数据

3. **设置合理的权限**
   ```bash
   sudo chown app-user:app-user /data/cogniflow/uploads
   sudo chmod 755 /data/cogniflow/uploads
   ```

4. **定期备份**
   ```bash
   # 添加到 crontab
   0 3 * * * tar -czf /backup/uploads-$(date +\%Y\%m\%d).tar.gz \
     /data/cogniflow/uploads/
   ```

### ❌ 避免做法

1. **不要硬编码路径**
   ```typescript
   // ❌ 错误
   const uploadDir = '/home/ubuntu/uploads';
   
   // ✅ 正确
   const uploadDir = process.env.UPLOAD_DIR || './uploads';
   ```

2. **不要在数据库存绝对路径**
   ```sql
   -- ❌ 错误
   INSERT INTO attachments (file_path) 
   VALUES ('/data/cogniflow/uploads/images/xxx.jpg');
   
   -- ✅ 正确
   INSERT INTO attachments (file_path) 
   VALUES ('images/xxx.jpg');
   ```

3. **不要忽略权限问题**
   ```bash
   # 确保应用进程有权限
   ls -la /data/cogniflow/uploads/
   # drwxr-xr-x app-user app-user  ← 应该是应用运行的用户
   ```

## 监控和维护

### 磁盘使用监控

```bash
# 查看上传目录大小
du -sh /data/cogniflow/uploads

# 按类型统计
du -h --max-depth=1 /data/cogniflow/uploads

# 监控磁盘空间
df -h /data
```

### 清理策略

```bash
# 查找大文件
find /data/cogniflow/uploads -type f -size +50M

# 清理临时文件（如果有）
find /data/cogniflow/uploads/temp -mtime +7 -delete
```

### 性能优化

1. **使用 SSD 数据盘**（阿里云 ECS）
2. **启用文件系统缓存**
3. **配置 CDN**（高流量场景）
4. **考虑对象存储**（大规模场景）

## 相关文档

- [完整部署指南](./ALIYUN_ECS_DEPLOYMENT.md)
- [数据库配置](../configuration/DATABASE.md)
- [环境变量说明](../configuration/ENVIRONMENT.md)

## 总结

| 项目 | 说明 |
|------|------|
| **数据库** | 存储相对路径 (如 `images/xxx.jpg`) |
| **环境变量** | `UPLOAD_DIR` 配置基础目录 |
| **代码** | 自动拼接: `UPLOAD_DIR + 相对路径` |
| **迁移** | 只需同步文件 + 修改环境变量 |
| **优势** | 灵活、可移植、易维护 |

**一句话总结**：配置好 `UPLOAD_DIR` 环境变量，其他的交给系统处理！
