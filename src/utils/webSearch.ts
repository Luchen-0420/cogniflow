/**
 * GLM 网络搜索 API 服务
 * 用于调用智谱AI的网络搜索功能
 */

export interface WebSearchRequest {
  search_query: string;
  search_engine?: 'search_std' | 'search_pro' | 'search_pro_sogou' | 'search_pro_quark';
  search_intent?: boolean;
  count?: number;
  search_domain_filter?: string;
  search_recency_filter?: 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear' | 'noLimit';
  content_size?: 'medium' | 'high';
  request_id?: string;
  user_id?: string;
}

export interface SearchIntent {
  query: string;
  intent: 'SEARCH_ALL' | 'SEARCH_NONE' | 'SEARCH_ALWAYS';
  keywords: string;
}

export interface SearchResult {
  title: string;
  content: string;
  link: string;
  media: string;
  icon?: string;
  refer?: string;
  publish_date?: string;
}

export interface WebSearchResponse {
  id: string;
  created: number;
  request_id: string;
  search_intent: SearchIntent[];
  search_result: SearchResult[];
}

export interface WebSearchError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * 调用 GLM 网络搜索 API
 */
const DEFAULT_ZHIPU_API_KEY = 'dc7c6ea2a63245df99bbf1af9509fd3f.gKe0Af8D4Lu2hs2h';

export async function searchWeb(
  query: string,
  options?: {
    search_engine?: WebSearchRequest['search_engine'];
    count?: number;
    content_size?: 'medium' | 'high';
    search_recency_filter?: WebSearchRequest['search_recency_filter'];
  }
): Promise<WebSearchResponse> {
  const API_KEY =
    import.meta.env.VITE_ZHIPUAI_API_KEY ||
    import.meta.env.VITE_GLM_API_KEY ||
    DEFAULT_ZHIPU_API_KEY;
  const SEARCH_ENGINE = import.meta.env.VITE_ZHIPUAI_SEARCH_ENGINE || import.meta.env.VITE_GLM_SEARCH_ENGINE || 'search_std';

  if (!API_KEY) {
    throw new Error('ZHIPUAI API Key 未配置，请在 .env 文件中设置 VITE_ZHIPUAI_API_KEY（兼容 VITE_GLM_API_KEY）');
  }

  const requestBody: WebSearchRequest = {
    search_query: query.substring(0, 70), // 限制最大长度
    search_engine: options?.search_engine || (SEARCH_ENGINE as WebSearchRequest['search_engine']) || 'search_std',
    search_intent: false, // 默认不执行搜索意图识别，直接搜索
    count: options?.count || 10,
    content_size: options?.content_size || 'medium',
    search_recency_filter: options?.search_recency_filter || 'noLimit',
    request_id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'cogniflow-user',
  };

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/web_search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData: WebSearchError = await response.json().catch(() => ({
        error: {
          code: String(response.status),
          message: `搜索请求失败: ${response.statusText}`,
        },
      }));
      throw new Error(errorData.error?.message || `搜索失败: ${response.statusText}`);
    }

    const data: WebSearchResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('网络搜索失败:', error);
    throw new Error(`网络搜索失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 格式化搜索结果，生成摘要文本
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return '未找到相关信息。';
  }

  let formatted = `找到 ${results.length} 条相关信息：\n\n`;

  results.forEach((result, index) => {
    formatted += `${index + 1}. **${result.title}**\n`;
    formatted += `   ${result.content}\n`;
    formatted += `   来源: ${result.media} | [链接](${result.link})\n\n`;
  });

  return formatted;
}

/**
 * 提取搜索结果中的链接列表
 */
export function extractSearchLinks(results: SearchResult[]): Array<{ title: string; url: string; media: string }> {
  return results.map(result => ({
    title: result.title,
    url: result.link,
    media: result.media,
  }));
}

