-- ============================================
-- 添加 API 使用限制字段到现有数据库
-- ============================================
-- 用途: 在不清空数据的情况下添加缺失的字段
-- 使用方法: docker exec -i cogniflow-postgres psql -U cogniflow_user -d cogniflow < database/add_api_usage_fields.sql
-- ============================================

\echo '开始添加 API 使用限制字段...'

-- 1. 添加新字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'registered' CHECK (account_type IN ('registered', 'quick_login'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_usage_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_api_usage INTEGER DEFAULT 100;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP WITH TIME ZONE;

\echo '✅ 字段添加完成'

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_api_usage ON users(api_usage_count, max_api_usage);

\echo '✅ 索引创建完成'

-- 3. 为现有用户设置初始值
UPDATE users 
SET account_type = CASE 
        WHEN username LIKE 'guest_%' THEN 'quick_login'
        ELSE 'registered'
    END,
    api_usage_count = 0,
    max_api_usage = CASE 
        WHEN username LIKE 'guest_%' THEN 50
        ELSE 100
    END
WHERE account_type IS NULL OR api_usage_count IS NULL;

\echo '✅ 现有用户数据初始化完成'

-- 4. 创建或更新触发器函数
CREATE OR REPLACE FUNCTION set_initial_api_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果是快捷登录用户（用户名以 guest_ 开头）
    IF NEW.username LIKE 'guest_%' THEN
        NEW.account_type := 'quick_login';
        NEW.max_api_usage := 50;
    ELSE
        NEW.account_type := 'registered';
        NEW.max_api_usage := 100;
    END IF;
    
    NEW.api_usage_count := 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_initial_api_limits ON users;
CREATE TRIGGER trg_set_initial_api_limits
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_api_limits();

\echo '✅ 触发器创建完成'

-- 5. 创建 API 使用管理函数
CREATE OR REPLACE FUNCTION check_and_increment_api_usage(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    current_count INTEGER,
    max_count INTEGER,
    message TEXT
) AS $$
DECLARE
    v_current_count INTEGER;
    v_max_count INTEGER;
BEGIN
    -- 获取当前使用次数和最大次数
    SELECT api_usage_count, max_api_usage 
    INTO v_current_count, v_max_count
    FROM users 
    WHERE id = p_user_id;
    
    -- 检查是否超过限制
    IF v_current_count >= v_max_count THEN
        RETURN QUERY SELECT 
            false,
            v_current_count,
            v_max_count,
            '已达到 API 使用次数上限'::TEXT;
        RETURN;
    END IF;
    
    -- 扣减次数
    UPDATE users 
    SET api_usage_count = api_usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT 
        true,
        v_current_count + 1,
        v_max_count,
        '使用次数已扣减'::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_api_usage(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    username VARCHAR(50),
    account_type VARCHAR(20),
    current_usage INTEGER,
    max_usage INTEGER,
    remaining INTEGER,
    usage_reset_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.account_type,
        u.api_usage_count,
        u.max_api_usage,
        u.max_api_usage - u.api_usage_count as remaining,
        u.usage_reset_at
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_user_api_usage(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET api_usage_count = 0,
        usage_reset_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

\echo '✅ API 管理函数创建完成'

-- 6. 验证
\echo ''
\echo '========================================='
\echo '验证结果:'
\echo '========================================='
\d users

SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE account_type = 'registered') as registered_users,
    COUNT(*) FILTER (WHERE account_type = 'quick_login') as quick_login_users
FROM users;

\echo ''
\echo '========================================='
\echo '✅ API 使用限制功能添加完成！'
\echo '========================================='
