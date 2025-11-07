-- ============================================
-- 添加个人 API Key 支持
-- Migration: 008
-- ============================================
-- 用途: 允许用户配置自己的智谱 API Key
-- ============================================

\echo '开始添加个人 API Key 字段...'

-- 1. 添加 personal_api_key 字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_api_key VARCHAR(500);

\echo '✅ 字段添加完成'

-- 2. 创建索引（不加密，因为需要读取）
CREATE INDEX IF NOT EXISTS idx_users_personal_api_key ON users(personal_api_key) WHERE personal_api_key IS NOT NULL;

\echo '✅ 索引创建完成'

-- 3. 更新触发器：设置默认账户类型的 max_api_usage
-- 注册用户：40次，快速登录用户：10次
CREATE OR REPLACE FUNCTION set_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果 account_type 未设置，默认为 'registered'
    IF NEW.account_type IS NULL THEN
        NEW.account_type := 'registered';
    END IF;
    
    -- 根据账户类型设置 max_api_usage
    IF NEW.max_api_usage IS NULL THEN
        IF NEW.account_type = 'registered' THEN
            NEW.max_api_usage := 40;
        ELSIF NEW.account_type = 'quick_login' THEN
            NEW.max_api_usage := 10;
        ELSE
            NEW.max_api_usage := 40;
        END IF;
    END IF;
    
    -- 初始化 api_usage_count
    IF NEW.api_usage_count IS NULL THEN
        NEW.api_usage_count := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_user_defaults ON users;
CREATE TRIGGER trigger_set_user_defaults
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_user_defaults();

\echo '✅ 触发器更新完成'

-- 4. 更新现有的 API 使用函数
CREATE OR REPLACE FUNCTION check_and_increment_api_usage(p_user_id UUID)
RETURNS TABLE(
    can_use BOOLEAN,
    current_count INTEGER,
    max_count INTEGER,
    message TEXT
) AS $$
DECLARE
    v_current_count INTEGER;
    v_max_count INTEGER;
    v_has_personal_key BOOLEAN;
BEGIN
    -- 获取用户的 API 使用情况和是否有个人 API Key
    SELECT 
        api_usage_count,
        max_api_usage,
        personal_api_key IS NOT NULL AND personal_api_key != ''
    INTO v_current_count, v_max_count, v_has_personal_key
    FROM users
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, '用户不存在'::TEXT;
        RETURN;
    END IF;
    
    -- 如果用户有个人 API Key，不限制使用次数
    IF v_has_personal_key THEN
        -- 仍然增加计数，用于统计
        UPDATE users 
        SET api_usage_count = api_usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT 
            true,
            v_current_count + 1,
            -1, -- -1 表示无限制
            '使用个人 API Key，无限制'::TEXT;
        RETURN;
    END IF;
    
    -- 检查是否达到限制
    IF v_current_count >= v_max_count THEN
        RETURN QUERY SELECT 
            false,
            v_current_count,
            v_max_count,
            '已达到使用限制，请配置个人 API Key'::TEXT;
        RETURN;
    END IF;
    
    -- 增加使用次数
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

\echo '✅ API 使用函数更新完成'

-- 5. 更新获取用户 API 使用情况的函数
CREATE OR REPLACE FUNCTION get_user_api_usage(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    username VARCHAR(50),
    account_type VARCHAR(20),
    current_usage INTEGER,
    max_usage INTEGER,
    remaining INTEGER,
    has_personal_key BOOLEAN,
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
        CASE 
            WHEN u.personal_api_key IS NOT NULL AND u.personal_api_key != '' THEN -1
            ELSE u.max_api_usage - u.api_usage_count
        END as remaining,
        (u.personal_api_key IS NOT NULL AND u.personal_api_key != '') as has_personal_key,
        u.usage_reset_at
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

\echo '✅ API 使用查询函数更新完成'

-- 6. 添加注释
COMMENT ON COLUMN users.personal_api_key IS '用户个人的智谱 API Key，配置后将优先使用，不受次数限制';

\echo ''
\echo '=========================================='
\echo '✅ 个人 API Key 功能迁移完成！'
\echo '=========================================='
\echo '新增功能：'
\echo '1. 用户可以配置自己的智谱 API Key'
\echo '2. 配置个人 API Key 后不受使用次数限制'
\echo '3. 注册用户默认 40 次，快速登录用户 10 次'
\echo '=========================================='
