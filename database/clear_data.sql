-- ============================================
-- CogniFlow 清空所有数据，保留表结构
-- ============================================
-- 此脚本会清空数据库中所有表的数据，但保留表结构、索引和触发器
-- 警告：此操作不可逆，请谨慎使用！
-- ============================================

-- 禁用外键约束检查（PostgreSQL）
SET session_replication_role = 'replica';

\echo '⚠️  警告：即将清空所有数据库表...'
\echo ''

-- 清空所有表的数据（按依赖关系顺序）
-- 1. 首先清空没有依赖关系的表
\echo '🗑️  清空日志和统计表...'
TRUNCATE TABLE system_logs CASCADE;
TRUNCATE TABLE activity_logs CASCADE;
TRUNCATE TABLE user_statistics CASCADE;
TRUNCATE TABLE backups CASCADE;

-- 2. 清空会话表
\echo '🗑️  清空会话表...'
TRUNCATE TABLE sessions CASCADE;

-- 3. 清空标签和条目表
\echo '🗑️  清空标签和条目表...'
TRUNCATE TABLE tags CASCADE;
TRUNCATE TABLE items CASCADE;

-- 4. 清空用户配置表
\echo '🗑️  清空用户配置表...'
TRUNCATE TABLE user_settings CASCADE;

-- 5. 最后清空用户表（因为其他表都依赖它）
\echo '🗑️  清空用户表...'
TRUNCATE TABLE users CASCADE;

-- 重置序列（如果有自增ID）
-- 注意：UUID 不需要重置，但如果有 SERIAL 类型的 ID，需要在这里重置

-- 启用外键约束检查
SET session_replication_role = 'origin';

\echo ''
\echo '✅ 所有数据已清空，表结构、索引和触发器保留'
\echo ''

-- 显示清空结果
\echo '📊 验证当前记录数：'
SELECT 
    'users' as table_name,
    COUNT(*) as record_count
FROM users
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings
UNION ALL
SELECT 'user_statistics', COUNT(*) FROM user_statistics
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'system_logs', COUNT(*) FROM system_logs
UNION ALL
SELECT 'backups', COUNT(*) FROM backups
ORDER BY table_name;

\echo ''
\echo '✨ 数据清空完成！'
