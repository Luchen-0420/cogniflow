-- ============================================
-- 修复时区问题 - 设置数据库时区为 Asia/Shanghai
-- ============================================

-- 问题描述：
-- 1. 数据库时区设置为 UTC
-- 2. 应用发送的时间字符串没有时区信息（如 "2025-11-03T22:00:00"）
-- 3. PostgreSQL 将其理解为 UTC 时间，导致存储和显示都错误
-- 
-- 解决方案：
-- 1. 设置数据库默认时区为 Asia/Shanghai
-- 2. 修正现有数据（加 8 小时）

-- ============================================
-- 第一步：设置数据库时区
-- ============================================

-- 设置当前会话时区（临时）
SET TIME ZONE 'Asia/Shanghai';

-- 为数据库设置默认时区（永久）
ALTER DATABASE cogniflow SET timezone TO 'Asia/Shanghai';

-- ============================================
-- 第二步：修正现有数据
-- ============================================

-- 说明：现有数据都是被错误地按 UTC 存储的，实际应该是本地时间
-- 例如：存储的 "2025-11-03 22:00:00+00" 实际应该是 "2025-11-03 22:00:00+08"
-- 我们需要将时间值保持不变，但改变时区标记

-- 方法：先转换为不带时区的 TIMESTAMP，再加上正确的时区

-- 备份说明：在执行前建议先备份数据
-- docker exec cogniflow-postgres pg_dump -U cogniflow_user cogniflow > backup_before_timezone_fix.sql

-- 修正 items 表的时间字段
-- 注意：这里使用了特殊的转换方式
-- 1. 将 timestamptz 转为 timestamp（去掉时区，保留时间值）
-- 2. PostgreSQL 会按照新的数据库时区（Asia/Shanghai）重新解释这个时间

UPDATE items 
SET due_date = (due_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
WHERE due_date IS NOT NULL;

UPDATE items 
SET start_time = (start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai'),
    end_time = (end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
WHERE start_time IS NOT NULL;

UPDATE items 
SET recurrence_end_date = (recurrence_end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
WHERE recurrence_end_date IS NOT NULL;

UPDATE items 
SET url_fetched_at = (url_fetched_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
WHERE url_fetched_at IS NOT NULL;

UPDATE items 
SET archived_at = (archived_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
WHERE archived_at IS NOT NULL;

UPDATE items 
SET created_at = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai'),
    updated_at = (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai');

-- 修正 users 表的时间字段
UPDATE users 
SET created_at = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai'),
    updated_at = (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai');

UPDATE users 
SET last_login_at = (last_login_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
WHERE last_login_at IS NOT NULL;

-- 修正 user_settings 表的时间字段
UPDATE user_settings 
SET created_at = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai'),
    updated_at = (updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai');

-- ============================================
-- 第三步：验证修复结果
-- ============================================

-- 查看当前时区设置
SHOW timezone;

-- 查看最新的事项数据（应该显示正确的本地时间）
SELECT 
    title,
    start_time,
    end_time,
    due_date,
    created_at
FROM items 
WHERE type = 'event' 
ORDER BY created_at DESC 
LIMIT 5;

-- 显示说明
DO $$
BEGIN
    RAISE NOTICE '✅ 时区修复完成！';
    RAISE NOTICE '';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. 数据库时区已设置为 Asia/Shanghai';
    RAISE NOTICE '2. 所有时间字段已转换为正确的本地时间';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  重要：需要重启应用和数据库连接才能完全生效';
    RAISE NOTICE '   - 重启 Docker 容器：docker restart cogniflow-postgres';
    RAISE NOTICE '   - 重启应用服务器';
END $$;
