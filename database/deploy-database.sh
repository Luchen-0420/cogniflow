#!/bin/bash

# ============================================
# CogniFlow 一键部署脚本
# ============================================
# 使用方法: 
#   chmod +x deploy-database.sh
#   ./deploy-database.sh
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量 (请根据实际情况修改)
DB_NAME="${DB_NAME:-cogniflow}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SQL_FILE="$SCRIPT_DIR/deploy.sql"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  CogniFlow 数据库一键部署工具${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查 PostgreSQL 是否安装
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 psql 命令${NC}"
    echo -e "${YELLOW}请先安装 PostgreSQL 客户端${NC}"
    exit 1
fi

# 显示配置信息
echo -e "${YELLOW}📝 部署配置:${NC}"
echo -e "   数据库名称: ${GREEN}$DB_NAME${NC}"
echo -e "   数据库用户: ${GREEN}$DB_USER${NC}"
echo -e "   数据库主机: ${GREEN}$DB_HOST${NC}"
echo -e "   数据库端口: ${GREEN}$DB_PORT${NC}"
echo ""

# 询问是否继续
read -p "是否继续部署? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

# 检查数据库是否存在
echo -e "${BLUE}🔍 检查数据库...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${GREEN}✅ 数据库 '$DB_NAME' 已存在${NC}"
else
    echo -e "${YELLOW}⚠️  数据库 '$DB_NAME' 不存在，正在创建...${NC}"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    echo -e "${GREEN}✅ 数据库创建成功${NC}"
fi

echo ""

# 询问是否备份现有数据
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')" -t | grep -q 't'; then
    echo -e "${YELLOW}⚠️  检测到数据库中已有数据${NC}"
    read -p "是否创建备份? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_FILE="$SCRIPT_DIR/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p "$SCRIPT_DIR/backups"
        echo -e "${BLUE}💾 正在备份到: $BACKUP_FILE${NC}"
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"
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

# 执行 SQL 脚本
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
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
    echo -e "${YELLOW}📝 下一步操作:${NC}"
    echo -e "   1. 配置环境变量 (.env 文件)"
    echo -e "   2. 启动后端服务: ${BLUE}cd server && npm run dev${NC}"
    echo -e "   3. 启动前端服务: ${BLUE}pnpm run dev${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ 部署失败${NC}"
    echo -e "${RED}=========================================${NC}"
    echo -e "${YELLOW}请检查错误信息并重试${NC}"
    exit 1
fi
