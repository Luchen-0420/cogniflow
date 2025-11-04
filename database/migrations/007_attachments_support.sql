-- ============================================
-- 附件功能迁移脚本
-- 创建日期: 2025-11-04
-- 描述: 添加附件表支持图片、文档等多种格式的上传
-- ============================================

-- 设置时区
SET timezone TO 'Asia/Shanghai';

-- ============================================
-- 1. 创建附件表 (attachments)
-- ============================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    
    -- 文件信息
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL, -- 文件大小（字节）
    mime_type VARCHAR(100) NOT NULL, -- MIME类型
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'document', 'video', 'audio', 'other')),
    
    -- 文件元数据
    width INTEGER, -- 图片宽度
    height INTEGER, -- 图片高度
    duration INTEGER, -- 视频/音频时长（秒）
    
    -- AI 分析结果
    ai_analysis JSONB DEFAULT '{}', -- AI 对附件的分析结果
    ai_description TEXT, -- AI 生成的描述
    ai_tags TEXT[] DEFAULT '{}', -- AI 提取的标签
    ai_processed_at TIMESTAMP WITH TIME ZONE, -- AI 处理时间
    
    -- 缩略图
    thumbnail_path TEXT, -- 缩略图路径
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    upload_status VARCHAR(20) DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 附件表索引
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_item_id ON attachments(item_id);
CREATE INDEX idx_attachments_file_type ON attachments(file_type);
CREATE INDEX idx_attachments_mime_type ON attachments(mime_type);
CREATE INDEX idx_attachments_status ON attachments(status);
CREATE INDEX idx_attachments_created_at ON attachments(created_at DESC);
CREATE INDEX idx_attachments_ai_tags ON attachments USING GIN(ai_tags);

-- ============================================
-- 2. 创建附件存储配置表 (attachment_configs)
-- ============================================
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

-- ============================================
-- 3. 添加触发器：自动更新 updated_at
-- ============================================
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

-- ============================================
-- 4. 添加触发器：清理孤立附件
-- ============================================
-- 当 item 被删除时，同时删除关联的附件文件记录
CREATE OR REPLACE FUNCTION cleanup_orphan_attachments()
RETURNS TRIGGER AS $$
BEGIN
    -- 标记附件为待删除状态（实际文件清理由后台任务处理）
    UPDATE attachments 
    SET status = 'failed', 
        updated_at = CURRENT_TIMESTAMP
    WHERE item_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 注意：这个触发器是可选的，如果想保留历史附件可以不创建
-- CREATE TRIGGER trigger_cleanup_attachments
--     BEFORE DELETE ON items
--     FOR EACH ROW
--     EXECUTE FUNCTION cleanup_orphan_attachments();

-- ============================================
-- 5. 创建视图：用户附件统计
-- ============================================
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

-- ============================================
-- 6. 添加注释
-- ============================================
COMMENT ON TABLE attachments IS '附件表：存储用户上传的图片、文档等文件信息';
COMMENT ON COLUMN attachments.ai_analysis IS 'AI分析结果，包含视觉理解、文本提取等信息';
COMMENT ON COLUMN attachments.file_type IS '文件类型：image-图片, document-文档, video-视频, audio-音频, other-其他';
COMMENT ON COLUMN attachments.status IS '处理状态：pending-待处理, processing-处理中, completed-已完成, failed-失败';

COMMENT ON TABLE attachment_configs IS '附件配置表：存储文件上传的各项配置';
COMMENT ON VIEW user_attachment_stats IS '用户附件统计视图：统计每个用户的附件使用情况';

-- ============================================
-- 7. 授权（如果需要）
-- ============================================
-- GRANT ALL PRIVILEGES ON TABLE attachments TO cogniflow_user;
-- GRANT ALL PRIVILEGES ON TABLE attachment_configs TO cogniflow_user;
-- GRANT SELECT ON user_attachment_stats TO cogniflow_user;

-- ============================================
-- 迁移完成
-- ============================================
