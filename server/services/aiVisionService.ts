/**
 * 智谱 AI GLM-4.1V-Thinking 视觉模型服务
 * 用于理解和分析图片内容
 */

import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface ImageAnalysisResult {
  description: string;
  tags: string[];
  detailedAnalysis: any;
  suggestedTitle?: string;
  suggestedType?: 'task' | 'event' | 'note' | 'data';
}

/**
 * 将图片转换为 Base64
 */
export async function imageToBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

/**
 * 调用智谱 AI 视觉模型分析图片
 */
export async function analyzeImageWithAI(
  imageBase64: string,
  prompt?: string
): Promise<ImageAnalysisResult> {
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPU_API_KEY 未配置');
  }

  const defaultPrompt = `请详细分析这张图片，包括：
1. 图片的主要内容和场景描述
2. 图片中的关键信息和要点
3. 建议的标签（3-5个）
4. 如果图片包含任务、事件或笔记相关内容，请提取出来
5. 为这张图片生成一个合适的标题

请以JSON格式返回结果，包含以下字段：
{
  "description": "详细描述",
  "tags": ["标签1", "标签2", "标签3"],
  "title": "建议的标题",
  "type": "task|event|note|data",
  "extractedContent": {
    "tasks": ["任务1", "任务2"],
    "events": ["事件1"],
    "notes": ["笔记内容"]
  }
}`;

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4v-flash', // 使用 GLM-4V 视觉模型
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || defaultPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('智谱AI调用失败:', response.status, errorText);
      throw new Error(`智谱AI调用失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('智谱AI响应:', JSON.stringify(data, null, 2));

    const content = data.choices[0]?.message?.content || '';
    
    // 尝试解析JSON响应
    let parsedContent;
    try {
      // 提取JSON部分（可能包含在代码块中）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = JSON.parse(content);
      }
    } catch (e) {
      // 如果无法解析JSON，使用文本响应
      parsedContent = {
        description: content,
        tags: extractTagsFromText(content),
        title: '图片分析',
        type: 'note',
      };
    }

    return {
      description: parsedContent.description || content,
      tags: parsedContent.tags || [],
      detailedAnalysis: parsedContent,
      suggestedTitle: parsedContent.title,
      suggestedType: parsedContent.type || 'note',
    };
  } catch (error: any) {
    console.error('AI分析失败:', error);
    throw new Error(`AI分析失败: ${error.message}`);
  }
}

/**
 * 从文本中提取标签
 */
function extractTagsFromText(text: string): string[] {
  // 简单的标签提取逻辑
  const commonTags = ['工作', '生活', '学习', '娱乐', '重要', '紧急'];
  const foundTags: string[] = [];
  
  for (const tag of commonTags) {
    if (text.includes(tag)) {
      foundTags.push(tag);
    }
  }
  
  return foundTags.slice(0, 5);
}

/**
 * 分析文档内容
 * 对于文档类型，可以提取文本后进行分析
 */
export async function analyzeDocumentWithAI(
  documentText: string,
  filename: string
): Promise<ImageAnalysisResult> {
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPU_API_KEY 未配置');
  }

  const prompt = `请分析以下文档内容（文件名：${filename}）：

${documentText.substring(0, 2000)} ${documentText.length > 2000 ? '...' : ''}

请提供：
1. 文档的主要内容摘要
2. 关键信息提取
3. 建议的标签（3-5个）
4. 如果包含任务或事件，请提取出来
5. 为这个文档生成一个合适的标题

请以JSON格式返回结果。`;

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`智谱AI调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    let parsedContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = JSON.parse(content);
      }
    } catch (e) {
      parsedContent = {
        description: content,
        tags: extractTagsFromText(content),
        title: filename,
        type: 'note',
      };
    }

    return {
      description: parsedContent.description || content,
      tags: parsedContent.tags || [],
      detailedAnalysis: parsedContent,
      suggestedTitle: parsedContent.title,
      suggestedType: parsedContent.type || 'note',
    };
  } catch (error: any) {
    console.error('文档分析失败:', error);
    throw new Error(`文档分析失败: ${error.message}`);
  }
}

/**
 * 提取PDF文本内容
 * 注意：这需要安装 pdf-parse 包
 */
export async function extractPDFText(filePath: string): Promise<string> {
  // 这里需要实现PDF文本提取
  // 可以使用 pdf-parse 或其他PDF解析库
  // 暂时返回文件名作为占位
  return `PDF文档: ${filePath}`;
}

/**
 * 提取纯文本文件内容
 */
export async function extractPlainText(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('读取文本文件失败:', error);
    return '';
  }
}
