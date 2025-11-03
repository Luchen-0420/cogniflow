#!/bin/bash

# ============================================
# CogniFlow Docker 环境数据库验证脚本
# ============================================
# 使用方法: ./verify-deployment-docker.sh
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Docker 配置
CONTAINER_NAME="cogniflow-postgres"
DB_NAME="cogniflow"
DB_USER="cogniflow_user"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  CogniFlow 数据库验证工具${NC}"
echo -e "${BLUE}  (Docker 版本)${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查容器是否运行
echo -e "${YELLOW}🔍 检查容器状态...${NC}"
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${GREEN}✅ 容器正在运行${NC}"
else
    echo -e "${RED}❌ 容器未运行${NC}"
    echo -e "${YELLOW}请先启动容器: docker-compose up -d postgres${NC}"
    exit 1
fi

echo ""

# 检查数据库连接
echo -e "${YELLOW}🔍 检查数据库连接...${NC}"
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接成功${NC}"
else
    echo -e "${RED}❌ 无法连接到数据库${NC}"
    exit 1
fi

echo ""

# 验证表
echo -e "${YELLOW}📋 验证表结构...${NC}"
REQUIRED_TABLES=("users" "user_settings" "items" "user_templates" "tags" "activity_logs" "user_statistics" "system_logs" "sessions" "backups")
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table')" -t 2>/dev/null | grep -q 't'; then
        echo -e "  ${GREEN}✓${NC} $table"
    else
        echo -e "  ${RED}✗${NC} $table"
        MISSING_TABLES+=("$table")
    fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 所有表都已创建${NC}"
else
    echo -e "${RED}❌ 缺少 ${#MISSING_TABLES[@]} 个表${NC}"
    exit 1
fi

echo ""

# 验证扩展
echo -e "${YELLOW}🔌 验证数据库扩展...${NC}"
EXTENSIONS=("uuid-ossp" "pgcrypto")
for ext in "${EXTENSIONS[@]}"; do
    if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = '$ext')" -t 2>/dev/null | grep -q 't'; then
        echo -e "  ${GREEN}✓${NC} $ext"
    else
        echo -e "  ${RED}✗${NC} $ext"
    fi
done

echo ""

# 验证默认数据
echo -e "${YELLOW}👤 验证默认数据...${NC}"

# 检查管理员用户
ADMIN_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null | tr -d ' ')
if [ "$ADMIN_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} 管理员账号已创建"
else
    echo -e "  ${RED}✗${NC} 管理员账号不存在"
fi

# 检查模板
TEMPLATE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM user_templates;" 2>/dev/null | tr -d ' ')
if [ "$TEMPLATE_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} 默认模板已创建 (${TEMPLATE_COUNT} 个)"
else
    echo -e "  ${YELLOW}⚠${NC} 未找到默认模板"
fi

echo ""

# 验证索引
echo -e "${YELLOW}📊 验证索引...${NC}"
INDEX_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
echo -e "  已创建 ${GREEN}$INDEX_COUNT${NC} 个索引"

echo ""

# 验证触发器
echo -e "${YELLOW}⚙️  验证触发器...${NC}"
TRIGGER_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgisinternal = false;" 2>/dev/null | tr -d ' ')
echo -e "  已创建 ${GREEN}$TRIGGER_COUNT${NC} 个触发器"

echo ""

# 显示数据库统计
echo -e "${YELLOW}📈 数据库统计:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    '用户数' as 项目, 
    COUNT(*)::text as 数量
FROM users
UNION ALL
SELECT '模板数', COUNT(*)::text FROM user_templates
UNION ALL
SELECT '条目数', COUNT(*)::text FROM items
UNION ALL
SELECT '标签数', COUNT(*)::text FROM tags;
EOF

echo ""

# 显示模板详情
echo -e "${YELLOW}📋 默认模板:${NC}"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    icon || ' /' || trigger_word as 触发词,
    template_name as 模板名称,
    is_active as 启用状态
FROM user_templates
ORDER BY sort_order
LIMIT 10;
EOF

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✨ 验证完成！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo -e "  - 默认管理员: ${GREEN}admin${NC} / ${GREEN}admin123${NC}"
echo -e "  - 请立即修改默认密码"
echo -e "  - 容器名称: ${GREEN}$CONTAINER_NAME${NC}"
echo -e "  - 本地端口: ${GREEN}localhost:5432${NC}"
echo -e "  - pgAdmin: ${GREEN}http://localhost:5050${NC}"
echo ""
