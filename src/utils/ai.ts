import ky, { type KyResponse, type AfterResponseHook, type NormalizedOptions } from 'ky';
import { createParser, type EventSourceParser } from 'eventsource-parser';
import type { AIProcessResult, ItemType } from '@/types/types';

export interface SSEOptions {
  onData: (data: string) => void;
  onEvent?: (event: any) => void;
  onCompleted?: (error?: Error) => void;
  onAborted?: () => void;
  onReconnectInterval?: (interval: number) => void;
}

export const createSSEHook = (options: SSEOptions): AfterResponseHook => {
  const hook: AfterResponseHook = async (request: Request, _options: NormalizedOptions, response: KyResponse) => {
    if (!response.ok || !response.body) {
      return;
    }

    let completed: boolean = false;
    const innerOnCompleted = (error?: Error): void => {
      if (completed) {
        return;
      }

      completed = true;
      options.onCompleted?.(error);
    };

    const isAborted: boolean = false;

    const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();

    const decoder: TextDecoder = new TextDecoder('utf8');

    const parser: EventSourceParser = createParser({
      onEvent: (event) => {
        if (event.data) {
          options.onEvent?.(event);
          const dataArray: string[] = event.data.split('\\ ');
          for (const data of dataArray) {
            options.onData(data);
          }
        }
      }
    });

    const read = (): void => {
      if (isAborted) {
        return;
      }

      reader.read().then((result: ReadableStreamReadResult<Uint8Array>) => {
        if (result.done) {
          innerOnCompleted();
          return;
        }

        parser.feed(decoder.decode(result.value, { stream: true }));

        read();
      }).catch(error => {
        if (request.signal.aborted) {
          options.onAborted?.();
          return;
        }

        innerOnCompleted(error as Error);
      });
    };

    read();

    return response;
  };

  return hook;
};

export interface AIProcessOptions {
  onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

export interface ChatStreamOptions {
  messages: ChatMessage[];
  onUpdate: (content: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  model?: string;
  temperature?: number;
}

export const sendChatStream = async (options: ChatStreamOptions): Promise<void> => {
  const { messages, onUpdate, onComplete, onError, signal, model, temperature } = options;

  const GLM_API_KEY = import.meta.env.VITE_GLM_API_KEY;
  const GLM_MODEL = model || import.meta.env.VITE_GLM_MODEL || 'glm-4-flash';

  if (!GLM_API_KEY) {
    onError(new Error('GLM API Key 未配置，请在 .env 文件中设置 VITE_GLM_API_KEY'));
    return;
  }

  let currentContent = '';

  const sseHook = createSSEHook({
    onData: (data: string) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.choices?.[0]?.delta?.content) {
          currentContent += parsed.choices[0].delta.content;
          onUpdate(currentContent);
        }
      } catch {
        console.warn('Failed to parse SSE data:', data);
      }
    },
    onCompleted: (error?: Error) => {
      if (error) {
        onError(error);
      } else {
        onComplete();
      }
    },
    onAborted: () => {
      console.log('Stream aborted');
    }
  });

  try {
    await ky.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      json: {
        model: GLM_MODEL,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: temperature || 0.95,
        stream: true
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`
      },
      signal,
      hooks: {
        afterResponse: [sseHook]
      }
    });
  } catch (error) {
    if (!signal?.aborted) {
      onError(error as Error);
    }
  }
};

/**
 * 生成智能汇总报告
 */
export async function generateSmartSummary(items: any[], periodName: string, options?: AIProcessOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    // 通知开始处理
    options?.onProgress?.('📊 正在生成智能汇总...', 'info');

    // 统计数据
    const stats = {
      total: items.length,
      tasks: items.filter(item => item.type === 'task'),
      events: items.filter(item => item.type === 'event'),
      notes: items.filter(item => item.type === 'note'),
      urls: items.filter(item => item.type === 'url'),
      completedTasks: items.filter(item => item.type === 'task' && item.status === 'completed'),
      tags: [...new Set(items.flatMap(item => item.tags))].slice(0, 10)
    };

    // 构建详细信息
    const itemsSummary = items.slice(0, 20).map(item => ({
      type: item.type,
      title: item.title || item.raw_text?.substring(0, 50),
      status: item.status,
      tags: item.tags.slice(0, 3),
      created: item.created_at
    }));

    const systemPrompt = `你是一个专业的数据分析引擎。你的任务是根据用户在特定时间段内的数据，生成一份结构化、高信息密度、逻辑清晰的总结报告。

报告受众：
用户是注重效率的专业人士。

报告要求：
1. **结构化输出**：必须严格使用 Markdown 格式，包括标题 (##)、列表 (-) 和表格。
2. **数据驱动**：直接呈现数据和基于数据的客观洞察，而不是空泛的评论。
3. **简洁高效**：语言必须精炼、专业、直奔主题。
4. **找出模式**：基于数据（尤其是标签）分析用户的关注焦点和工作模式。
5. **突出关键项**：明确列出已完成、未完成和（如果数据中包含）时间冲突的事项。

**严格禁止（DO NOT）**：
- **禁止**使用任何形式的会话式开场白或问候语（例如 "你好"、"很高兴为你服务"、"希望你一切都好"）。
- **禁止**使用“贴心”、“温馨”、“鼓励”等情感化词汇。
- **禁止**提供主观的、人生导师式的“建设性建议”（例如 "你要多注意休息"）。
- **禁止**使用任何形式的总结性客套话（例如 "继续加油！"）。

报告结构（严格遵循此 Markdown 结构）：

## 1. 概览
（使用表格清晰罗列数据统计）

| 类别 | 详情 |
| :--- | :--- |
| **总计** | ${stats.total} 条 |
| 任务 | ${stats.tasks.length} (已完成: ${stats.completedTasks.length}) |
| 日程 | ${stats.events.length} |
| 笔记 | ${stats.notes.length} |
| 链接 | ${stats.urls.length} |

## 2. 任务概要
### 已完成 (Completed: ${stats.completedTasks.length})
- [任务标题 1]
- [任务标题 2]
...
### 未完成 (Pending)
- [未完成的任务 1]
...

## 3. 日程与时间
### 主要日程
- [日程 1：时间]
- [日程 2：时间]
...
### **时间冲突（若有）**
- [冲突事项 A] 与 [冲突事项 B] 在 [时间] 发生重叠。
...

## 4. 知识库沉淀
### 新增笔记
- [笔记标题 1]
- [笔记标题 2]
...
### 收藏链接
- [链接标题 1] (梗概: ...)
- [链接标题 2] (梗概: ...)
...

## 5. 关注焦点分析
（基于 "主要标签：${stats.tags.join('、')}" 进行分析）
- **高频标签**: [标签 A] (X 次), [标签 B] (Y 次)
- **模式洞察**: [例如：本阶段 70% 的任务集中在 '项目X'，同时 '学习' 相关的笔记有 Y 篇，表明工作与学习高度相关。]

时间段：${periodName}`;

    const userContent = `请为以下数据生成智能汇总报告：

时间段：${periodName}
数据概览：${JSON.stringify(stats, null, 2)}
具体条目：${JSON.stringify(itemsSummary, null, 2)}

请严格按照 systemPrompt 的角色、要求和 Markdown 结构生成报告。`;

    sendChatStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      onUpdate: (content: string) => {
        fullResponse = content;
      },
      onComplete: () => {
        options?.onProgress?.('✅ 汇总生成完成', 'success');
        resolve(fullResponse.trim());
      },
      onError: (error: Error) => {
        options?.onProgress?.('❌ 生成汇总失败', 'error');
        reject(error);
      }
    });
  });
};

export async function processTextWithAI(text: string, options?: AIProcessOptions): Promise<AIProcessResult> {
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    // 通知开始处理
    options?.onProgress?.('🤖 AI 正在分析内容...', 'info');

    // 获取当前日期时间信息（使用本地时间，不使用 UTC）
    const now = new Date();
    // 生成本地时间的日期字符串，不使用 toISOString()（会转成 UTC）
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`; // YYYY-MM-DD 格式的本地日期
    
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    
    console.log('🔍 [AI处理] 开始处理文本:', text);
    console.log('📅 [AI处理] 当前时间信息:', {
      currentDate,
      currentTime,
      currentYear,
      currentMonth,
      currentDay,
      dayOfWeek,
      fullDate: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    });
    
    // 计算本周五的日期（如果今天是周五之后，则计算下周五）
    const currentDayIndex = now.getDay(); // 0=周日, 5=周五
    const daysUntilFriday = currentDayIndex <= 5 ? 5 - currentDayIndex : 7 - currentDayIndex + 5;
    const thisFriday = new Date(now);
    thisFriday.setDate(now.getDate() + daysUntilFriday);
    // 使用本地时间格式，不要用 toISOString()
    const friYear = thisFriday.getFullYear();
    const friMonth = String(thisFriday.getMonth() + 1).padStart(2, '0');
    const friDay = String(thisFriday.getDate()).padStart(2, '0');
    const thisFridayStr = `${friYear}-${friMonth}-${friDay}`;

    const systemPrompt = `你是一个智能信息处理助手。用户会输入一段文本,你需要分析并返回JSON格式的结构化数据。

当前时间信息:
- 当前日期: ${currentYear}年${currentMonth}月${currentDay}日 星期${dayOfWeek}
- 当前时间: ${currentTime}
- ISO格式基准日期: ${currentDate}
- 本周五（或下周五）: ${thisFridayStr}

⚠️ 重要提示：
1. "今天" = ${currentDate}（${currentYear}年${currentMonth}月${currentDay}日）
2. 时间必须基于 ${currentDate} 计算
3. "今晚"、"今天晚上"、"今天十点" 都必须使用 ${currentDate}

分析规则:
1. type: **必填项**，判断类型。如果无法确定类型，**默认使用 'task'**
   - task: 需要完成的具体任务（**默认类型**）,包含动作词如:
     * "买"、"购买"、"下单" → 购物任务
     * "做"、"完成"、"整理" → 工作任务  
     * "写"、"发送"、"发布" → 创作任务
     * "记得"、"提醒"、"不要忘记" → 提醒任务
     * "学习"、"复习"、"练习" → 学习任务
     * **任何带动作意图的描述都应该是 task**
   - event: 有明确时间的活动安排,如:
     * "开会"、"会议"、"面试"
     * "约"、"聚会"、"活动" 
     * "汇报"、"演讲"、"培训"
   - note: 想法、灵感、记录、思考,如:
     * "想到..."、"注意到..."、"发现..."
     * "灵感:"、"想法:"、"记录:"
     * 纯信息记录,无明确动作
   - data: 信息、资料、链接、参考内容
   
   **重要**: type 字段不能为空或 null，如果不确定，必须返回 'task'

2. title: 提取核心主题(10字以内)

3. description: 提取详细描述

4. due_date: **重要**提取时间信息,转换为ISO格式(YYYY-MM-DDTHH:mm:ss)
   时间处理规则(**严格执行**):
   
   ⚠️ 核心规则：当前日期是 ${currentDate}
   
   - **"今天"、"今晚"、"今天上午"、"今天下午"、"今天晚上" 都必须使用 ${currentDate}**
     * "十点开会" → ${currentDate}T10:00:00
     * "今天十点开会" → ${currentDate}T10:00:00
     * "今晚十点开会" → ${currentDate}T22:00:00
     * "今天晚上十点开会" → ${currentDate}T22:00:00
     * "今天上午开会" → ${currentDate}T09:00:00
     * "下午三点" → ${currentDate}T15:00:00
     * "晚上8点" → ${currentDate}T20:00:00
     
   - 明确的未来日期修饰词:
     * "明天十点" → 在${currentDate}基础上加1天
     * "后天" → 在${currentDate}基础上加2天
     * "周五晚上" → ${thisFridayStr}T19:00:00
     * "下周一" → 计算下周一的日期
     * "3月15日" → ${currentYear}-03-15T00:00:00
   - 相对日期计算(**重要**):
     * "周一/星期一" → 本周一（如果已过，则下周一）
     * "周五/星期五" → 本周五（如果已过，则下周五）
     * 当前是星期${dayOfWeek}，所以"周五"应该是 ${thisFridayStr}
   - 时间转换:
     * "早上/上午" → 09:00（如无具体时间）
     * "中午" → 12:00
     * "下午" → 14:00（如无具体时间）
     * "晚上" → 19:00（如无具体时间）
     * "凌晨" → 01:00（如无具体时间）
     * 如果有具体时间点（如"晚上十点"），使用具体时间（22:00）
   - 如果完全没有时间信息,返回null

5. start_time 和 end_time: 对于event类型,提取开始和结束时间
   - 如果只有一个时间点,start_time设为该时间,end_time为1小时后
   - "十点到十一点开会" → start_time: 10:00, end_time: 11:00

6. priority: 判断优先级
   - high: 包含"紧急"、"重要"、"马上"、"立即"
   - low: 包含"不急"、"有空"、"随时"
   - medium: 其他情况

7. tags: 提取关键词作为标签(3-5个)

8. entities: 提取实体信息
   - people: 人名
   - location: 地点
   - project: 项目名称
   - other: 其他关键信息

返回格式示例(纯JSON,不要markdown代码块):

示例1 - 没有日期修饰词:
输入: "十点开会"
{
  "type": "event",
  "title": "开会",
  "description": "十点开会",
  "due_date": "${currentDate}T10:00:00",
  "start_time": "${currentDate}T10:00:00",
  "end_time": "${currentDate}T11:00:00",
  "priority": "medium",
  "tags": ["会议", "工作"],
  "entities": {}
}

示例2 - 明确说"今天":
输入: "今天晚上十点开会"
当前日期: ${currentDate}
{
  "type": "event",
  "title": "开会",
  "description": "今天晚上十点开会",
  "due_date": "${currentDate}T22:00:00",
  "start_time": "${currentDate}T22:00:00",
  "end_time": "${currentDate}T23:00:00",
  "priority": "medium",
  "tags": ["会议", "工作"],
  "entities": {}
}

示例2.1 - 说"今晚":
输入: "今晚十点开会"
当前日期: ${currentDate}
{
  "type": "event",
  "title": "开会",
  "description": "今晚十点开会",
  "due_date": "${currentDate}T22:00:00",
  "start_time": "${currentDate}T22:00:00",
  "end_time": "${currentDate}T23:00:00",
  "priority": "medium",
  "tags": ["会议", "工作"],
  "entities": {}
}

示例3 - 周几的日期:
输入: "周五晚上进行汇报"
{
  "type": "event",
  "title": "汇报",
  "description": "周五晚上进行汇报",
  "due_date": "${thisFridayStr}T19:00:00",
  "start_time": "${thisFridayStr}T19:00:00",
  "end_time": "${thisFridayStr}T20:00:00",
  "priority": "medium",
  "tags": ["汇报", "工作"],
  "entities": {}
}`;

    sendChatStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      onUpdate: (content: string) => {
        fullResponse = content;
      },
      onComplete: () => {
        try {
          console.log('📥 [AI处理] 收到AI原始响应:', fullResponse);
          
          let jsonStr = fullResponse.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```\n?/g, '');
          }

          console.log('🔧 [AI处理] 清理后的JSON:', jsonStr);
          
          const result = JSON.parse(jsonStr);
          
          console.log('✅ [AI处理] 解析成功:', result);
          console.log('📅 [AI处理] 解析的日期:', {
            due_date: result.due_date,
            start_time: result.start_time,
            end_time: result.end_time
          });

          // 确保类型有效，如果为空或无效，默认使用 'task'
          const validTypes: ItemType[] = ['task', 'event', 'note', 'data', 'url'];
          const resultType = result.type as ItemType;
          const finalType: ItemType = validTypes.includes(resultType) ? resultType : 'task';

          const processedResult: AIProcessResult = {
            type: finalType,
            title: result.title || text.substring(0, 30),
            description: result.description || text,
            due_date: result.due_date || null,
            start_time: result.start_time || result.due_date || null,
            end_time: result.end_time || null,
            priority: result.priority || 'medium',
            tags: Array.isArray(result.tags) ? result.tags : [],
            entities: result.entities || {}
          };

          console.log('🎯 [AI处理] 最终处理结果:', processedResult);
          console.log('📅 [AI处理] 最终日期时间:', {
            due_date: processedResult.due_date,
            start_time: processedResult.start_time,
            end_time: processedResult.end_time
          });

          options?.onProgress?.('✅ 处理完成', 'success');
          resolve(processedResult);
        } catch (error) {
          console.error('❌ [AI处理] 解析AI响应失败:', error);
          console.error('📄 [AI处理] 原始响应:', fullResponse);
          options?.onProgress?.('⚠️ 解析失败，使用默认配置', 'error');
          // 解析失败时，默认使用 'task' 类型
          resolve({
            type: 'task',
            title: text.substring(0, 30),
            description: text,
            due_date: null,
            start_time: null,
            end_time: null,
            priority: 'medium',
            tags: [],
            entities: {}
          });
        }
      },
      onError: (error: Error) => {
        console.error('❌ [AI处理] AI处理失败:', error);
        options?.onProgress?.('❌ AI 处理失败', 'error');
        reject(error);
      }
    });
  });
}

/**
 * 为笔记生成简洁的标题
 * @param noteContent 笔记的完整内容
 * @returns 生成的标题（10-20个字）
 */
export async function generateNoteTitle(noteContent: string, options?: AIProcessOptions): Promise<string> {
  return new Promise((resolve) => {
    let fullResponse = '';

    // 通知开始处理
    options?.onProgress?.('✍️ 正在生成标题...', 'info');

    const systemPrompt = `你是一个专业的标题生成助手。用户会提供笔记内容，你需要为这段内容生成一个简洁、准确的标题。

要求：
1. 标题长度：10-20个字
2. 准确概括笔记的核心内容
3. 使用简洁的语言，避免冗长
4. 不要添加任何前缀（如"笔记："、"关于"等）
5. 直接返回标题文本，不要使用引号或其他标记
6. 如果内容是技术相关，使用专业术语
7. 如果内容是日常记录，使用通俗易懂的语言

示例：
输入："今天学习了 React Hooks，特别是 useEffect 的依赖数组机制很重要，需要注意清理副作用"
输出：React Hooks 学习笔记

输入："明天要去超市买菜，需要购买：西红柿、鸡蛋、面条、牛奶"
输出：购物清单

输入："项目进度：前端开发已完成80%，后端API接口还需要优化，预计下周完成"
输出：项目进度跟踪`;

    const userContent = `请为以下笔记内容生成一个简洁的标题：

${noteContent}

只返回标题文本，不要包含任何其他内容。`;

    sendChatStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      onUpdate: (content: string) => {
        fullResponse = content;
      },
      onComplete: () => {
        // 清理可能的引号和多余空格
        const title = fullResponse.trim().replace(/^["']|["']$/g, '');
        // 如果标题过长，截取前20个字
        const finalTitle = title.length > 20 ? title.substring(0, 20) : title;
        options?.onProgress?.('✅ 标题生成完成', 'success');
        resolve(finalTitle);
      },
      onError: (error: Error) => {
        console.error('生成笔记标题失败:', error);
        options?.onProgress?.('⚠️ 使用备用标题', 'error');
        // 如果 AI 失败，使用简单的截取作为后备方案
        const fallbackTitle = noteContent.length > 15 
          ? noteContent.substring(0, 15) + '...' 
          : noteContent;
        resolve(fallbackTitle);
      },
      temperature: 0.7 // 使用较低的温度以获得更稳定的输出
    });
  });
}

/**
 * 从博客/文章内容中提取标题和标签
 * @param content Markdown 格式的博客内容
 * @returns 包含标题、描述和标签的对象
 */
export interface BlogExtractResult {
  title: string;
  description: string;
  tags: string[];
}

export async function extractBlogMetadata(content: string, options?: AIProcessOptions): Promise<BlogExtractResult> {
  return new Promise((resolve) => {
    let fullResponse = '';

    // 通知开始处理
    options?.onProgress?.('📝 正在分析博客内容...', 'info');

    const systemPrompt = `你是一个专业的博客内容分析助手。用户会提供 Markdown 格式的博客文章，你需要提取以下信息：

1. **标题**：如果内容中有 Markdown 一级标题（# 标题），直接使用；否则根据内容生成一个简洁准确的标题（10-30个字）
2. **描述**：提取文章的核心观点或前几句话作为描述（不超过100字）
3. **标签**：根据文章内容生成3-5个相关标签，标签应该准确反映文章的主题和关键词

返回格式必须是有效的 JSON：
{
  "title": "文章标题",
  "description": "文章描述或摘要",
  "tags": ["标签1", "标签2", "标签3"]
}

要求：
- 标题简洁准确，能够概括文章主题
- 描述提炼文章核心内容，不要过长
- 标签要有代表性，可以包括技术栈、领域、主题等
- 只返回 JSON 格式，不要添加任何其他文字说明`;

    const userContent = `请分析以下博客文章，提取标题、描述和标签：

${content}

只返回 JSON 格式的结果，不要包含任何其他内容。`;

    sendChatStream({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      onUpdate: (content: string) => {
        fullResponse = content;
      },
      onComplete: () => {
        try {
          console.log('🤖 AI 返回的原始响应:', fullResponse);
          
          // 清理响应中的代码块标记
          let cleanedResponse = fullResponse.trim();
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
          cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
          cleanedResponse = cleanedResponse.trim();
          
          const result = JSON.parse(cleanedResponse);
          
          // 验证结果
          if (!result.title || !result.description || !Array.isArray(result.tags)) {
            throw new Error('AI 返回的数据格式不正确');
          }
          
          options?.onProgress?.('✅ 内容分析完成', 'success');
          resolve({
            title: result.title,
            description: result.description,
            tags: result.tags
          });
        } catch (error) {
          console.error('❌ 解析博客元数据失败:', error);
          console.error('📄 原始响应:', fullResponse);
          
          options?.onProgress?.('⚠️ 使用备用方案', 'error');
          // 如果解析失败，提供后备方案
          const fallbackTitle = extractMarkdownTitle(content) || '博客文章';
          const fallbackDescription = extractFirstParagraph(content);
          const fallbackTags = ['博客', '文章'];
          
          resolve({
            title: fallbackTitle,
            description: fallbackDescription,
            tags: fallbackTags
          });
        }
      },
      onError: (error: Error) => {
        console.error('❌ 提取博客元数据失败:', error);
        
        options?.onProgress?.('❌ AI 处理失败，使用本地提取', 'error');
        // AI 调用失败，使用本地提取
        const fallbackTitle = extractMarkdownTitle(content) || '博客文章';
        const fallbackDescription = extractFirstParagraph(content);
        const fallbackTags = ['博客', '文章'];
        
        resolve({
          title: fallbackTitle,
          description: fallbackDescription,
          tags: fallbackTags
        });
      },
      temperature: 0.7
    });
  });
}

/**
 * 从 Markdown 内容中提取一级标题
 */
function extractMarkdownTitle(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      return trimmed.substring(2).trim();
    }
  }
  return null;
}

/**
 * 提取第一段文字作为描述
 */
function extractFirstParagraph(content: string): string {
  // 移除标题行
  const lines = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#');
  });
  
  // 获取前几行非空内容
  const firstLines = lines.slice(0, 3).join(' ');
  
  // 移除 Markdown 语法
  const cleaned = firstLines
    .replace(/[*_~`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
  
  // 限制长度
  return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
}
