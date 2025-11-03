#!/bin/bash

# 测试时区修复是否成功

echo "======================================"
echo "测试时区修复"
echo "======================================"
echo ""

echo "1. 查看数据库时区设置："
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "SHOW timezone;"
echo ""

echo "2. 查看数据库当前时间："
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "SELECT NOW() as current_time;"
echo ""

echo "3. 插入测试数据（今晚10点开会）："
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
INSERT INTO items (
  user_id, 
  raw_text, 
  type, 
  title, 
  description, 
  due_date, 
  start_time, 
  end_time,
  priority,
  status
) VALUES (
  '7ed951c8-21c0-455f-834b-901047c58da0',
  '今晚十点开会',
  'event',
  '测试会议',
  '今晚十点开会 - 时区修复测试',
  '2025-11-03T22:00:00',
  '2025-11-03T22:00:00',
  '2025-11-03T23:00:00',
  'medium',
  'pending'
) RETURNING id, title, start_time, end_time, created_at;
"
echo ""

echo "4. 查询刚插入的数据："
docker exec cogniflow-postgres psql -U cogniflow_user -d cogniflow -c "
SELECT 
  title,
  start_time,
  end_time,
  created_at,
  start_time::text as start_time_text
FROM items 
WHERE title = '测试会议';
"
echo ""

echo "======================================"
echo "预期结果："
echo "- start_time 应显示为: 2025-11-03 22:00:00+08"
echo "- 时间应该正确显示为晚上 10 点"
echo "- 不应该出现时区转换问题"
echo "======================================"
