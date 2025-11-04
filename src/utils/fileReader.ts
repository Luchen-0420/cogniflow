/**
 * 文件读取工具
 * 用于读取文本文件内容
 */

/**
 * 判断文件是否为文本文件
 */
export function isTextFile(file: File): boolean {
  const textMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
  ];
  
  const textExtensions = [
    '.txt', '.md', '.markdown', '.html', '.css', '.js', '.json', '.xml',
    '.log', '.csv', '.tsv', '.ini', '.conf', '.yaml', '.yml',
  ];
  
  // 检查 MIME 类型
  if (textMimeTypes.includes(file.type)) {
    return true;
  }
  
  // 检查文件扩展名
  const fileName = file.name.toLowerCase();
  return textExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * 判断文件是否为 Word 文档
 */
export function isWordDocument(file: File): boolean {
  const wordMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  
  const wordExtensions = ['.doc', '.docx'];
  
  return wordMimeTypes.includes(file.type) || 
         wordExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

/**
 * 判断文件是否为 PDF
 */
export function isPDFDocument(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * 判断文件是否为图片
 */
export function isImageFile(file: File): boolean {
  const imageMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];
  
  return imageMimeTypes.includes(file.type) || 
         /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
}

/**
 * 读取纯文本文件内容
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 读取 Word 文档内容（简化版，仅提取文本）
 * 注意：这是一个简化实现，对于复杂的 docx 文件可能需要使用专门的库
 */
export async function readWordDocument(file: File): Promise<string> {
  // 对于 .docx 文件，我们需要使用后端 API 来解析
  // 这里返回一个提示信息
  return `[Word 文档: ${file.name}]\n注意：需要后端支持来完整解析 Word 文档内容。`;
}

/**
 * 读取文档内容（自动识别文件类型）
 */
export async function readDocumentContent(file: File): Promise<{ 
  content: string; 
  type: 'text' | 'word' | 'pdf' | 'unsupported';
}> {
  try {
    // 纯文本文件
    if (isTextFile(file)) {
      const content = await readTextFile(file);
      return { content, type: 'text' };
    }
    
    // Word 文档
    if (isWordDocument(file)) {
      const content = await readWordDocument(file);
      return { content, type: 'word' };
    }
    
    // PDF 文档
    if (isPDFDocument(file)) {
      return { 
        content: `[PDF 文档: ${file.name}]\n注意：需要后端支持来提取 PDF 内容。`, 
        type: 'pdf' 
      };
    }
    
    // 不支持的文件类型
    return { 
      content: '', 
      type: 'unsupported' 
    };
  } catch (error) {
    console.error('读取文件内容失败:', error);
    throw error;
  }
}

/**
 * 批量读取多个文档的内容
 */
export async function readMultipleDocuments(files: File[]): Promise<{
  textContent: string;
  hasUnsupportedFiles: boolean;
  unsupportedFiles: string[];
}> {
  const textParts: string[] = [];
  const unsupportedFiles: string[] = [];
  
  for (const file of files) {
    const result = await readDocumentContent(file);
    
    if (result.type === 'unsupported') {
      unsupportedFiles.push(file.name);
    } else if (result.content) {
      textParts.push(`\n--- ${file.name} ---\n${result.content}`);
    }
  }
  
  return {
    textContent: textParts.join('\n'),
    hasUnsupportedFiles: unsupportedFiles.length > 0,
    unsupportedFiles,
  };
}
