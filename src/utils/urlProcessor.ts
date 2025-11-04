import type { URLFetchResult } from '@/types/types';
import { sendChatStream } from './ai';

// URL正则表达式
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

/**
 * 检测文本中是否包含URL
 */
export function detectURL(text: string): string | null {
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
}

/**
 * 检测文本是否主要是URL(URL占比超过50%)
 */
export function isMainlyURL(text: string): boolean {
  const url = detectURL(text);
  if (!url) return false;
  
  // 如果文本主要是URL(去除空格后URL占比超过50%)
  const trimmedText = text.trim();
  return url.length / trimmedText.length > 0.5;
}

/**
 * 抓取URL内容 (简化版本，不依赖Supabase Edge Function)
 * 由于浏览器CORS限制，只能提取URL基本信息
 */
export async function fetchURLContent(url: string): Promise<URLFetchResult> {
  console.log('🌐 处理URL:', url);
  
  try {
    // 从URL提取基本信息
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // 生成标题（从URL路径提取）
    let title = hostname;
    if (pathname && pathname !== '/') {
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        title = pathParts[pathParts.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.[^.]+$/, '') // 移除文件扩展名
          .replace(/\b\w/g, l => l.toUpperCase()); // 首字母大写
      }
    }
    
    // 如果标题太短或不友好，使用完整域名
    if (title.length < 3) {
      title = hostname;
    }
    
    const result: URLFetchResult = {
      url: url,
      title: title || '网页链接',
      summary: `来自 ${hostname} 的链接`,
      thumbnail: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
      content: ''
    };
    
    console.log('✅ URL信息提取成功:', result.title);
    
    return result;
  } catch (error) {
    console.error('URL处理失败:', error);
    
    // 返回最基本的信息
    return {
      url: url,
      title: '网页链接',
      summary: '无法提取链接信息',
      thumbnail: undefined,
      content: ''
    };
  }
}

/**
 * 使用 AI 生成 URL 内容梗概
 * @param url 链接地址
 * @param urlTitle 链接标题
 * @param userContext 用户提供的上下文（可选）
 */
export async function generateURLSummary(
  url: string,
  urlTitle: string,
  userContext?: string
): Promise<string> {
  return new Promise((resolve) => {
    let summary = '';
    
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // 从URL结构推断可能的内容类型
    let contentTypeHint = '';
    if (hostname.includes('github.com')) {
      contentTypeHint = '这可能是一个GitHub仓库或代码项目';
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      contentTypeHint = '这可能是一个YouTube视频';
    } else if (hostname.includes('medium.com') || hostname.includes('blog')) {
      contentTypeHint = '这可能是一篇博客文章';
    } else if (pathname.match(/\.(pdf|doc|docx)$/)) {
      contentTypeHint = '这可能是一个文档文件';
    } else if (pathname.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      contentTypeHint = '这可能是一张图片';
    }

    const systemPrompt = `你是一个专业的内容梗概生成助手。根据提供的URL信息，生成一个简洁、有用的内容梗概。

要求：
1. 梗概长度：30-80字
2. 必须包含核心价值点
3. 语言简洁专业，直接描述内容
4. 如果能从URL推断出内容类型，要体现在梗概中
5. 不要使用"这是一个链接"等废话

示例：
- GitHub仓库 → "开源项目：基于React的UI组件库，提供50+高质量组件"
- 技术博客 → "深度解析：微服务架构设计模式与最佳实践"
- 产品页面 → "在线设计工具：支持实时协作的UI/UX设计平台"`;

    const userPrompt = `URL: ${url}
标题: ${urlTitle}
域名: ${hostname}
${contentTypeHint ? `内容类型提示: ${contentTypeHint}` : ''}
${userContext ? `用户备注: ${userContext}` : ''}

请生成一个简洁有用的内容梗概（30-80字）：`;

    sendChatStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      onUpdate: (content) => {
        summary = content;
      },
      onComplete: () => {
        // 清理可能的引号和多余空白
        const cleanedSummary = summary.trim().replace(/^["']|["']$/g, '');
        resolve(cleanedSummary || `来自 ${hostname} 的内容`);
      },
      onError: (error) => {
        console.error('生成URL梗概失败:', error);
        // 失败时返回基本描述
        resolve(`${contentTypeHint || `来自 ${hostname} 的链接`}`);
      },
      temperature: 0.7
    });
  });
}
