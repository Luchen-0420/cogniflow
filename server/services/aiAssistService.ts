/**
 * 服务器端 AI 辅助服务
 * 用于后台任务处理
 */

import type { SubItem } from '../../src/types/types';

// 默认密钥（用于本地调试，正式环境仍建议通过环境变量覆盖）
const DEFAULT_ZHIPU_API_KEY = 'dc7c6ea2a63245df99bbf1af9509fd3f.gKe0Af8D4Lu2hs2h';

// 服务器端环境变量（优先使用统一的 ZHIPUAI_* 命名，向下兼容旧变量）
const ZHIPU_API_URL =
  process.env.ZHIPUAI_API_URL ||
  process.env.ZHIPU_API_URL ||
  process.env.VITE_ZHIPUAI_API_URL ||
  process.env.VITE_ZHIPU_API_URL ||
  process.env.GLM_API_URL ||
  process.env.VITE_GLM_API_URL ||
  'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const ZHIPU_API_KEY =
  process.env.ZHIPUAI_API_KEY ||
  process.env.ZHIPU_API_KEY ||
  process.env.VITE_ZHIPUAI_API_KEY ||
  process.env.VITE_ZHIPU_API_KEY ||
  process.env.GLM_API_KEY ||
  process.env.VITE_GLM_API_KEY ||
  DEFAULT_ZHIPU_API_KEY;

const ZHIPU_SEARCH_ENGINE =
  process.env.ZHIPUAI_SEARCH_ENGINE ||
  process.env.ZHIPU_SEARCH_ENGINE ||
  process.env.VITE_ZHIPUAI_SEARCH_ENGINE ||
  process.env.VITE_ZHIPU_SEARCH_ENGINE ||
  process.env.GLM_SEARCH_ENGINE ||
  process.env.VITE_GLM_SEARCH_ENGINE ||
  'search_std';

const ZHIPU_MODEL =
  process.env.ZHIPUAI_MODEL ||
  process.env.ZHIPU_MODEL ||
  process.env.VITE_ZHIPUAI_MODEL ||
  process.env.VITE_ZHIPU_MODEL ||
  process.env.VITE_GLM_MODEL ||
  'glm-4-flash';

// 服务器端搜索函数（直接调用，不使用前端工具）
async function searchWebServer(
  query: string,
  options?: {
    search_engine?: string;
    count?: number;
    content_size?: 'medium' | 'high';
    search_recency_filter?: string;
  }
): Promise<{ search_result: SearchResult[] }> {
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPUAI API Key 未配置');
  }

  const requestBody = {
    search_query: query.substring(0, 70),
    search_engine: options?.search_engine || ZHIPU_SEARCH_ENGINE,
    search_intent: false,
    count: options?.count || 10,
    content_size: options?.content_size || 'medium',
    search_recency_filter: options?.search_recency_filter || 'noLimit',
    request_id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'cogniflow-server',
  };

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/web_search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: {
        code: String(response.status),
        message: `搜索请求失败: ${response.statusText}`,
      },
    }));
    throw new Error(errorData.error?.message || `搜索失败: ${response.statusText}`);
  }

  return await response.json();
}

interface SearchResult {
  title: string;
  content: string;
  link: string;
  media: string;
  icon?: string;
  refer?: string;
  publish_date?: string;
}

function extractSearchLinks(results: SearchResult[]): Array<{ title: string; url: string; media: string }> {
  return results.map(result => ({
    title: result.title,
    url: result.link,
    media: result.media,
  }));
}

function generateFallbackAssistInfo(
  taskText: string,
  searchResults: SearchResult[]
): {
  knowledgePoints: string[];
  referenceInfo: string;
  sourceLinks: Array<{ title: string; url: string; media: string }>;
} {
  const topic = extractSearchKeywords(taskText) || (taskText || '当前主题');
  const normalizedTopic = topic.trim().replace(/\s+/g, ' ');

  const basePoints = [
    `明确目的：梳理「${normalizedTopic}」要解决的核心问题与成功指标（功能范围、适用场景、交付形式）。`,
    `框架拆解：从输入/推理/执行/反馈四个层面搭建「${normalizedTopic}」的能力模块，列出关键组件与依赖。`,
    `数据与工具：准备支撑「${normalizedTopic}」的知识库、检索或行动工具，并定义权限与调用规范。`,
    `评估机制：为${normalizedTopic}设置质量评估维度（准确性、实时性、可解释性、成本），建立可迭代的验证流程。`,
  ];

  const searchHints =
    searchResults.length > 0
      ? searchResults.slice(0, 3).map((r, index) => `${index + 1}. ${r.title} - ${r.content}`).join('\n')
      : '';

  return {
    knowledgePoints: basePoints,
    referenceInfo:
      searchResults.length > 0
        ? `根据在线检索，${normalizedTopic} 可关注以下信息：\n${searchHints}`
        : `可按「场景需求 → 能力模块 → 数据/工具 → 评估迭代」四步推进 ${normalizedTopic}，确保概念、流程和验收标准一致。`,
    sourceLinks: extractSearchLinks(searchResults),
  };
}

export interface AIAssistResult {
  knowledgePoints: string[];
  referenceInfo: string;
  sourceLinks: Array<{ title: string; url: string; media: string }>;
  subItems: SubItem[];
}

/**
 * 从任务文本中提取搜索关键词
 */
function extractSearchKeywords(taskText: string): string {
  let keywords = taskText
    .replace(/^(今天|明天|后天|本周|下周|这个|那个)\s*/i, '')
    .replace(/^(要|需要|准备|打算|计划)\s*/i, '')
    .replace(/\s*(一篇|一个|一份|一次|一下)\s*/gi, ' ')
    .trim();

  const actionWords = ['写', '调研', '研究', '了解', '学习', '分析', '总结', '整理', '准备', '制定', '规划', '设计', '开发', '实现', '评估', '讨论', '探讨'];
  for (const word of actionWords) {
    if (keywords.toLowerCase().startsWith(word)) {
      keywords = keywords.substring(word.length).trim();
      break;
    }
  }

  if (keywords.length < 3) {
    keywords = taskText;
  }

  return keywords.substring(0, 50);
}

/**
 * 使用AI生成辅助信息（服务器端版本）
 */
async function generateAssistInfo(
  taskText: string,
  searchResults: SearchResult[]
): Promise<{
  knowledgePoints: string[];
  referenceInfo: string;
  sourceLinks: Array<{ title: string; url: string; media: string }>;
}> {
  if (!ZHIPU_API_KEY) {
    console.warn('ZHIPUAI API Key 未配置，使用离线辅助策略');
    return generateFallbackAssistInfo(taskText, searchResults);
  }

  const searchContext = searchResults.length > 0
    ? `\n\n搜索到的相关信息：\n${searchResults.map((r, i) => `${i + 1}. ${r.title}\n   ${r.content}\n   来源: ${r.media} - ${r.link}`).join('\n\n')}`
    : '';

  const systemPrompt = `你是一个智能任务辅助助手。用户输入了一个任务，你需要基于以下信息提供帮助：

1. **相关知识点**：列出3-5个与任务相关的关键知识点或注意事项
2. **参考信息摘要**：基于搜索结果（如果有）和你的知识，生成一段简洁的参考信息摘要（100-200字）

要求：
- 知识点要具体、实用，不要泛泛而谈
- 参考信息要准确、有价值
- 如果提供了搜索结果，优先基于搜索结果总结
- 如果没有搜索结果，使用你的知识库提供信息
- 输出格式为JSON：
{
  "knowledgePoints": ["知识点1", "知识点2", "知识点3"],
  "referenceInfo": "参考信息摘要..."
}`;

  const userContent = `用户任务：${taskText}${searchContext}

请提供相关知识点和参考信息摘要。`;

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: ZHIPU_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    const result = JSON.parse(jsonStr);
    const sourceLinks = extractSearchLinks(searchResults);

    return {
      knowledgePoints: Array.isArray(result.knowledgePoints) ? result.knowledgePoints : [],
      referenceInfo: result.referenceInfo || '',
      sourceLinks,
    };
  } catch (error: any) {
    console.error('生成辅助信息失败:', error);
    return generateFallbackAssistInfo(taskText, searchResults);
  }
}

/**
 * 生成子卡片列表
 */
function generateSubItems(
  assistInfo: {
    knowledgePoints: string[];
    referenceInfo: string;
    sourceLinks: Array<{ title: string; url: string; media: string }>;
  }
): SubItem[] {
  const subItems: SubItem[] = [];
  const baseTimestamp = Date.now();

  assistInfo.knowledgePoints.forEach((point, index) => {
    subItems.push({
      id: `knowledge-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      text: `💡 ${point}`,
      status: 'pending',
    });
  });

  if (assistInfo.referenceInfo) {
    subItems.push({
      id: `reference-${baseTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
      text: `📚 参考信息：${assistInfo.referenceInfo.substring(0, 100)}${assistInfo.referenceInfo.length > 100 ? '...' : ''}`,
      status: 'pending',
    });
  }

  assistInfo.sourceLinks.slice(0, 3).forEach((link, index) => {
    subItems.push({
      id: `link-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      text: `🔗 ${link.title} (${link.media}) - ${link.url}`,
      status: 'pending',
    });
  });

  return subItems;
}

/**
 * 执行 AI 主动辅助（服务器端版本）
 */
export async function performAIAssistServer(
  taskText: string
): Promise<AIAssistResult | null> {
  try {
    // 提取搜索关键词
    const searchKeywords = extractSearchKeywords(taskText);
    console.log(`🔍 搜索关键词: ${searchKeywords}`);

    // 执行网络搜索
    let searchResults: SearchResult[] = [];
    try {
      const searchResponse = await searchWebServer(searchKeywords, {
        search_engine: ZHIPU_SEARCH_ENGINE as any,
        count: 5,
        content_size: 'medium',
        search_recency_filter: 'noLimit',
      });
      searchResults = searchResponse.search_result || [];
      console.log(`✅ 找到 ${searchResults.length} 条相关信息`);
    } catch (error: any) {
      console.warn('搜索失败，继续使用AI知识:', error);
    }

    // 使用AI总结和生成辅助信息
    const assistInfo = await generateAssistInfo(taskText, searchResults);

    // 生成子卡片
    const subItems = generateSubItems(assistInfo);

    return {
      knowledgePoints: assistInfo.knowledgePoints,
      referenceInfo: assistInfo.referenceInfo,
      sourceLinks: assistInfo.sourceLinks,
      subItems,
    };
  } catch (error: any) {
    console.error('AI辅助执行失败:', error);
    return null;
  }
}

