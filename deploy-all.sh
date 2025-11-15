#!/bin/bash

# ============================================
# CogniFlow 完整一键部署脚本
# ============================================
# 功能:
# 1. 停止并删除旧容器
# 2. 清理旧数据
# 3. 启动 PostgreSQL 容器
# 4. 初始化数据库和表
# 5. 安装依赖并启动服务
# ============================================

set -e  # 遇到错误立即退出

# ============================================
# 配置区域
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Docker 配置
CONTAINER_NAME="cogniflow-postgres"
DB_NAME="cogniflow"
DB_USER="cogniflow_user"
DB_PASSWORD="cogniflow_password_2024"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 日志函数
log_header() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_step() {
    echo -e "${MAGENTA}➜ $1${NC}"
}

# ============================================
# 开始部署
# ============================================

clear
log_header "CogniFlow 完整一键部署脚本 v1.2.0"
echo -e "${CYAN}此脚本将执行以下操作:${NC}"
echo -e "  1. 停止并删除旧容器和数据卷"
echo -e "  2. 启动新的 PostgreSQL 容器"
echo -e "  3. 初始化数据库和所有表"
echo -e "  4. 安装项目依赖"
echo -e "  5. 配置环境变量"
echo ""
echo -e "${MAGENTA}📦 v1.2.0 新功能:${NC}"
echo -e "  • 用户个人 API Key 配置"
echo -e "  • 注册用户默认 40 次 API 调用"
echo -e "  • 快速登录用户默认 10 次 API 调用"
echo -e "  • 配置个人 API Key 后无限制使用"
echo ""
echo -e "${MAGENTA}🤖 v1.3.0 新功能:${NC}"
echo -e "  • AI 主动辅助功能"
echo -e "  • 自动检测关键词并生成辅助信息"
echo -e "  • 定时轮询处理任务（每30分钟）"
echo -e "  • 任务完成后显示气泡提示"
echo ""
echo -e "${RED}警告: 此操作将删除所有现有数据！${NC}"
echo ""
read -p "确认继续部署? (输入 yes 继续): " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    log_warning "部署已取消"
    exit 0
fi

# ============================================
# Step 1: 检查依赖
# ============================================
log_header "Step 1/7: 检查系统依赖"

log_step "检查 Docker..."
if ! command -v docker &> /dev/null; then
    log_error "未找到 Docker，请先安装 Docker"
    exit 1
fi
log_success "Docker 已安装"

log_step "检查 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    log_error "未找到 Docker Compose，请先安装"
    exit 1
fi
log_success "Docker Compose 已安装"

log_step "检查 Node.js..."
if ! command -v node &> /dev/null; then
    log_error "未找到 Node.js，请先安装 Node.js"
    exit 1
fi
NODE_VERSION=$(node -v)
log_success "Node.js 已安装 ($NODE_VERSION)"

log_step "检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    log_warning "未找到 pnpm，正在安装..."
    npm install -g pnpm
fi
log_success "pnpm 已安装"

# ============================================
# Step 2: 清理旧环境
# ============================================
log_header "Step 2/7: 清理旧环境"

log_step "停止所有相关容器..."
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    log_success "容器已停止"
fi

if docker ps -a | grep -q "cogniflow-pgadmin"; then
    docker stop cogniflow-pgadmin 2>/dev/null || true
    log_success "pgAdmin 容器已停止"
fi

log_step "删除旧容器..."
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
docker rm -f cogniflow-pgadmin 2>/dev/null || true
log_success "旧容器已删除"

log_step "删除数据卷..."
docker volume rm cogniflow_postgres_data 2>/dev/null || true
docker volume rm cogniflow_pgadmin_data 2>/dev/null || true
log_success "数据卷已清理"

log_step "清理网络..."
docker network rm cogniflow_cogniflow-network 2>/dev/null || true
log_success "网络已清理"

# ============================================
# Step 3: 启动 PostgreSQL 容器
# ============================================
log_header "Step 3/7: 启动 PostgreSQL 容器"

log_step "启动 Docker Compose..."
cd "$SCRIPT_DIR"
docker-compose up -d postgres
log_step "等待 PostgreSQL 启动..."
docker-compose up -d pgadmin
log_step "等待 PgAdmin 启动..."
sleep 5

# 等待数据库就绪
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log_success "PostgreSQL 已就绪"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "PostgreSQL 启动超时"
    exit 1
fi

log_success "PostgreSQL 容器启动成功"

# ============================================
# Step 4: 初始化数据库
# ============================================
log_header "Step 4/7: 初始化数据库"

log_step "创建数据库扩展..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null 2>&1
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" > /dev/null 2>&1
log_success "数据库扩展创建完成"

log_step "执行数据库初始化脚本..."
if [ ! -f "$SCRIPT_DIR/database/deploy.sql" ]; then
    log_error "找不到部署脚本: database/deploy.sql"
    exit 1
fi

cat "$SCRIPT_DIR/database/deploy.sql" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
log_success "数据库表和数据初始化完成"

# 验证表是否创建成功
log_step "验证数据库表..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
if [ "$TABLE_COUNT" -ge 13 ]; then
    log_success "数据库表验证通过 ($TABLE_COUNT 个表)"
else
    log_error "数据库表验证失败，仅找到 $TABLE_COUNT 个表（期望至少 13 个）"
    exit 1
fi

# 验证新功能是否部署成功
log_step "验证 API Key 功能..."
PERSONAL_API_KEY_COLUMN=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'personal_api_key';" | tr -d ' ')
if [ "$PERSONAL_API_KEY_COLUMN" == "personal_api_key" ]; then
    log_success "个人 API Key 功能已部署"
else
    log_warning "个人 API Key 字段未找到，可能需要手动迁移"
fi

log_step "验证留言板功能..."
MESSAGES_TABLE=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages';" | tr -d ' ')
if [ "$MESSAGES_TABLE" == "messages" ]; then
    log_success "留言板功能已部署"
else
    log_warning "留言板表未找到，可能需要手动迁移"
fi

log_step "验证 AI 辅助任务功能..."
AI_ASSIST_TABLE=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_assist_tasks';" | tr -d ' ')
if [ "$AI_ASSIST_TABLE" == "ai_assist_tasks" ]; then
    log_success "AI 辅助任务功能已部署"
else
    log_warning "AI 辅助任务表未找到，可能需要手动迁移"
fi

# ============================================
# Step 5: 配置环境变量
# ============================================
log_header "Step 5/7: 配置环境变量"

# 配置后端环境变量
log_step "配置后端 .env 文件..."
cat > "$SCRIPT_DIR/server/.env" << EOF
# PostgreSQL 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# 服务器配置
PORT=3001
FRONTEND_URL=http://127.0.0.1:5173
NODE_ENV=development

# JWT 密钥
JWT_SECRET=cogniflow-secret-key-$(openssl rand -hex 16)

# 邮件提醒配置（需要手动配置 QQ 邮箱授权码）
EMAIL_USER=646184101@qq.com
EMAIL_PASSWORD=
EOF
log_success "后端环境变量配置完成"
log_warning "请手动配置 server/.env 中的 EMAIL_PASSWORD（QQ邮箱授权码）以启用邮件提醒功能"

# 配置前端环境变量（如果需要）
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    log_step "配置前端 .env 文件..."
    cat > "$SCRIPT_DIR/.env" << EOF
VITE_API_URL=http://127.0.0.1:3001
EOF
    log_success "前端环境变量配置完成"
fi

# ============================================
# Step 6: 安装依赖
# ============================================
log_header "Step 6/7: 安装项目依赖"

log_step "安装前端依赖..."
cd "$SCRIPT_DIR"
pnpm install --silent
log_success "前端依赖安装完成"

log_step "安装后端依赖..."
cd "$SCRIPT_DIR/server"
pnpm install --silent
log_success "后端依赖安装完成"

log_step "安装邮件提醒依赖..."
pnpm add nodemailer --silent
pnpm add -D @types/nodemailer --silent
pnpm add -D tsx --silent
log_success "邮件提醒依赖安装完成"
# ============================================
# Step 7: 显示部署信息
# ============================================
log_header "Step 7/7: 部署完成"

echo ""
echo -e "${GREEN}✨ CogniFlow 部署成功！${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 数据库信息${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  容器名称: ${GREEN}$CONTAINER_NAME${NC}"
echo -e "  数据库名: ${GREEN}$DB_NAME${NC}"
echo -e "  用户名:   ${GREEN}$DB_USER${NC}"
echo -e "  密码:     ${GREEN}$DB_PASSWORD${NC}"
echo -e "  端口:     ${GREEN}5432${NC}"
echo -e "  pgAdmin:  ${GREEN}http://localhost:5050${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}👤 默认管理员账号${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  用户名: ${GREEN}admin${NC}"
echo -e "  密码:   ${GREEN}admin123${NC}"
echo -e "  ${RED}⚠️  请登录后立即修改密码！${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔑 API 使用说明 (v1.2.0)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  • 注册用户默认: ${GREEN}40 次${NC} API 调用"
echo -e "  • 快速登录用户: ${GREEN}10 次${NC} API 调用"
echo -e "  • 配置个人 API Key 后: ${GREEN}无限制${NC} 使用"
echo -e "  • 配置入口: 个人资料页面 → API 配置"
echo -e "  • 获取 API Key: ${BLUE}https://open.bigmodel.cn/${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}� 邮件提醒配置 (v1.3.0)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  • 功能: 日程开始前 ${GREEN}5 分钟${NC} 自动邮件提醒"
echo -e "  • 发件邮箱: ${GREEN}646184101@qq.com${NC}"
echo -e "  • ${YELLOW}需要配置:${NC} 编辑 ${BLUE}server/.env${NC} 添加 ${GREEN}EMAIL_PASSWORD${NC}"
echo -e "  • 获取授权码: QQ邮箱 → 设置 → 账户 → 生成授权码"
echo -e "  • 配置文档: ${BLUE}docs/quickstart/REMINDER_QUICKSTART.md${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}�📋 数据库统计${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    '📊 表总数' as 项目, 
    COUNT(*)::text as 数量
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT '👥 用户数', COUNT(*)::text FROM users
UNION ALL
SELECT '📋 模板数', COUNT(*)::text FROM user_templates
UNION ALL
SELECT '🏷️  标签数', COUNT(*)::text FROM tags;
EOF
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🚀 启动服务${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${MAGENTA}方式一: 同时启动前后端 (推荐)${NC}"
echo -e "    ${BLUE}pnpm run dev:postgres${NC}"
echo ""
echo -e "  ${MAGENTA}方式二: 分别启动${NC}"
echo -e "    终端1: ${BLUE}cd server && pnpm run dev${NC}  (后端 http://localhost:3001)"
echo -e "    终端2: ${BLUE}pnpm run dev${NC}             (前端 http://127.0.0.1:5173)"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 验证部署${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BLUE}./database/verify-deployment-docker.sh${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📚 常用命令${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  查看容器日志:   ${BLUE}docker logs -f $CONTAINER_NAME${NC}"
echo -e "  进入数据库:     ${BLUE}docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME${NC}"
echo -e "  停止容器:       ${BLUE}docker-compose down${NC}"
echo -e "  重启容器:       ${BLUE}docker-compose restart${NC}"
echo -e "  查看所有表:     ${BLUE}docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c '\\dt'${NC}"
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 部署完成，祝使用愉快！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
