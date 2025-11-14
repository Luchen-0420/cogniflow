-- ============================================
-- CogniFlow 完整数据库部署脚本
-- PostgreSQL 16+
-- 版本: 1.0.0
-- 日期: 2025-11-03
-- ============================================
-- 说明: 此脚本用于在生产环境中一键创建所有必要的表和初始数据
-- 使用方法: psql -U postgres -d cogniflow -f deploy.sql
-- ============================================

\echo '========================================='
\echo '开始 CogniFlow 数据库部署...'
\echo '========================================='

-- ============================================
-- Step 0: 设置时区
-- ============================================
\echo ''
\echo '🌏 Step 0/7: 设置数据库时区...'
SET timezone TO 'Asia/Shanghai';
ALTER DATABASE cogniflow SET timezone TO 'Asia/Shanghai';
\echo '✅ 时区设置完成: Asia/Shanghai'

-- ============================================
-- Step 1: 创建数据库扩展
-- ============================================
\echo ''
\echo '📦 Step 1/7: 创建数据库扩展...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\echo '✅ 扩展创建完成'

-- ============================================
-- Step 2: 创建核心表结构
-- ============================================
\echo ''
\echo '🏗️  Step 2/7: 创建核心表结构...'

-- 1. 用户表 (users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- API 使用次数限制字段 (v1.1.0)
    account_type VARCHAR(20) DEFAULT 'registered' CHECK (account_type IN ('registered', 'quick_login')),
    api_usage_count INTEGER DEFAULT 0,
    max_api_usage INTEGER DEFAULT 100,
    usage_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- 个人 API Key 字段 (v1.2.0)
    personal_api_key VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_api_usage ON users(api_usage_count, max_api_usage);
CREATE INDEX IF NOT EXISTS idx_users_personal_api_key ON users(personal_api_key) WHERE personal_api_key IS NOT NULL;

-- 用户表字段注释
COMMENT ON COLUMN users.personal_api_key IS '用户个人的智谱 API Key，配置后将优先使用，不受次数限制';
COMMENT ON COLUMN users.api_usage_count IS 'API 使用次数计数器';
COMMENT ON COLUMN users.max_api_usage IS 'API 最大使用次数限制（注册用户40次，快速登录10次）';
COMMENT ON COLUMN users.account_type IS '账户类型：registered（注册用户）、quick_login（快速登录）';

-- 2. 用户配置表 (user_settings)
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'zh-CN',
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    settings_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 3. 条目表 (items) - 包含智能模板支持
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'event', 'note', 'data', 'url', 'collection')),
    title VARCHAR(500),
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'blocked', 'completed')),
    
    -- 日程相关字段
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    has_conflict BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    recurrence_end_date TIMESTAMP WITH TIME ZONE,
    master_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    is_master BOOLEAN DEFAULT false,
    
    -- URL 相关字段
    url TEXT,
    url_title VARCHAR(500),
    url_summary TEXT,
    url_thumbnail TEXT,
    url_fetched_at TIMESTAMP WITH TIME ZONE,
    
    -- 智能模板相关字段 (collection 类型)
    collection_type VARCHAR(50),
    sub_items JSONB DEFAULT '[]',
    
    -- 元数据
    tags TEXT[] DEFAULT '{}',
    entities JSONB DEFAULT '{}',
    
    -- 状态标识
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 条目表索引
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority);
CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(due_date);
CREATE INDEX IF NOT EXISTS idx_items_start_time ON items(start_time);
CREATE INDEX IF NOT EXISTS idx_items_end_time ON items(end_time);
CREATE INDEX IF NOT EXISTS idx_items_archived_at ON items(archived_at);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_tags ON items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_items_entities ON items USING GIN(entities);
CREATE INDEX IF NOT EXISTS idx_items_user_type ON items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_items_collection_type ON items(collection_type) WHERE collection_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_sub_items ON items USING GIN(sub_items);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_items_text_search ON items USING GIN(
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(raw_text, ''))
);

-- 添加智能模板字段注释
COMMENT ON COLUMN items.collection_type IS '集合类型，当 type=collection 时使用，例如：日报、会议、月报';
COMMENT ON COLUMN items.sub_items IS '子任务列表，JSON格式: [{"id": "uuid", "text": "任务内容", "status": "pending|done"}]';

-- 如果 items 表已存在但缺少智能模板字段，则添加它们
DO $$
BEGIN
    -- 添加 collection_type 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'collection_type') THEN
        ALTER TABLE items ADD COLUMN collection_type VARCHAR(50);
        RAISE NOTICE '已添加 collection_type 字段';
    END IF;
    
    -- 添加 sub_items 字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'sub_items') THEN
        ALTER TABLE items ADD COLUMN sub_items JSONB DEFAULT '[]';
        RAISE NOTICE '已添加 sub_items 字段';
    END IF;
END $$;

-- 4. 用户模板表 (user_templates) - 智能模板功能
CREATE TABLE IF NOT EXISTS user_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 模板基本信息
    trigger_word VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📝',
    
    -- 模板配置
    collection_type VARCHAR(50) NOT NULL,
    default_tags TEXT[] DEFAULT '{}',
    default_sub_items JSONB DEFAULT '[]',
    
    -- 显示设置
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- 统计信息
    usage_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, trigger_word)
);

CREATE INDEX IF NOT EXISTS idx_user_templates_user_id ON user_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_trigger_word ON user_templates(trigger_word);
CREATE INDEX IF NOT EXISTS idx_user_templates_is_active ON user_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_templates_usage_count ON user_templates(usage_count DESC);

COMMENT ON TABLE user_templates IS '用户自定义智能模板表，存储用户创建的各种模板配置';
COMMENT ON COLUMN user_templates.trigger_word IS '触发词，用户输入 /触发词 来激活模板';
COMMENT ON COLUMN user_templates.collection_type IS '集合类型标识，用于分类和查询';
COMMENT ON COLUMN user_templates.default_sub_items IS '默认子任务列表，JSON格式: [{"text": "任务1", "status": "pending"}]';

-- 5. 标签表 (tags)
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- 6. 用户活动日志表 (activity_logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 7. 提醒日志表 (reminder_logs)
CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_to VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, reminder_time)
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_item_id ON reminder_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_time ON reminder_logs(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_status ON reminder_logs(status);

-- 8. 用户统计表 (user_statistics)
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    total_items INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    notes_created INTEGER DEFAULT 0,
    urls_saved INTEGER DEFAULT 0,
    
    login_count INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    
    detailed_stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_date ON user_statistics(date DESC);

-- 9. 系统日志表 (system_logs)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- 10. 会话表 (sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 11. 备份记录表 (backups)
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('manual', 'auto', 'scheduled')),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    items_count INTEGER,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);

\echo '✅ 核心表创建完成'

-- ============================================
-- Step 3: 创建触发器和函数
-- ============================================
\echo ''
\echo '⚙️  Step 3/7: 创建触发器和函数...'

-- 自动更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有需要的表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_templates_updated_at ON user_templates;
CREATE TRIGGER update_user_templates_updated_at BEFORE UPDATE ON user_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- API 使用次数管理函数
-- 1. 设置初始 API 限制的触发器函数
CREATE OR REPLACE FUNCTION set_initial_api_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果是快捷登录用户（用户名以 guest_ 开头）
    IF NEW.username LIKE 'guest_%' THEN
        NEW.account_type := 'quick_login';
        NEW.max_api_usage := 10;
    ELSE
        NEW.account_type := 'registered';
        NEW.max_api_usage := 40;
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

-- 2. 检查并扣减 API 使用次数的函数
CREATE OR REPLACE FUNCTION check_and_increment_api_usage(
    p_user_id UUID,
    OUT success BOOLEAN,
    OUT remaining INTEGER,
    OUT message TEXT
) AS $$
DECLARE
    v_current_usage INTEGER;
    v_max_usage INTEGER;
    v_has_personal_key BOOLEAN;
BEGIN
    -- 获取用户的 API 使用情况和是否有个人 API Key
    SELECT 
        api_usage_count,
        max_api_usage,
        personal_api_key IS NOT NULL AND personal_api_key != ''
    INTO v_current_usage, v_max_usage, v_has_personal_key
    FROM users
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        success := FALSE;
        remaining := 0;
        message := '用户不存在';
        RETURN;
    END IF;
    
    -- 如果用户有个人 API Key，不限制使用次数
    IF v_has_personal_key THEN
        -- 仍然增加计数，用于统计
        UPDATE users 
        SET api_usage_count = api_usage_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
        
        success := TRUE;
        remaining := -1; -- -1 表示无限制
        message := '使用个人 API Key，无限制';
        RETURN;
    END IF;
    
    -- 检查是否达到限制
    IF v_current_usage >= v_max_usage THEN
        success := FALSE;
        remaining := 0;
        message := '已达到使用限制，请配置个人 API Key';
        RETURN;
    END IF;
    
    -- 增加使用次数
    UPDATE users 
    SET api_usage_count = api_usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- 返回结果
    success := TRUE;
    remaining := v_max_usage - v_current_usage - 1;
    message := '使用次数已扣减';
END;
$$ LANGUAGE plpgsql;

-- 3. 获取用户 API 使用情况的函数
CREATE OR REPLACE FUNCTION get_user_api_usage(p_user_id UUID)
RETURNS TABLE(
    current_usage INTEGER,
    max_usage INTEGER,
    remaining INTEGER,
    has_personal_key BOOLEAN,
    account_type VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.api_usage_count,
        u.max_api_usage,
        CASE 
            WHEN u.personal_api_key IS NOT NULL AND u.personal_api_key != '' THEN -1
            ELSE u.max_api_usage - u.api_usage_count
        END as remaining,
        (u.personal_api_key IS NOT NULL AND u.personal_api_key != '') as has_personal_key,
        u.account_type
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 4. 重置用户 API 使用次数的函数（管理员功能）
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

\echo '✅ 触发器和API管理函数创建完成'

-- ============================================
-- Step 4: 创建视图
-- ============================================
\echo ''
\echo '👁️  Step 4/7: 创建视图...'

-- 用户统计视图
CREATE OR REPLACE VIEW active_users_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_actions
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 用户概览视图
CREATE OR REPLACE VIEW user_overview AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.status,
    u.created_at,
    u.last_login_at,
    COUNT(DISTINCT i.id) FILTER (WHERE i.deleted_at IS NULL) as total_items,
    COUNT(DISTINCT i.id) FILTER (WHERE i.type = 'task' AND i.deleted_at IS NULL) as tasks_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.type = 'event' AND i.deleted_at IS NULL) as events_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'completed') as completed_count
FROM users u
LEFT JOIN items i ON u.id = i.user_id
GROUP BY u.id, u.username, u.email, u.role, u.status, u.created_at, u.last_login_at;

\echo '✅ 视图创建完成'

-- ============================================
-- Step 5: 插入初始数据
-- ============================================
\echo ''
\echo '💾 Step 5/7: 插入初始数据...'

-- 创建默认管理员账号
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@cogniflow.local',
    crypt('admin123', gen_salt('bf', 10)),
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- 为管理员用户创建默认设置
INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications)
SELECT id, 'system', 'zh-CN', true, true
FROM users
WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- 确保所有用户都有 user_settings（包括通过触发器未创建的）
DO $$
DECLARE
    settings_created INTEGER := 0;
BEGIN
    INSERT INTO user_settings (user_id, theme, language, notifications_enabled, email_notifications)
    SELECT 
        u.id,
        'system',
        'zh-CN',
        true,
        true
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
    WHERE us.id IS NULL;
    
    GET DIAGNOSTICS settings_created = ROW_COUNT;
    
    IF settings_created > 0 THEN
        RAISE NOTICE '✅ 为 % 个用户补充了 user_settings', settings_created;
    END IF;
END $$;

\echo '✅ 默认管理员账号和用户设置创建完成'

-- ============================================
-- Step 6: 为所有用户创建默认模板
-- ============================================
\echo ''
\echo '📋 Step 6/7: 创建默认智能模板...'

DO $$
DECLARE
    user_record RECORD;
    template_count INTEGER := 0;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        IF NOT EXISTS (SELECT 1 FROM user_templates WHERE user_id = user_record.id) THEN
            -- 日报模板
            INSERT INTO user_templates (
                user_id, trigger_word, template_name, icon, collection_type,
                default_tags, default_sub_items, is_active, sort_order
            ) VALUES (
                user_record.id, '日报', '每日工作日志', '📰', '日报',
                ARRAY['工作', '日报'],
                '[
                    {"id": "1", "text": "总结今日完成的工作", "status": "pending"},
                    {"id": "2", "text": "记录遇到的问题", "status": "pending"},
                    {"id": "3", "text": "规划明日工作计划", "status": "pending"}
                ]'::jsonb,
                true, 0
            );

            -- 会议模板
            INSERT INTO user_templates (
                user_id, trigger_word, template_name, icon, collection_type,
                default_tags, default_sub_items, is_active, sort_order
            ) VALUES (
                user_record.id, '会议', '会议纪要', '👥', '会议',
                ARRAY['会议', '工作'],
                '[
                    {"id": "1", "text": "记录会议议题", "status": "pending"},
                    {"id": "2", "text": "记录讨论要点", "status": "pending"},
                    {"id": "3", "text": "记录行动项", "status": "pending"}
                ]'::jsonb,
                true, 1
            );

            -- 月报模板
            INSERT INTO user_templates (
                user_id, trigger_word, template_name, icon, collection_type,
                default_tags, default_sub_items, is_active, sort_order
            ) VALUES (
                user_record.id, '月报', '月度总结', '📅', '月报',
                ARRAY['工作', '月报'],
                '[
                    {"id": "1", "text": "本月工作完成情况", "status": "pending"},
                    {"id": "2", "text": "重点成果与亮点", "status": "pending"},
                    {"id": "3", "text": "下月工作计划", "status": "pending"}
                ]'::jsonb,
                true, 2
            );
            
            template_count := template_count + 3;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ 为 % 个用户创建了默认模板', template_count / 3;
END $$;

\echo '✅ 默认模板创建完成'

-- ============================================
-- Step 7: 创建附件表和配置
-- ============================================
\echo ''
\echo '📎 Step 7/7: 创建附件支持...'

-- 附件表
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    
    -- 文件信息
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'document', 'video', 'audio', 'other')),
    
    -- 文件元数据
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    
    -- AI 分析结果
    ai_analysis JSONB DEFAULT '{}',
    ai_description TEXT,
    ai_tags TEXT[] DEFAULT '{}',
    ai_processed_at TIMESTAMP WITH TIME ZONE,
    
    -- 缩略图
    thumbnail_path TEXT,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    upload_status VARCHAR(20) DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 附件表索引
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_item_id ON attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_attachments_status ON attachments(status);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_ai_tags ON attachments USING GIN(ai_tags);

-- 附件配置表
CREATE TABLE IF NOT EXISTS attachment_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO attachment_configs (config_key, config_value, description) VALUES
    ('max_file_size', '10485760', '最大文件大小（字节）- 默认10MB'),
    ('allowed_image_types', 'image/png,image/jpeg,image/jpg,image/gif,image/webp', '允许的图片类型'),
    ('allowed_document_types', 'application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword', '允许的文档类型'),
    ('storage_path', './uploads', '附件存储路径'),
    ('thumbnail_max_width', '300', '缩略图最大宽度'),
    ('thumbnail_max_height', '300', '缩略图最大高度')
ON CONFLICT (config_key) DO NOTHING;

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_attachment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_attachment_updated_at();

-- 附件统计视图
CREATE OR REPLACE VIEW user_attachment_stats AS
SELECT 
    user_id,
    COUNT(*) as total_attachments,
    COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
    COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_count,
    SUM(file_size) as total_storage_used,
    MAX(created_at) as last_upload_at
FROM attachments
WHERE upload_status = 'completed' AND status != 'failed'
GROUP BY user_id;

\echo '✅ 附件支持创建完成'

-- ============================================
-- Step 8: 创建留言板功能
-- ============================================
\echo ''
\echo '💬 Step 8/8: 创建留言板功能...'

-- 留言表 (messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 留言表索引
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_username ON messages(username);

-- 留言反应表 (message_reactions) - 记录用户的点赞/点踩
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction_type)
);

-- 留言反应表索引
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_type ON message_reactions(reaction_type);

-- 留言表更新时间触发器
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 留言反应触发器：自动更新留言的点赞/点踩数量
CREATE OR REPLACE FUNCTION update_message_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.reaction_type = 'like' THEN
            UPDATE messages SET like_count = like_count + 1 WHERE id = NEW.message_id;
        ELSIF NEW.reaction_type = 'dislike' THEN
            UPDATE messages SET dislike_count = dislike_count + 1 WHERE id = NEW.message_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.reaction_type = 'like' THEN
            UPDATE messages SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.message_id;
        ELSIF OLD.reaction_type = 'dislike' THEN
            UPDATE messages SET dislike_count = GREATEST(dislike_count - 1, 0) WHERE id = OLD.message_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_message_reaction_count ON message_reactions;
CREATE TRIGGER trigger_update_message_reaction_count
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_message_reaction_count();

\echo '✅ 留言板功能创建完成'

-- ============================================
-- 完成部署
-- ============================================
\echo ''
\echo '========================================='
\echo '✨ CogniFlow 数据库部署成功！'
\echo '========================================='
\echo ''
\echo '📊 数据库统计信息:'
\echo '---'

-- 显示表统计
SELECT 
    'users' as 表名, 
    COUNT(*) as 记录数
FROM users
UNION ALL
SELECT 'user_templates', COUNT(*) FROM user_templates
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL
SELECT 'attachment_configs', COUNT(*) FROM attachment_configs
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'message_reactions', COUNT(*) FROM message_reactions;

\echo ''
\echo '👤 默认管理员账号:'
\echo '   用户名: admin'
\echo '   密码: admin123'
\echo '   邮箱: admin@cogniflow.local'
\echo ''
\echo '📋 默认智能模板:'
\echo '   📰 /日报 - 每日工作日志'
\echo '   👥 /会议 - 会议纪要'
\echo '   📅 /月报 - 月度总结'
\echo ''
\echo '🚀 部署完成！您现在可以启动应用了。'
\echo '========================================='
