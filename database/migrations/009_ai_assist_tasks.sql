-- ============================================
-- AI 主动辅助任务表
-- ============================================

-- 创建 AI 辅助任务表
CREATE TABLE IF NOT EXISTS ai_assist_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 任务状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- 任务信息
    task_text TEXT NOT NULL,
    search_keywords TEXT,
    
    -- 执行结果
    assist_result JSONB,
    error_message TEXT,
    
    -- 执行次数（防止重复执行）
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_assist_tasks_item_id ON ai_assist_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_assist_tasks_user_id ON ai_assist_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_assist_tasks_status ON ai_assist_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_assist_tasks_created_at ON ai_assist_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_assist_tasks_pending ON ai_assist_tasks(status, created_at) WHERE status = 'pending';

-- 创建唯一约束，防止同一卡片重复创建任务
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_assist_tasks_item_unique ON ai_assist_tasks(item_id) WHERE status IN ('pending', 'processing');

-- 添加注释
COMMENT ON TABLE ai_assist_tasks IS 'AI 主动辅助任务表，记录需要后台执行的辅助任务';
COMMENT ON COLUMN ai_assist_tasks.status IS '任务状态：pending-待处理, processing-处理中, completed-已完成, failed-失败';
COMMENT ON COLUMN ai_assist_tasks.assist_result IS '辅助结果，包含知识点、参考信息、来源链接等';
COMMENT ON COLUMN ai_assist_tasks.attempt_count IS '执行次数，用于防止重复执行和重试';

-- 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_ai_assist_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_assist_tasks_updated_at
    BEFORE UPDATE ON ai_assist_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_assist_tasks_updated_at();

