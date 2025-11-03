#!/bin/bash

# ============================================
# CogniFlow 清空 Docker 容器内数据库所有数据
# ============================================
# 此脚本会清空 Docker 容器内数据库的所有表数据
# 但保留表结构、索引、触发器等
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
CONTAINER_NAME="cogniflow-postgres"
DB_NAME="cogniflow"
DB_USER="cogniflow_user"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/clear_data.sql"

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 打印标题
echo ""
echo "========================================"
echo "  CogniFlow 数据库数据清空工具"
echo "========================================"
echo ""

# 检查 Docker 容器是否运行
print_info "检查 Docker 容器状态..."
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_error "Docker 容器 '$CONTAINER_NAME' 未运行"
    print_info "请先启动 Docker 容器: docker-compose up -d"
    exit 1
fi
print_success "Docker 容器运行中"

# 检查 SQL 文件是否存在
if [ ! -f "$SQL_FILE" ]; then
    print_error "SQL 文件不存在: $SQL_FILE"
    exit 1
fi

# 二次确认
print_warning "此操作将清空数据库中的所有数据！"
print_warning "数据库: $DB_NAME"
print_warning "容器: $CONTAINER_NAME"
echo ""
read -p "$(echo -e ${YELLOW}是否继续？请输入 YES 确认: ${NC})" -r
echo ""

if [[ ! $REPLY =~ ^YES$ ]]; then
    print_info "操作已取消"
    exit 0
fi

# 显示数据清空前的统计
print_info "数据清空前的统计..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
ORDER BY table_name;
EOF

echo ""
print_info "开始清空数据..."

# 执行清空脚本
if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f /dev/stdin < "$SQL_FILE"; then
    echo ""
    print_success "数据清空完成！"
    echo ""
    print_info "表结构、索引、触发器、视图均已保留"
    print_info "默认管理员账号已清除，如需使用请重新初始化数据库"
else
    echo ""
    print_error "数据清空失败"
    exit 1
fi

echo ""
echo "========================================"
echo "  清空完成"
echo "========================================"
echo ""
