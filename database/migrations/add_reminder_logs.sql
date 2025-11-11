-- 添加日程提醒记录表
-- 用于记录已发送的提醒，避免重复发送

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

-- 索引
CREATE INDEX idx_reminder_logs_item_id ON reminder_logs(item_id);
CREATE INDEX idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX idx_reminder_logs_reminder_time ON reminder_logs(reminder_time);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX idx_reminder_logs_status ON reminder_logs(status);

-- 注释
COMMENT ON TABLE reminder_logs IS '日程提醒发送记录表';
COMMENT ON COLUMN reminder_logs.item_id IS '关联的日程项目ID';
COMMENT ON COLUMN reminder_logs.user_id IS '用户ID';
COMMENT ON COLUMN reminder_logs.reminder_time IS '提醒时间（日程开始时间-5分钟）';
COMMENT ON COLUMN reminder_logs.sent_at IS '实际发送时间';
COMMENT ON COLUMN reminder_logs.email_to IS '收件人邮箱';
COMMENT ON COLUMN reminder_logs.status IS '发送状态：sent（已发送）、failed（失败）、pending（待发送）';
COMMENT ON COLUMN reminder_logs.error_message IS '失败时的错误信息';
