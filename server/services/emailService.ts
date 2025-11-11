import nodemailer from 'nodemailer';

// QQ邮箱配置
// 注意：需要在 QQ 邮箱设置中开启 SMTP 服务并获取授权码
const EMAIL_CONFIG = {
  host: 'smtp.qq.com',
  port: 465,
  secure: true, // 使用 SSL
  auth: {
    user: process.env.EMAIL_USER || '646184101@qq.com',
    pass: process.env.EMAIL_PASSWORD || '', // QQ邮箱授权码，不是登录密码
  },
};

// 创建邮件传输器
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// 验证邮件配置
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('✅ 邮件服务配置成功');
    return true;
  } catch (error) {
    console.error('❌ 邮件服务配置失败:', error);
    return false;
  }
}

// 发送日程提醒邮件
export interface ReminderEmailData {
  to: string; // 收件人邮箱
  title: string; // 日程标题
  startTime: Date; // 开始时间
  endTime?: Date; // 结束时间
  description?: string; // 描述
  location?: string; // 地点
}

export async function sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
  const { to, title, startTime, endTime, description, location } = data;

  // 格式化时间
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

  const startTimeStr = formatDate(startTime);
  const endTimeStr = endTime ? formatDate(endTime) : '';
  const duration = endTime 
    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) 
    : 0;

  // 构建邮件内容
  const subject = `⏰ 日程提醒：${title}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e1e8ed;
          border-top: none;
          border-radius: 0 0 10px 10px;
        }
        .info-box {
          background: #f7fafc;
          border-left: 4px solid #667eea;
          padding: 15px 20px;
          margin: 15px 0;
          border-radius: 4px;
        }
        .info-item {
          margin: 10px 0;
          display: flex;
          align-items: flex-start;
        }
        .info-label {
          font-weight: bold;
          color: #667eea;
          min-width: 80px;
          margin-right: 10px;
        }
        .info-value {
          flex: 1;
          color: #2d3748;
        }
        .time-highlight {
          font-size: 18px;
          font-weight: bold;
          color: #e53e3e;
          margin: 20px 0;
          text-align: center;
          padding: 15px;
          background: #fff5f5;
          border-radius: 8px;
          border: 2px solid #feb2b2;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e1e8ed;
          color: #718096;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⏰ 日程提醒</h1>
      </div>
      <div class="content">
        <div class="time-highlight">
          ⚠️ 您的日程即将在 5 分钟后开始！
        </div>
        
        <div class="info-box">
          <div class="info-item">
            <span class="info-label">📋 日程标题：</span>
            <span class="info-value">${title}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">⏰ 开始时间：</span>
            <span class="info-value">${startTimeStr}</span>
          </div>
          
          ${endTimeStr ? `
          <div class="info-item">
            <span class="info-label">⏱️ 结束时间：</span>
            <span class="info-value">${endTimeStr}</span>
          </div>
          ` : ''}
          
          ${duration > 0 ? `
          <div class="info-item">
            <span class="info-label">⌛ 持续时间：</span>
            <span class="info-value">${duration} 分钟</span>
          </div>
          ` : ''}
          
          ${description ? `
          <div class="info-item">
            <span class="info-label">📝 详细说明：</span>
            <span class="info-value">${description}</span>
          </div>
          ` : ''}
          
          ${location ? `
          <div class="info-item">
            <span class="info-label">📍 地点：</span>
            <span class="info-value">${location}</span>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center;">
          <p style="color: #718096; margin-top: 20px;">
            请提前做好准备，准时参加您的日程安排。
          </p>
        </div>
        
        <div class="footer">
          <p>此邮件由 CogniFlow 智能卡片系统自动发送</p>
          <p style="font-size: 12px; color: #a0aec0;">
            如需管理您的日程，请登录 CogniFlow 系统
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
⏰ 日程提醒

⚠️ 您的日程即将在 5 分钟后开始！

📋 日程标题：${title}
⏰ 开始时间：${startTimeStr}
${endTimeStr ? `⏱️ 结束时间：${endTimeStr}` : ''}
${duration > 0 ? `⌛ 持续时间：${duration} 分钟` : ''}
${description ? `📝 详细说明：${description}` : ''}
${location ? `📍 地点：${location}` : ''}

请提前做好准备，准时参加您的日程安排。

---
此邮件由 CogniFlow 智能卡片系统自动发送
  `;

  try {
    const info = await transporter.sendMail({
      from: `"CogniFlow 提醒服务" <${EMAIL_CONFIG.auth.user}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('✅ 提醒邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ 提醒邮件发送失败:', error);
    return false;
  }
}

// 测试邮件发送
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `"CogniFlow 提醒服务" <${EMAIL_CONFIG.auth.user}>`,
      to,
      subject: '🎉 CogniFlow 提醒服务测试邮件',
      text: '这是一封测试邮件，用于验证邮件服务配置是否正确。',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🎉 测试邮件</h2>
          <p>您好！</p>
          <p>这是一封测试邮件，用于验证 CogniFlow 提醒服务的邮件配置是否正确。</p>
          <p>如果您收到这封邮件，说明邮件服务已成功配置。</p>
          <hr>
          <p style="color: #666; font-size: 12px;">此邮件由 CogniFlow 智能卡片系统自动发送</p>
        </div>
      `,
    });

    console.log('✅ 测试邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ 测试邮件发送失败:', error);
    return false;
  }
}
