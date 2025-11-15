/**
 * AI 主动辅助服务
 * 检测用户任务中的关键词，自动提供相关知识点和参考信息
 */

import { searchWeb, formatSearchResults, extractSearchLinks, type SearchResult } from './webSearch';
import { sendChatStream, type ChatMessage } from './ai';
import type { SubItem } from '@/types/types';

// 触发辅助功能的关键词
const ASSIST_KEYWORDS = [
  '写一篇',
  '写',
  '调研',
  '研究',
  '了解',
  '学习',
  '分析',
  '总结',
  '整理',
  '准备',
  '制定',
  '规划',
  '设计',
  '开发',
  '实现',
  '评估',
  '评估',
  '讨论',
  '探讨',
];

/**
 * 检测文本中是否包含需要辅助的关键词
 */
export function shouldTriggerAssist(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ASSIST_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * 从任务文本中提取搜索关键词
 */
export function extractSearchKeywords(taskText: string): string {
  // 移除常见的前缀和动作词
  let keywords = taskText
    .replace(/^(今天|明天|后天|本周|下周|这个|那个)\s*/i, '')
    .replace(/^(要|需要|准备|打算|计划)\s*/i, '')
    .replace(/\s*(一篇|一个|一份|一次|一下)\s*/gi, ' ')
    .trim();

  // 提取核心主题词（去除动作词）
  const actionWords = ['写', '调研', '研究', '了解', '学习', '分析', '总结', '整理', '准备', '制定', '规划', '设计', '开发', '实现', '评估', '讨论', '探讨'];
  for (const word of actionWords) {
    if (keywords.toLowerCase().startsWith(word)) {
      keywords = keywords.substring(word.length).trim();
      break;
    }
  }

  // 如果关键词太短，使用原文本
  if (keywords.length < 3) {
    keywords = taskText;
  }

  return keywords.substring(0, 50); // 限制长度
}

/**
 * AI 辅助结果
 */
export interface AIAssistResult {
  knowledgePoints: string[]; // 相关知识点
  referenceInfo: string; // 参考信息摘要
  sourceLinks: Array<{ title: string; url: string; media: string }>; // 信息来源链接
  subItems: SubItem[]; // 生成的子卡片列表
}

/**
 * 执行 AI 主动辅助
 * 在后台静默执行，不打扰用户
 */
export async function performAIAssist(
  taskText: string,
  options?: {
    onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void;
  }
): Promise<AIAssistResult | null> {
  try {
    // 1. 提取搜索关键词
    const searchKeywords = extractSearchKeywords(taskText);
    options?.onProgress?.(`🔍 正在搜索相关信息: ${searchKeywords}`, 'info');

    // 2. 执行网络搜索
    let searchResults: SearchResult[] = [];
    try {
      const searchResponse = await searchWeb(searchKeywords, {
        count: 5, // 获取5条结果
        content_size: 'medium',
        search_recency_filter: 'noLimit',
      });
      searchResults = searchResponse.search_result || [];
      options?.onProgress?.(`✅ 找到 ${searchResults.length} 条相关信息`, 'success');
    } catch (error: any) {
      console.warn('搜索失败，继续使用AI知识:', error);
      options?.onProgress?.(`⚠️ 搜索失败，使用AI知识库`, 'info');
    }

    // 3. 使用AI总结和生成辅助信息
    const assistInfo = await generateAssistInfo(taskText, searchResults, options);

    // 4. 生成子卡片
    const subItems = generateSubItems(assistInfo, searchResults);

    return {
      knowledgePoints: assistInfo.knowledgePoints,
      referenceInfo: assistInfo.referenceInfo,
      sourceLinks: assistInfo.sourceLinks,
      subItems,
    };
  } catch (error: any) {
    console.error('AI辅助执行失败:', error);
    options?.onProgress?.(`❌ 辅助功能执行失败: ${error.message}`, 'error');
    return null;
  }
}

/**
 * 使用AI生成辅助信息
 */
async function generateAssistInfo(
  taskText: string,
  searchResults: SearchResult[],
  options?: {
    onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void;
  }
): Promise<{
  knowledgePoints: string[];
  referenceInfo: string;
  sourceLinks: Array<{ title: string; url: string; media: string }>;
}> {
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    options?.onProgress?.('🤖 AI 正在分析并生成辅助信息...', 'info');

    // 构建搜索结果的上下文
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

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    sendChatStream({
      messages,
      onUpdate: (content: string) => {
        fullResponse = content;
      },
      onComplete: () => {
        try {
          // 解析AI响应
          let jsonStr = fullResponse.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
          }

          const result = JSON.parse(jsonStr);

          // 提取链接
          const sourceLinks = extractSearchLinks(searchResults);

          options?.onProgress?.('✅ 辅助信息生成完成', 'success');

          resolve({
            knowledgePoints: Array.isArray(result.knowledgePoints) ? result.knowledgePoints : [],
            referenceInfo: result.referenceInfo || '',
            sourceLinks,
          });
        } catch (error) {
          console.error('解析AI辅助信息失败:', error);
          // 使用备用方案
          const sourceLinks = extractSearchLinks(searchResults);
          resolve({
            knowledgePoints: searchResults.length > 0
              ? searchResults.slice(0, 3).map(r => r.title)
              : ['请查阅相关资料'],
            referenceInfo: searchResults.length > 0
              ? formatSearchResults(searchResults)
              : '建议查阅相关文档和资料获取更多信息。',
            sourceLinks,
          });
        }
      },
      onError: (error: Error) => {
        console.error('生成辅助信息失败:', error);
        // 使用备用方案
        const sourceLinks = extractSearchLinks(searchResults);
        resolve({
          knowledgePoints: searchResults.length > 0
            ? searchResults.slice(0, 3).map(r => r.title)
            : ['请查阅相关资料'],
          referenceInfo: searchResults.length > 0
            ? formatSearchResults(searchResults)
            : '建议查阅相关文档和资料获取更多信息。',
          sourceLinks,
        });
      },
      temperature: 0.7,
    });
  });
}

/**
 * 生成子卡片列表
 */
function generateSubItems(
  assistInfo: {
    knowledgePoints: string[];
    referenceInfo: string;
    sourceLinks: Array<{ title: string; url: string; media: string }>;
  },
  searchResults: SearchResult[]
): SubItem[] {
  const subItems: SubItem[] = [];
  const baseTimestamp = Date.now();

  // 1. 添加知识点子卡片
  assistInfo.knowledgePoints.forEach((point, index) => {
    subItems.push({
      id: `knowledge-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      text: `💡 ${point}`,
      status: 'pending',
    });
  });

  // 2. 添加参考信息摘要子卡片
  if (assistInfo.referenceInfo) {
    subItems.push({
      id: `reference-${baseTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
      text: `📚 参考信息：${assistInfo.referenceInfo.substring(0, 100)}${assistInfo.referenceInfo.length > 100 ? '...' : ''}`,
      status: 'pending',
    });
  }

  // 3. 添加来源链接子卡片
  assistInfo.sourceLinks.slice(0, 3).forEach((link, index) => {
    subItems.push({
      id: `link-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      text: `🔗 ${link.title} (${link.media}) - ${link.url}`,
      status: 'pending',
    });
  });

  return subItems;
}

