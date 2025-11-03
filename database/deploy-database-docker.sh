#!/bin/bash

# ============================================
# CogniFlow Docker 环境数据库部署脚本
# ============================================
# 使用方法: 
#   chmod +x deploy-database-docker.sh
#   ./deploy-database-docker.sh
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Docker 配置 (从 docker-compose.yml 读取)
CONTAINER_NAME="cogniflow-postgres"
DB_NAME="cogniflow"
DB_USER="cogniflow_user"
DB_PASSWORD="cogniflow_password_2024"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SQL_FILE="$SCRIPT_DIR/deploy.sql"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  CogniFlow 数据库一键部署工具${NC}"
echo -e "${BLUE}  (Docker 版本)${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 docker 命令${NC}"
    echo -e "${YELLOW}请先安装 Docker${NC}"
    exit 1
fi

# 检查容器是否运行
echo -e "${BLUE}🔍 检查 PostgreSQL 容器状态...${NC}"
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${YELLOW}⚠️  容器 '$CONTAINER_NAME' 未运行${NC}"
    echo -e "${YELLOW}正在启动容器...${NC}"
    
    cd "$PROJECT_ROOT"
    docker-compose up -d postgres
    
    echo -e "${YELLOW}等待数据库启动...${NC}"
    sleep 5
    
    # 等待数据库就绪
    for i in {1..30}; do
        if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 数据库已就绪${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
else
    echo -e "${GREEN}✅ 容器正在运行${NC}"
fi

echo ""

# 显示配置信息
echo -e "${YELLOW}📝 部署配置:${NC}"
echo -e "   容器名称: ${GREEN}$CONTAINER_NAME${NC}"
echo -e "   数据库名称: ${GREEN}$DB_NAME${NC}"
echo -e "   数据库用户: ${GREEN}$DB_USER${NC}"
echo ""

# 询问是否继续
read -p "是否继续部署? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

# 检查是否已有数据
echo -e "${BLUE}🔍 检查现有数据...${NC}"
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')" -t 2>/dev/null | grep -q 't'; then
    echo -e "${YELLOW}⚠️  检测到数据库中已有数据${NC}"
    read -p "是否创建备份? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p "$SCRIPT_DIR/backups"
        echo -e "${BLUE}💾 正在备份到: $SCRIPT_DIR/backups/$BACKUP_FILE${NC}"
        docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$SCRIPT_DIR/backups/$BACKUP_FILE"
        echo -e "${GREEN}✅ 备份完成${NC}"
    fi
    echo ""
fi

# 执行部署脚本
echo -e "${BLUE}🚀 开始执行部署脚本...${NC}"
echo ""

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ 错误: 找不到部署脚本 $SQL_FILE${NC}"
    exit 1
fi

# 将 SQL 文件复制到容器并执行
if cat "$SQL_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✨ 部署成功！${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 默认管理员账号:${NC}"
    echo -e "   用户名: ${GREEN}admin${NC}"
    echo -e "   密码:   ${GREEN}admin123${NC}"
    echo -e "   ${RED}⚠️  请在生产环境中立即修改默认密码！${NC}"
    echo ""
    echo -e "${YELLOW}📊 数据库信息:${NC}"
    echo -e "   容器: ${GREEN}$CONTAINER_NAME${NC}"
    echo -e "   端口: ${GREEN}5432${NC} (本地可通过 localhost:5432 访问)"
    echo -e "   pgAdmin: ${GREEN}http://localhost:5050${NC}"
    echo ""
    echo -e "${YELLOW}📝 下一步操作:${NC}"
    echo -e "   1. 配置环境变量 (.env 文件)"
    echo -e "   2. 启动后端服务: ${BLUE}cd server && npm run dev${NC}"
    echo -e "   3. 启动前端服务: ${BLUE}pnpm run dev${NC}"
    echo ""
    echo -e "${YELLOW}🔍 验证部署:${NC}"
    echo -e "   运行验证脚本: ${BLUE}./database/verify-deployment-docker.sh${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    echo -e "${YELLOW}请检查错误信息并重试${NC}"
    exit 1
fi
