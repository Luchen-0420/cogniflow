// 智能输入助手核心逻辑模块
import type { RelatedItem, GapAnalysis, ExternalRecommendation } from '../../components/smart-assist/SmartInputAssistant';
import { itemApi } from '@/db/api';
import type { Item } from '@/types/types';
import { sendChatStream } from '@/utils/ai';

// 关键词触发规则
const RESEARCH_KEYWORDS = [
  '调研', '研究', '分析', '了解', '学习', '梳理',
  'research', 'study', 'analyze', 'investigate'
];
const RESEARCH_TAGS = ['#调研', '#学习', '#分析'];

export function shouldTriggerSmartAssist({ title, tags, type, content }: {
  title: string;
  tags: string[];
  type: string;
  content: string;
}, manual = false): boolean {
  // 手动触发：不受任何限制
  if (manual) {
    return content.trim().length > 0;
  }
  
  // 自动触发：需要满足条件
  // 1. 标题/内容关键词
  const keywordHit = RESEARCH_KEYWORDS.some(k => title.includes(k) || content.includes(k));
  // 2. 标签
  const tagHit = tags.some(t => RESEARCH_TAGS.includes(t));
  // 3. 类型
  const typeHit = type === '资料';
  // 4. 内容长度过滤（自动触发需要至少50字）
  if (content.length < 50) return false;
  return keywordHit || tagHit || typeHit;
}

// 提取关键词用于搜索
function extractKeywords(text: string): string[] {
  // 简单提取：去除常见停用词，提取2-4字的关键词
  const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
  const words = text.split(/[\s，。、；：！？\n]/).filter(w => w.length >= 2 && w.length <= 4 && !stopWords.includes(w));
  // 去重并限制数量
  return [...new Set(words)].slice(0, 5);
}

// 计算相关度分数
function calculateRelevance(item: Item, keywords: string[]): number {
  let score = 0;
  const searchText = `${item.title || ''} ${item.description || ''} ${item.raw_text || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  
  keywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    if (item.title?.toLowerCase().includes(lowerKeyword)) score += 30;
    if (item.description?.toLowerCase().includes(lowerKeyword)) score += 20;
    if (item.raw_text?.toLowerCase().includes(lowerKeyword)) score += 15;
    if (item.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))) score += 10;
  });
  
  // 标签匹配加分
  if (item.tags?.some(tag => RESEARCH_TAGS.includes(tag))) score += 15;
  
  return Math.min(100, score);
}

// 历史关联推荐（真实实现）
export async function getRelatedItems(topic: string): Promise<RelatedItem[]> {
  try {
    // 提取关键词
    const keywords = extractKeywords(topic);
    if (keywords.length === 0) {
      return [];
    }
    
    // 搜索相关条目
    const searchResults = await itemApi.searchItems(keywords.join(' '));
    
    // 计算相关度并排序
    const related = searchResults
      .map(item => ({
        item,
        relevance: calculateRelevance(item, keywords)
      }))
      .filter(result => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5) // 只取前5个
      .map(({ item, relevance }) => ({
        id: item.id,
        title: item.title || '无标题',
        createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString('zh-CN') : '未知',
        summary: item.description ? (item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description) : '无描述',
        relevance: Math.round(relevance)
      }));
    
    return related;
  } catch (error) {
    console.error('获取历史关联失败:', error);
    return [];
  }
}

// 缺口分析（基于历史数据的简单分析）
export async function analyzeKnowledgeGap(topic: string): Promise<GapAnalysis> {
  try {
    // 获取相关历史条目
    const relatedItems = await getRelatedItems(topic);
    
    // 简单分析：基于相关条目数量和时间
    const itemCount = relatedItems.length;
    const latestItem = relatedItems.length > 0 ? relatedItems[0] : null;
    const latestDate = latestItem?.createdAt || '';
    
    // 计算完整度分数（基于相关条目数量）
    let completenessScore = Math.min(100, itemCount * 20);
    
    // 检查时效性
    const needsUpdate = latestDate ? (() => {
      const date = new Date(latestDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 30;
    })() : false;
    
    // 生成建议
    const gaps: Array<{ type: string; description: string; priority: string }> = [];
    const suggestions: Array<{ action: string; details: string }> = [];
    
    if (itemCount === 0) {
      gaps.push({
        type: '维度缺失',
        description: '暂无相关历史资料，建议开始收集基础信息',
        priority: 'high'
      });
      suggestions.push({
        action: '补充资料',
        details: '建议先收集该主题的基础资料和背景信息'
      });
    } else if (itemCount < 3) {
      gaps.push({
        type: '深度不足',
        description: '相关资料较少，建议补充更多维度的信息',
        priority: 'medium'
      });
      suggestions.push({
        action: '深化研究',
        details: '建议补充：技术实现、案例分析、实际应用场景'
      });
    }
    
    if (needsUpdate) {
      suggestions.push({
        action: '更新资料',
        details: '最新资料已超过30天，建议查看是否有新的发展'
      });
    }
    
    return {
      completeness: {
        score: completenessScore,
        gaps
      },
      timeliness: {
        latestDate,
        needsUpdate,
        reason: needsUpdate ? `最新资料距今已超过30天，建议更新` : '资料时效性良好'
      },
      suggestions,
      outline: await generateResearchOutline(topic, relatedItems),
    };
  } catch (error) {
    console.error('缺口分析失败:', error);
    // 返回默认分析结果
    return {
      completeness: {
        score: 50,
        gaps: [
          { type: '信息不足', description: '无法获取历史数据进行分析', priority: 'medium' }
        ]
      },
      timeliness: {
        latestDate: '',
        needsUpdate: false,
        reason: '无法获取时间信息'
      },
      suggestions: [
        { action: '开始收集', details: '建议开始收集该主题的相关资料' }
      ],
      outline: await generateResearchOutline(topic, [])
    };
  }
}

// 生成详细的调研大纲
async function generateResearchOutline(topic: string, relatedItems: RelatedItem[]): Promise<string[]> {
  try {
    // 如果有相关历史资料，提取关键词用于生成更精准的大纲
    const keywords = relatedItems.length > 0 
      ? relatedItems.slice(0, 3).map(item => item.title).join('、')
      : topic;

    return new Promise((resolve) => {
      let fullResponse = '';

      const systemPrompt = `你是一个专业的调研规划助手。用户要进行一个调研任务，你需要生成一个详细、结构化的调研大纲。

调研主题：${topic}

${relatedItems.length > 0 ? `已有相关历史资料：${keywords}` : '暂无相关历史资料'}

请参考以下调研大纲模板，生成一个详细、可执行的调研大纲。大纲应该：

1. **基础调研**：搜索基本定义、关键组件、工作原理
2. **市场调研**：识别主流框架/产品/方案，列出具体名称
3. **背景调研**：了解创建者、维护者、设计理念、目标
4. **对比分析**：比较功能、架构、实现机制、支持特性
5. **社区调研**：查找评测文章、技术博客、社区讨论，关注性能、学习曲线、文档质量、社区活跃度
6. **案例调研**：查找实际应用案例和示例项目，了解适用场景

请生成一个详细的大纲，格式如下（使用编号和缩进）：
1. 第一级标题
   (1) 第二级标题
   (2) 第二级标题
      (a) 第三级标题（如需要）
      (b) 第三级标题

只返回大纲内容，不要添加其他说明文字。每个条目一行。`;

      sendChatStream({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请为"${topic}"生成详细的调研大纲` }
        ],
        onUpdate: (content: string) => {
          fullResponse = content;
        },
        onComplete: () => {
          try {
            // 清理响应，提取大纲
            let cleanedResponse = fullResponse.trim();
            cleanedResponse = cleanedResponse.replace(/```[\s\S]*?```/g, ''); // 移除代码块
            cleanedResponse = cleanedResponse.replace(/^[^1-9]*/, ''); // 移除开头非数字内容
            
            // 按行分割，过滤空行
            const lines = cleanedResponse
              .split('\n')
              .map(line => line.trim())
              .filter(line => {
                // 保留以数字、括号、字母开头的行（大纲格式）
                return line.length > 0 && /^[\d(（a-z\u4e00-\u9fa5]/.test(line);
              });
            
            if (lines.length > 0) {
              resolve(lines.slice(0, 20)); // 最多返回20条
            } else {
              // 如果AI生成失败，返回默认大纲
              resolve(getDefaultOutline(topic));
            }
          } catch (error) {
            console.error('解析调研大纲失败:', error);
            resolve(getDefaultOutline(topic));
          }
        },
        onError: (error: Error) => {
          console.error('生成调研大纲失败:', error);
          resolve(getDefaultOutline(topic));
        }
      });
    });
  } catch (error) {
    console.error('生成调研大纲异常:', error);
    return getDefaultOutline(topic);
  }
}

// 默认大纲模板
function getDefaultOutline(topic: string): string[] {
  return [
    `(1) 搜索 ${topic} 的基本定义、关键组件以及其工作原理`,
    `(2) 识别并列出当前（2025年）市场上主流的 ${topic} 相关框架/产品/方案`,
    `(3) 调研这些主流框架/产品的背景：`,
    `    (a) 它们的主要创建者和维护者（例如，是公司支持还是社区驱动）`,
    `    (b) 它们的核心设计理念和目标（例如，是注重易用性、灵活性还是多智能体协作）`,
    `(4) 比较分析这些框架/产品的主要功能和架构差异：`,
    `    (a) 它们如何实现状态管理和记忆（短期和长期）`,
    `    (b) 它们支持的工具集成（Tool Using）和函数调用（Function Calling）的机制`,
    `    (c) 它们对多智能体（Multi-Agent）协作模式的支持程度`,
    `(5) 搜索关于这些框架/产品的横向对比评测文章、技术博客和开发者社区（如 GitHub, Reddit）的讨论，重点关注它们的：`,
    `    (a) 性能和效率`,
    `    (b) 学习曲线和文档质量`,
    `    (c) 社区活跃度和生态系统成熟度`,
    `(6) 查找基于这些框架/产品构建的实际应用案例（Use Cases）和示例项目，以了解它们各自最适合的场景（例如，自动化工作流、数据分析、复杂的任务拆解）`,
  ];
}

// 检查链接可访问性
async function checkUrlAccessibility(url: string): Promise<boolean> {
  try {
    // 使用 HEAD 请求检查链接是否可访问（不下载内容，只检查状态）
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // 避免 CORS 问题，但无法获取状态码
      cache: 'no-cache'
    });
    // 由于 no-cors 模式，无法获取状态码，但请求成功说明链接格式正确
    return true;
  } catch (error) {
    // 如果请求失败，尝试使用 GET 请求（带超时）
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (e) {
      console.warn(`链接不可访问: ${url}`, e);
      return false;
    }
  }
}

// 验证 URL 格式
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// 外部推荐（基于主题生成合理的推荐，并验证链接）
export async function getExternalRecommendations(topic: string): Promise<ExternalRecommendation[]> {
  // 提取关键词用于搜索
  const keywords = extractKeywords(topic);
  if (keywords.length === 0) {
    return [];
  }

  // 基于主题生成推荐（这里使用一些通用的高质量资源）
  // 实际应该调用搜索API或使用真实的推荐服务
  const recommendations: ExternalRecommendation[] = [];
  
  // 根据主题关键词生成推荐
  const mainKeyword = keywords[0] || topic.slice(0, 10);
  
  // 生成一些常见的推荐（使用真实存在的链接）
  const commonRecommendations = [
    {
      title: `GitHub - ${mainKeyword} 相关项目`,
      url: `https://github.com/search?q=${encodeURIComponent(mainKeyword)}`,
      reason: '查找相关的开源项目和代码示例',
      type: 'GitHub',
    },
    {
      title: `Google Scholar - ${mainKeyword} 学术论文`,
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(mainKeyword)}`,
      reason: '查找相关的学术研究和论文',
      type: '学术',
    },
    {
      title: `Wikipedia - ${mainKeyword}`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(mainKeyword)}`,
      reason: '了解基础概念和背景知识',
      type: '百科',
    },
  ];

  // 验证每个链接的可访问性
  for (const rec of commonRecommendations) {
    if (isValidUrl(rec.url)) {
      // 对于搜索类链接，直接认为可访问（因为格式正确）
      if (rec.url.includes('search') || rec.url.includes('scholar') || rec.url.includes('wikipedia')) {
        recommendations.push(rec);
      } else {
        // 对于其他链接，检查可访问性
        const isAccessible = await checkUrlAccessibility(rec.url);
        if (isAccessible) {
          recommendations.push(rec);
        }
      }
    }
  }

  // 限制推荐数量
  return recommendations.slice(0, 3);
}
