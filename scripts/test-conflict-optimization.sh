#!/bin/bash

# 测试优化后的冲突检测逻辑
# 验证已归档、已完成、过期的事项不会导致冲突

set -e

echo "=========================================="
echo "冲突检测优化测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="cogniflow"
DB_USER="postgres"
DB_PASSWORD="postgres"

# 连接字符串
PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

echo "📝 测试场景："
echo "1. 创建一个 10:00-11:00 的会议"
echo "2. 将该会议设置为完成状态"
echo "3. 创建一个 10:30-11:30 的新会议"
echo "4. 验证新会议不应该有冲突"
echo ""

# 获取测试用户ID
USER_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT id FROM users WHERE username = 'test_user' LIMIT 1" | xargs)

if [ -z "$USER_ID" ]; then
    echo -e "${RED}❌ 未找到测试用户，请先创建测试用户${NC}"
    exit 1
fi

echo "✅ 使用测试用户: $USER_ID"
echo ""

# 清理旧的测试数据
echo "🧹 清理旧的测试数据..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM items 
WHERE user_id = '$USER_ID' 
  AND title LIKE '测试会议%';
" > /dev/null

echo "✅ 清理完成"
echo ""

# 测试1: 完成状态的事项不应产生冲突
echo "=========================================="
echo "测试1: 完成状态的事项不应产生冲突"
echo "=========================================="

# 创建第一个会议（10:00-11:00）
echo "📅 创建第一个会议: 10:00-11:00"
ITEM1_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
INSERT INTO items (
    user_id, 
    raw_text, 
    type, 
    title, 
    start_time, 
    end_time, 
    status
) VALUES (
    '$USER_ID',
    '测试会议1 明天10点到11点',
    'event',
    '测试会议1',
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::timestamptz,
    'pending'
)
RETURNING id;
" | xargs)

echo "✅ 创建成功，ID: $ITEM1_ID"

# 将第一个会议标记为完成
echo "✔️  将会议1标记为完成..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
UPDATE items 
SET status = 'completed', updated_at = CURRENT_TIMESTAMP
WHERE id = '$ITEM1_ID';
" > /dev/null

echo "✅ 已标记为完成"

# 创建第二个会议（10:30-11:30），应该与第一个时间重叠
echo "📅 创建第二个会议: 10:30-11:30"
ITEM2_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
INSERT INTO items (
    user_id, 
    raw_text, 
    type, 
    title, 
    start_time, 
    end_time, 
    status
) VALUES (
    '$USER_ID',
    '测试会议2 明天10点半到11点半',
    'event',
    '测试会议2',
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours 30 minutes')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours 30 minutes')::timestamptz,
    'pending'
)
RETURNING id;
" | xargs)

echo "✅ 创建成功，ID: $ITEM2_ID"

# 手动触发冲突检测更新
echo "🔄 更新冲突状态..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
-- 重置所有冲突状态
UPDATE items SET has_conflict = false 
WHERE user_id = '$USER_ID' AND type = 'event' AND deleted_at IS NULL;

-- 查找活跃的事项并检测冲突
WITH active_events AS (
    SELECT id, start_time, end_time
    FROM items
    WHERE user_id = '$USER_ID'
      AND type = 'event'
      AND deleted_at IS NULL
      AND archived_at IS NULL
      AND status != 'completed'
      AND end_time >= CURRENT_TIMESTAMP
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
),
conflicts AS (
    SELECT DISTINCT e1.id
    FROM active_events e1
    JOIN active_events e2 ON e1.id != e2.id
    WHERE (
        (e1.start_time >= e2.start_time AND e1.start_time < e2.end_time) OR
        (e1.end_time > e2.start_time AND e1.end_time <= e2.end_time) OR
        (e1.start_time <= e2.start_time AND e1.end_time >= e2.end_time) OR
        (e2.start_time <= e1.start_time AND e2.end_time >= e1.end_time)
    )
)
UPDATE items
SET has_conflict = true
WHERE id IN (SELECT id FROM conflicts);
" > /dev/null

echo "✅ 冲突状态已更新"

# 检查冲突状态
echo ""
echo "📊 检查冲突状态："
CONFLICT_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    title,
    status,
    has_conflict,
    TO_CHAR(start_time, 'HH24:MI') as start,
    TO_CHAR(end_time, 'HH24:MI') as end
FROM items
WHERE id IN ('$ITEM1_ID', '$ITEM2_ID')
ORDER BY start_time;
")

echo "$CONFLICT_RESULT"

HAS_CONFLICT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT has_conflict FROM items WHERE id = '$ITEM2_ID';
" | xargs)

echo ""
if [ "$HAS_CONFLICT" = "f" ]; then
    echo -e "${GREEN}✅ 测试1通过：已完成的事项不产生冲突${NC}"
else
    echo -e "${RED}❌ 测试1失败：会议2不应该有冲突（已完成的会议1不应参与检测）${NC}"
fi

echo ""
echo ""

# 测试2: 归档状态的事项不应产生冲突
echo "=========================================="
echo "测试2: 归档状态的事项不应产生冲突"
echo "=========================================="

# 清理之前的测试数据
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM items 
WHERE user_id = '$USER_ID' 
  AND title LIKE '测试会议%';
" > /dev/null

# 创建第一个会议并归档
echo "📅 创建并归档会议3: 14:00-15:00"
ITEM3_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
INSERT INTO items (
    user_id, 
    raw_text, 
    type, 
    title, 
    start_time, 
    end_time, 
    status,
    archived_at
) VALUES (
    '$USER_ID',
    '测试会议3 明天14点到15点',
    'event',
    '测试会议3',
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours')::timestamptz,
    'pending',
    CURRENT_TIMESTAMP
)
RETURNING id;
" | xargs)

echo "✅ 创建并归档成功，ID: $ITEM3_ID"

# 创建第二个会议（14:30-15:30），应该与第一个时间重叠
echo "📅 创建会议4: 14:30-15:30"
ITEM4_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
INSERT INTO items (
    user_id, 
    raw_text, 
    type, 
    title, 
    start_time, 
    end_time, 
    status
) VALUES (
    '$USER_ID',
    '测试会议4 明天14点半到15点半',
    'event',
    '测试会议4',
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours 30 minutes')::timestamptz,
    (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours 30 minutes')::timestamptz,
    'pending'
)
RETURNING id;
" | xargs)

echo "✅ 创建成功，ID: $ITEM4_ID"

# 手动触发冲突检测
echo "🔄 更新冲突状态..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
UPDATE items SET has_conflict = false 
WHERE user_id = '$USER_ID' AND type = 'event' AND deleted_at IS NULL;

WITH active_events AS (
    SELECT id, start_time, end_time
    FROM items
    WHERE user_id = '$USER_ID'
      AND type = 'event'
      AND deleted_at IS NULL
      AND archived_at IS NULL
      AND status != 'completed'
      AND end_time >= CURRENT_TIMESTAMP
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
),
conflicts AS (
    SELECT DISTINCT e1.id
    FROM active_events e1
    JOIN active_events e2 ON e1.id != e2.id
    WHERE (
        (e1.start_time >= e2.start_time AND e1.start_time < e2.end_time) OR
        (e1.end_time > e2.start_time AND e1.end_time <= e2.end_time) OR
        (e1.start_time <= e2.start_time AND e1.end_time >= e2.end_time) OR
        (e2.start_time <= e1.start_time AND e2.end_time >= e1.end_time)
    )
)
UPDATE items
SET has_conflict = true
WHERE id IN (SELECT id FROM conflicts);
" > /dev/null

echo "✅ 冲突状态已更新"

HAS_CONFLICT_4=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT has_conflict FROM items WHERE id = '$ITEM4_ID';
" | xargs)

echo ""
if [ "$HAS_CONFLICT_4" = "f" ]; then
    echo -e "${GREEN}✅ 测试2通过：已归档的事项不产生冲突${NC}"
else
    echo -e "${RED}❌ 测试2失败：会议4不应该有冲突（已归档的会议3不应参与检测）${NC}"
fi

echo ""
echo ""

# 测试3: 过期事项不应产生冲突
echo "=========================================="
echo "测试3: 过期事项不应产生冲突"
echo "=========================================="

# 清理之前的测试数据
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM items 
WHERE user_id = '$USER_ID' 
  AND title LIKE '测试会议%';
" > /dev/null

# 创建一个过期的会议（昨天）
echo "📅 创建过期会议5: 昨天10:00-11:00"
ITEM5_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
INSERT INTO items (
    user_id, 
    raw_text, 
    type, 
    title, 
    start_time, 
    end_time, 
    status
) VALUES (
    '$USER_ID',
    '测试会议5 昨天10点到11点',
    'event',
    '测试会议5',
    (CURRENT_DATE - INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz,
    (CURRENT_DATE - INTERVAL '1 day' + INTERVAL '11 hours')::timestamptz,
    'pending'
)
RETURNING id;
" | xargs)

echo "✅ 创建成功，ID: $ITEM5_ID"

# 创建今天的会议
echo "📅 创建会议6: 今天10:00-11:00"
ITEM6_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
INSERT INTO items (
    user_id, 
    raw_text, 
    type, 
    title, 
    start_time, 
    end_time, 
    status
) VALUES (
    '$USER_ID',
    '测试会议6 今天10点到11点',
    'event',
    '测试会议6',
    (CURRENT_DATE + INTERVAL '10 hours')::timestamptz,
    (CURRENT_DATE + INTERVAL '11 hours')::timestamptz,
    'pending'
)
RETURNING id;
" | xargs)

echo "✅ 创建成功，ID: $ITEM6_ID"

# 手动触发冲突检测
echo "🔄 更新冲突状态..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
UPDATE items SET has_conflict = false 
WHERE user_id = '$USER_ID' AND type = 'event' AND deleted_at IS NULL;

WITH active_events AS (
    SELECT id, start_time, end_time
    FROM items
    WHERE user_id = '$USER_ID'
      AND type = 'event'
      AND deleted_at IS NULL
      AND archived_at IS NULL
      AND status != 'completed'
      AND end_time >= CURRENT_TIMESTAMP
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
),
conflicts AS (
    SELECT DISTINCT e1.id
    FROM active_events e1
    JOIN active_events e2 ON e1.id != e2.id
    WHERE (
        (e1.start_time >= e2.start_time AND e1.start_time < e2.end_time) OR
        (e1.end_time > e2.start_time AND e1.end_time <= e2.end_time) OR
        (e1.start_time <= e2.start_time AND e1.end_time >= e2.end_time) OR
        (e2.start_time <= e1.start_time AND e2.end_time >= e1.end_time)
    )
)
UPDATE items
SET has_conflict = true
WHERE id IN (SELECT id FROM conflicts);
" > /dev/null

echo "✅ 冲突状态已更新"

HAS_CONFLICT_6=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT has_conflict FROM items WHERE id = '$ITEM6_ID';
" | xargs)

echo ""
if [ "$HAS_CONFLICT_6" = "f" ]; then
    echo -e "${GREEN}✅ 测试3通过：过期的事项不产生冲突${NC}"
else
    echo -e "${RED}❌ 测试3失败：会议6不应该有冲突（过期的会议5不应参与检测）${NC}"
fi

echo ""
echo ""

# 清理测试数据
echo "🧹 清理测试数据..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM items 
WHERE user_id = '$USER_ID' 
  AND title LIKE '测试会议%';
" > /dev/null

echo "✅ 清理完成"
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
