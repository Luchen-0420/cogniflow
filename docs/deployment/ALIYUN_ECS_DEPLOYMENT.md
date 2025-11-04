# 阿里云 ECS 部署指南

## 文件存储配置

### 问题说明

在阿里云 ECS 上部署时，需要正确配置文件上传目录，以确保：
1. 附件（图片、文档等）能正确保存
2. 已上传的文件能正确访问
3. 数据库中的文件路径引用正确

### 核心设计

系统采用了**相对路径存储 + 环境变量配置**的方案：

- **数据库存储**：相对路径（如 `images/1234567890-abc.jpg`）
- **实际访问**：通过环境变量 `UPLOAD_DIR` 配置基础目录
- **好处**：更换服务器或路径时，只需修改环境变量，无需修改数据库

### 配置步骤

#### 1. 创建上传目录

```bash
# 在 ECS 上创建专用的上传目录
sudo mkdir -p /data/cogniflow/uploads
sudo chown -R your-user:your-user /data/cogniflow/uploads
sudo chmod 755 /data/cogniflow/uploads
```

推荐的目录结构：
```
/data/cogniflow/
├── uploads/           # 主上传目录
│   ├── images/       # 图片文件
│   ├── documents/    # 文档文件
│   ├── videos/       # 视频文件
│   ├── audios/       # 音频文件
│   ├── others/       # 其他文件
│   └── thumbnails/   # 缩略图
```

#### 2. 配置环境变量

在 ECS 的 `.env` 文件中配置：

```bash
# 使用绝对路径（推荐）
UPLOAD_DIR=/data/cogniflow/uploads

# 或使用相对路径（相对于项目根目录）
# UPLOAD_DIR=./uploads
```

#### 3. 验证配置

启动应用后，查看日志输出：

```
📁 [AttachmentService] 上传目录配置:
   UPLOAD_BASE_DIR: /data/cogniflow/uploads
   THUMBNAIL_DIR: /data/cogniflow/uploads/thumbnails
   当前工作目录: /home/ubuntu/cogniflow
   环境变量 UPLOAD_DIR: /data/cogniflow/uploads
```

确认 `UPLOAD_BASE_DIR` 指向正确的目录。

### 数据迁移

如果从开发环境迁移到生产环境，需要同步上传的文件：

#### 方案1: rsync 同步（推荐）

```bash
# 从本地同步到 ECS
rsync -avz --progress \
  ./uploads/ \
  user@your-ecs-ip:/data/cogniflow/uploads/
```

#### 方案2: 压缩传输

```bash
# 本地打包
tar -czf uploads.tar.gz uploads/

# 上传到 ECS
scp uploads.tar.gz user@your-ecs-ip:/tmp/

# 在 ECS 上解压
ssh user@your-ecs-ip
cd /data/cogniflow
tar -xzf /tmp/uploads.tar.gz
```

### 权限配置

确保应用进程有权限读写上传目录：

```bash
# 设置目录所有者
sudo chown -R app-user:app-user /data/cogniflow/uploads

# 设置目录权限（755 = 所有者可读写执行，其他人可读执行）
sudo chmod -R 755 /data/cogniflow/uploads

# 如果使用 systemd 服务，确保服务用户有权限
# 在 /etc/systemd/system/cogniflow.service 中：
[Service]
User=app-user
Group=app-user
WorkingDirectory=/home/app-user/cogniflow
```

### Nginx 配置（如果使用反向代理）

如果通过 Nginx 提供静态文件服务：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 应用 API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件（可选，如果想通过 Nginx 直接提供）
    location /uploads/ {
        alias /data/cogniflow/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 前端应用
    location / {
        root /home/app-user/cogniflow/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 存储空间管理

#### 监控磁盘使用

```bash
# 查看上传目录大小
du -sh /data/cogniflow/uploads

# 按子目录查看
du -h --max-depth=1 /data/cogniflow/uploads
```

#### 设置清理策略（可选）

```bash
# 创建清理脚本 /data/cogniflow/scripts/cleanup-old-files.sh
#!/bin/bash
# 删除 90 天前的临时文件
find /data/cogniflow/uploads/temp -type f -mtime +90 -delete

# 添加到 crontab
crontab -e
# 每天凌晨 2 点执行清理
0 2 * * * /data/cogniflow/scripts/cleanup-old-files.sh
```

### 备份策略

#### 定期备份上传文件

```bash
#!/bin/bash
# backup-uploads.sh

BACKUP_DIR="/data/backups/cogniflow"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="uploads_backup_${DATE}.tar.gz"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 打包上传文件
tar -czf ${BACKUP_DIR}/${BACKUP_FILE} \
  -C /data/cogniflow uploads/

# 只保留最近 30 天的备份
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" \
  -mtime +30 -delete

echo "备份完成: ${BACKUP_FILE}"
```

添加到 crontab：
```bash
# 每天凌晨 3 点备份
0 3 * * * /data/cogniflow/scripts/backup-uploads.sh
```

### 常见问题

#### Q1: 图片上传后无法访问（404）

**检查项**：
1. 确认 `UPLOAD_DIR` 配置正确
2. 检查目录权限：`ls -la /data/cogniflow/uploads`
3. 查看应用日志中的上传目录配置
4. 确认文件确实存在：`ls -la /data/cogniflow/uploads/images/`

#### Q2: 权限错误（Permission denied）

```bash
# 修复权限
sudo chown -R app-user:app-user /data/cogniflow/uploads
sudo chmod -R 755 /data/cogniflow/uploads
```

#### Q3: 磁盘空间不足

```bash
# 检查磁盘使用
df -h

# 扩容 ECS 数据盘
# 1. 在阿里云控制台扩容
# 2. 在 ECS 上执行：
sudo resize2fs /dev/vdb1  # 根据实际设备名调整

# 或挂载新的数据盘
sudo mkdir -p /data
sudo mount /dev/vdb1 /data
# 添加到 /etc/fstab 自动挂载
```

#### Q4: 从旧服务器迁移

1. **导出数据库**（包含文件路径引用）
2. **同步上传文件**（使用 rsync）
3. **配置新服务器的 UPLOAD_DIR**
4. **导入数据库**
5. **重启应用**

### 安全建议

1. **设置合理的文件大小限制**
   ```bash
   # 在 .env 中
   MAX_FILE_SIZE=10485760  # 10MB
   ```

2. **防止目录遍历**
   - 代码已实现路径验证
   - 不要暴露上传目录的直接访问

3. **文件类型验证**
   - 系统已实现 MIME 类型白名单
   - 只允许特定格式的文件

4. **定期审计**
   ```bash
   # 查找异常大文件
   find /data/cogniflow/uploads -type f -size +100M
   
   # 统计文件类型
   find /data/cogniflow/uploads -type f | \
     sed 's/.*\.//' | sort | uniq -c | sort -rn
   ```

### Docker 部署（可选）

如果使用 Docker 部署，挂载上传目录为 volume：

```yaml
# docker-compose.yml
services:
  cogniflow:
    image: cogniflow:latest
    volumes:
      - /data/cogniflow/uploads:/app/uploads
    environment:
      - UPLOAD_DIR=/app/uploads
```

### 性能优化

#### 1. 使用对象存储（进阶）

对于高流量场景，考虑使用阿里云 OSS：

```typescript
// 需要修改 attachmentService.ts 支持 OSS
import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET
});

// 上传到 OSS
await client.put(filename, buffer);
```

#### 2. CDN 加速

配置阿里云 CDN 加速文件访问：
- 源站：ECS IP 或域名
- 加速域名：cdn.your-domain.com
- 缓存规则：根据文件类型设置

### 监控和日志

```bash
# 查看应用日志
journalctl -u cogniflow -f

# 监控上传目录变化
watch -n 5 'du -sh /data/cogniflow/uploads'

# 监控磁盘 I/O
iostat -x 1
```

## 总结

通过环境变量 `UPLOAD_DIR` 配置，系统可以灵活地部署到任何环境：

| 环境 | UPLOAD_DIR 配置 | 说明 |
|------|----------------|------|
| 开发 | `./uploads` | 相对路径，开发简单 |
| ECS | `/data/cogniflow/uploads` | 绝对路径，独立存储 |
| Docker | `/app/uploads` | 容器内路径，配合 volume |
| OSS | `oss://bucket-name/` | 对象存储（需额外开发）|

数据库中始终存储相对路径，确保迁移时无需修改数据。
