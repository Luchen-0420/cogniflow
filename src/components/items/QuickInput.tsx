import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Search, Paperclip, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';
import { processTextWithAI, generateNoteTitle, extractBlogMetadata } from '@/utils/ai';
import { detectURL, isMainlyURL, fetchURLContent, generateURLSummary } from '@/utils/urlProcessor';
import { detectQueryIntent, removeQueryPrefix, parseQueryIntent, generateQuerySummary } from '@/utils/queryProcessor';
import { uploadAttachment, updateAttachmentItemId } from '@/utils/attachmentUtils';
import { isImageFile, readMultipleDocuments } from '@/utils/fileReader';
import { itemApi, auth, templateApi } from '@/db/api';
import { useAuth } from '@/db/apiAdapter';
import { QueryResultPanel } from '@/components/query/QueryResultPanel';
import { TemplateInputModal } from './TemplateInputModal';
import { HelpDialog } from '@/components/help/HelpDialog';
import { BlogEditorDialog } from '@/components/blog/BlogEditorDialog';
import { checkApiUsageBeforeAction } from '@/services/apiUsageService';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Item, UserTemplate } from '@/types/types';

interface QuickInputProps {
  onItemCreated?: () => void;
  onProcessingStart?: (text: string, id: string) => void;
  onProcessingComplete?: (id: string) => void;
  onProcessingError?: (id: string) => void;
  onDeleteURL?: (id: string) => void;
  onFirstInput?: () => void;
}

export default function QuickInput({ 
  onItemCreated, 
  onProcessingStart,
  onProcessingComplete,
  onProcessingError,
  onDeleteURL,
  onFirstInput
}: QuickInputProps) {
  const { isAuthenticated } = useAuth();
  const [text, setText] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<Item[] | null>(null);
  const [querySummary, setQuerySummary] = useState('');
  
  // 模板相关状态
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<UserTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // 帮助对话框状态
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  // 博客编辑器状态
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  
  // 附件相关状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载用户模板
  useEffect(() => {
    loadTemplates();
  }, []);

  const getDefaultTemplates = (): UserTemplate[] => {
    return [
      {
        id: 'default-template-1',
        user_id: '',
        trigger_word: '日报',
        template_name: '每日工作日志',
        icon: '📰',
        collection_type: '日报',
        default_tags: ['工作', '日报'],
        default_sub_items: [
          { id: '1', text: '总结今日完成的工作', status: 'pending' },
          { id: '2', text: '记录遇到的问题', status: 'pending' },
          { id: '3', text: '规划明日工作计划', status: 'pending' },
        ],
        is_active: true,
        sort_order: 0,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-template-2',
        user_id: '',
        trigger_word: '会议',
        template_name: '会议纪要',
        icon: '👥',
        collection_type: '会议',
        default_tags: ['会议', '工作'],
        default_sub_items: [
          { id: '1', text: '记录会议议题', status: 'pending' },
          { id: '2', text: '记录讨论要点', status: 'pending' },
          { id: '3', text: '记录行动项', status: 'pending' },
        ],
        is_active: true,
        sort_order: 1,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-template-3',
        user_id: '',
        trigger_word: '月报',
        template_name: '月度总结',
        icon: '📅',
        collection_type: '月报',
        default_tags: ['工作', '月报'],
        default_sub_items: [
          { id: '1', text: '本月工作完成情况', status: 'pending' },
          { id: '2', text: '重点成果与亮点', status: 'pending' },
          { id: '3', text: '下月工作计划', status: 'pending' },
        ],
        is_active: true,
        sort_order: 2,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  };

  const loadTemplates = async () => {
    // 未登录时直接使用默认模板
    if (!isAuthenticated) {
      console.log('📝 未登录，使用默认模板');
      setTemplates(getDefaultTemplates());
      return;
    }

    try {
      // 从 API 获取用户模板
      const userTemplates = await templateApi.getAll();
      
      // 如果没有模板，使用默认模板
      if (userTemplates.length === 0) {
        console.log('📝 没有用户模板，使用默认模板');
        setTemplates(getDefaultTemplates());
      } else {
        console.log('✅ 加载了', userTemplates.length, '个用户模板');
        setTemplates(userTemplates);
      }
    } catch (error) {
      console.error('❌ 加载模板失败:', error);
      // 如果加载失败，使用默认模板（不显示错误提示）
      console.log('📝 加载失败，使用默认模板');
      setTemplates(getDefaultTemplates());
    }
  };

  const handleTextChange = (value: string) => {
    // 如果是首次输入（从空到有内容），触发回调
    if (!text && value && onFirstInput) {
      onFirstInput();
    }
    
    setText(value);
    
    // 检测 /blog 指令
    if (value.trim().toLowerCase() === '/blog') {
      setShowBlogEditor(true);
      setText(''); // 清空输入框
      setShowTemplateMenu(false); // 关闭模板菜单
      return;
    }
    
    // 检测是否输入了 /
    if (value === '/') {
      setShowTemplateMenu(true);
    } else if (value.startsWith('/') && value.length > 1) {
      // 继续显示菜单，用于过滤（只有在 / 后面有内容时）
      setShowTemplateMenu(true);
    } else {
      // 如果不是以 / 开头，或者输入框为空，关闭菜单
      setShowTemplateMenu(false);
    }
  };

  const handleTemplateSelect = (template: UserTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateMenu(false);
    setShowTemplateModal(true);
    setText(''); // 清空输入框
  };

  // 文件处理函数
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // 验证文件类型和大小
    const validFiles = files.filter(file => {
      const allowedTypes = [
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`不支持的文件类型: ${file.name}`);
        return false;
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`文件过大: ${file.name} (最大10MB)`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      toast.success(`已选择 ${validFiles.length} 个文件`);
    }
    
    // 清空input以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 处理博客保存
  const handleBlogSave = async (content: string) => {
    const processingId = `processing-${Date.now()}`;
    
    try {
      const user = auth.getCurrentUser();
      if (!user) {
        toast.error('用户未初始化');
        return;
      }

      // 检查 API 用量
      const canProceed = await checkApiUsageBeforeAction(user.id);
      if (!canProceed) {
        return;
      }

      toast.info('正在分析文章内容...');
      onProcessingStart?.('博客文章', processingId);

      // 使用 AI 提取标题和标签
      const metadata = await extractBlogMetadata(content);
      
      console.log('📝 提取的博客元数据:', metadata);

      // 创建笔记类型的条目
      const newItem = await itemApi.createItem({
        raw_text: content,
        type: 'note',
        title: metadata.title,
        description: metadata.description,
        due_date: null,
        priority: 'medium',
        status: 'pending',
        tags: [...metadata.tags, '博客'],
        entities: {},
        archived_at: null,
        url: null,
        url_title: null,
        url_summary: null,
        url_thumbnail: null,
        url_fetched_at: null,
        has_conflict: false,
        start_time: null,
        end_time: null,
        recurrence_rule: null,
        recurrence_end_date: null,
        master_item_id: null,
        is_master: false,
      });

      if (newItem) {
        console.log('✅ 博客文章创建成功:', newItem);
        toast.success(`博客文章《${metadata.title}》已保存到笔记卡片`);
        onProcessingComplete?.(processingId);
        onItemCreated?.();
      } else {
        console.error('❌ 创建博客条目返回 null');
        toast.error('创建失败，请重试');
        onProcessingError?.(processingId);
      }
    } catch (error) {
      console.error('保存博客失败:', error);
      toast.error('保存失败，请重试');
      onProcessingError?.(processingId);
      throw error;
    }
  };

  const handleTemplateSave = async (data: {
    title: string;
    description: string;
    sub_items: any[];
    tags: string[];
  }) => {
    if (!selectedTemplate) return;

    const processingId = `processing-${Date.now()}`;
    
    try {
      const user = auth.getCurrentUser();
      if (!user) {
        toast.error('用户未初始化');
        return;
      }

      onProcessingStart?.(data.title, processingId);

      // 创建集合类型的条目
      const newItem = await itemApi.createItem({
        raw_text: data.title,
        type: 'collection',
        title: data.title,
        description: data.description,
        due_date: null,
        priority: 'medium',
        status: 'pending',
        tags: data.tags,
        entities: {},
        archived_at: null,
        url: null,
        url_title: null,
        url_summary: null,
        url_thumbnail: null,
        url_fetched_at: null,
        has_conflict: false,
        start_time: null,
        end_time: null,
        recurrence_rule: null,
        recurrence_end_date: null,
        master_item_id: null,
        is_master: false,
        collection_type: selectedTemplate.collection_type,
        sub_items: data.sub_items,
      });

      if (newItem) {
        console.log('✅ 集合条目创建成功:', newItem);
        toast.success('已添加到智能仪表盘');
        onProcessingComplete?.(processingId);
        onItemCreated?.();
        
        // 更新模板使用次数
        try {
          await templateApi.incrementUsage(selectedTemplate.id);
        } catch (err) {
          console.warn('更新模板使用次数失败:', err);
        }
      } else {
        console.error('❌ 创建条目返回 null');
        toast.error('创建失败,请重试');
        onProcessingError?.(processingId);
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败,请重试');
      onProcessingError?.(processingId);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && selectedFiles.length === 0) {
      toast.error('请输入内容或选择文件');
      return;
    }

    const inputText = text.trim();
    
    // 检测是否为帮助指令
    if (inputText.toLowerCase() === '@help') {
      setShowHelpDialog(true);
      setText('');
      return;
    }
    
    // 如果有附件，先上传附件
    if (selectedFiles.length > 0) {
      await handleFilesUpload(inputText);
      return;
    }
    
    // 检测是否为查询意图
    const isQuery = detectQueryIntent(inputText);
    
    if (isQuery) {
      // 处理查询
      await handleQuery(inputText);
    } else {
      // 处理普通输入
      await handleNormalInput(inputText);
    }
  };

  // 处理文件上传
  const handleFilesUpload = async (inputText: string) => {
    setIsUploading(true);
    setText('');
    
    try {
      // 分离图片文件和文档文件
      const imageFiles: File[] = [];
      const documentFiles: File[] = [];
      
      for (const file of selectedFiles) {
        if (isImageFile(file)) {
          imageFiles.push(file);
        } else {
          documentFiles.push(file);
        }
      }
      
      console.log(`📁 文件分类: ${imageFiles.length} 个图片, ${documentFiles.length} 个文档`);
      
      // 读取文档文件的内容
      let extractedText = '';
      if (documentFiles.length > 0) {
        console.log('📄 开始读取文档内容...');
        try {
          const { textContent, hasUnsupportedFiles, unsupportedFiles } = 
            await readMultipleDocuments(documentFiles);
          
          extractedText = textContent;
          
          if (hasUnsupportedFiles) {
            toast.warning(`以下文件类型暂不支持文本提取: ${unsupportedFiles.join(', ')}`);
          }
          
          if (textContent) {
            console.log(`✅ 成功提取 ${textContent.length} 字符的文本内容`);
          }
        } catch (error: any) {
          console.error('读取文档内容失败:', error);
          toast.error('读取文档内容失败');
        }
      }
      
      // 合并用户输入和提取的文本
      const combinedText = inputText 
        ? (extractedText ? `${inputText}\n\n${extractedText}` : inputText)
        : extractedText;
      
      console.log(`📝 合并后的文本长度: ${combinedText.length} 字符`);
      
      const uploadResults = [];
      
      // 上传所有文件（包括图片和文档）
      for (const file of selectedFiles) {
        try {
          const result = await uploadAttachment(file);
          uploadResults.push(result.attachment);
          toast.success(`${file.name} 上传成功`);
        } catch (error: any) {
          console.error('文件上传失败:', error);
          toast.error(`${file.name} 上传失败: ${error.message}`);
        }
      }
      
      // 清空已选文件
      setSelectedFiles([]);
      
      // 创建条目（使用合并后的文本）
      if (combinedText || uploadResults.length > 0) {
        if (combinedText) {
          console.log(`📎 创建条目 (文本长度: ${combinedText.length}, 附件数: ${uploadResults.length})`);
          
          // 判断是否有文档内容提取
          const hasExtractedText = documentFiles.length > 0 && extractedText;
          
          // 如果有文档内容，创建资料类型条目（不经过 AI 处理）
          let newItem: Item | null = null;
          
          if (hasExtractedText) {
            // 有文档内容：创建资料类型，不经过 AI
            console.log('📚 有文档内容，创建资料类型条目（不经过AI）');
            toast.info('正在生成标题...');
            
            try {
              // 使用 AI 仅生成标题
              const generatedTitle = await generateNoteTitle(combinedText);
              
              newItem = await itemApi.createItem({
                raw_text: combinedText, // 保存原始文本（用户输入 + 文档内容）
                type: 'data',
                title: generatedTitle,
                description: combinedText, // 完整内容作为描述（保持原文）
                due_date: null,
                priority: 'medium',
                status: 'pending',
                tags: ['资料'],
                entities: {},
                archived_at: null,
                url: null,
                url_title: null,
                url_summary: null,
                url_thumbnail: null,
                url_fetched_at: null,
                has_conflict: false,
                start_time: null,
                end_time: null,
                recurrence_rule: null,
                recurrence_end_date: null,
                master_item_id: null,
                is_master: false
              });
              
              if (newItem) {
                toast.success('资料已保存');
              }
            } catch (error) {
              console.error('资料创建失败:', error);
              toast.error('资料创建失败');
            }
          } else {
            // 无文档内容：按原逻辑处理（可能经过 AI）
            console.log('📝 无文档内容，按原逻辑处理');
            newItem = await handleNormalInput(combinedText);
          }
          
          // 如果条目创建成功，将附件关联到条目
          if (newItem && newItem.id && uploadResults.length > 0) {
            console.log(`📎 将 ${uploadResults.length} 个附件关联到条目 ${newItem.id}`);
            
            let successCount = 0;
            for (const attachment of uploadResults) {
              try {
                await updateAttachmentItemId(attachment.id, newItem.id);
                successCount++;
                console.log(`✅ 附件 ${attachment.id} 已关联到条目 ${newItem.id}`);
              } catch (error: any) {
                console.error(`❌ 关联附件 ${attachment.id} 失败:`, error);
              }
            }
            
            if (successCount > 0) {
              const message = documentFiles.length > 0
                ? `已创建条目并关联 ${successCount} 个附件，文档内容已提取`
                : `成功关联 ${successCount} 个附件到条目，AI 正在分析中...`;
              toast.success(message);
            }
          }
        } else if (uploadResults.length > 0) {
          // 只有附件没有文本
          toast.success(`成功上传 ${uploadResults.length} 个文件，AI 正在分析中...`);
        }
        
        onItemCreated?.();
      }
    } catch (error: any) {
      console.error('上传处理失败:', error);
      toast.error('上传处理失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuery = async (inputText: string) => {
    setIsQuerying(true);
    setText(''); // 清空输入框
    
    try {
      // 移除查询前缀
      const queryText = removeQueryPrefix(inputText);
      
      toast.info('正在解析查询...');
      
      // 使用AI解析查询意图
      const intent = await parseQueryIntent(queryText);
      
      console.log('🔍 查询意图:', intent);
      
      // 执行查询
      const results = await itemApi.queryItems(intent);
      
      // 生成摘要
      const summary = generateQuerySummary(intent, results.length);
      
      setQueryResults(results);
      setQuerySummary(summary);
      
      toast.success(`找到 ${results.length} 条记录`);
    } catch (error) {
      console.error('查询失败:', error);
      toast.error('查询失败,请重试');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleNormalInput = async (inputText: string): Promise<Item | null> => {
    const processingId = `processing-${Date.now()}`;
    
    // 立即清空输入框,让用户可以继续输入
    setText('');
    
    // 通知父组件开始处理
    onProcessingStart?.(inputText, processingId);

    // 异步处理,不阻塞UI
    try {
      const user = auth.getCurrentUser();
      if (!user) {
        toast.error('用户未初始化');
        onProcessingError?.(processingId);
        return null;
      }

      // 检测是否为URL
      const detectedURL = detectURL(inputText);
      const isURL = detectedURL && isMainlyURL(inputText);

      // 检测用户声明的类型（支持多种前缀）
      const typePatterns = {
        note: [
          /^笔记[：:]\s*/i,
          /^@笔记\s*/i,
          /^note[：:]\s*/i,
          /^@note\s*/i,
        ],
        task: [
          /^任务[：:]\s*/i,
          /^@任务\s*/i,
          /^task[：:]\s*/i,
          /^@task\s*/i,
          /^待办[：:]\s*/i,
          /^@待办\s*/i,
          /^todo[：:]\s*/i,
          /^@todo\s*/i,
        ],
        event: [
          /^日程[：:]\s*/i,
          /^@日程\s*/i,
          /^event[：:]\s*/i,
          /^@event\s*/i,
          /^活动[：:]\s*/i,
          /^@活动\s*/i,
          /^会议[：:]\s*/i,
          /^@会议\s*/i,
        ],
        data: [
          /^资料[：:]\s*/i,
          /^@资料\s*/i,
          /^data[：:]\s*/i,
          /^@data\s*/i,
          /^文档[：:]\s*/i,
          /^@文档\s*/i,
        ],
      };

      // 检测用户指定的类型
      let userSpecifiedType: 'note' | 'task' | 'event' | 'data' | null = null;
      let contentWithoutPrefix = inputText;

      for (const [type, patterns] of Object.entries(typePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(inputText)) {
            userSpecifiedType = type as 'note' | 'task' | 'event' | 'data';
            contentWithoutPrefix = inputText.replace(pattern, '').trim();
            console.log(`🏷️ 检测到用户指定类型: ${type}`);
            break;
          }
        }
        if (userSpecifiedType) break;
      }
      
      const isNote = userSpecifiedType === 'note';
      const isData = userSpecifiedType === 'data';
      let noteContent = contentWithoutPrefix;

      if (isURL && detectedURL) {
        // 处理URL类型
        console.log('🔗 检测到URL,开始抓取内容...');
        toast.info('正在抓取网页内容...');

        try {
          const urlResult = await fetchURLContent(detectedURL);

          // 使用 AI 生成更智能的梗概
          toast.info('正在生成智能梗概...');
          const aiSummary = await generateURLSummary(
            urlResult.url,
            urlResult.title,
            inputText
          );

          // 创建URL类型的条目
          const newItem = await itemApi.createItem({
            raw_text: inputText,
            type: 'url',
            title: urlResult.title,
            description: urlResult.summary,
            due_date: null,
            priority: 'medium',
            status: 'pending',
            tags: ['链接', '网页'],
            entities: {},
            archived_at: null,
            url: urlResult.url,
            url_title: urlResult.title,
            url_summary: aiSummary, // 使用 AI 生成的梗概
            url_thumbnail: urlResult.thumbnail || null,
            url_fetched_at: new Date().toISOString(),
            has_conflict: false,
            start_time: null,
            end_time: null,
            recurrence_rule: null,
            recurrence_end_date: null,
            master_item_id: null,
            is_master: false
          });

          if (newItem) {
            toast.success('链接已保存到链接库');
            onProcessingComplete?.(processingId);
            onItemCreated?.();
            return newItem;
          } else {
            toast.error('保存失败,请重试');
            onProcessingError?.(processingId);
            return null;
          }
        } catch (error) {
          console.error('URL处理失败:', error);
          toast.error('抓取网页内容失败,请检查URL是否有效');
          onProcessingError?.(processingId);
          return null;
        }
      } else if (isNote) {
        // 笔记类型：使用 AI 生成标题，但内容保持原文
        console.log('📝 检测到笔记，生成标题...');
        toast.info('正在生成标题...');
        
        try {
          // 使用 AI 生成简洁的标题
          const generatedTitle = await generateNoteTitle(noteContent);
          
          // 创建笔记类型的条目
          const newItem = await itemApi.createItem({
            raw_text: noteContent, // 保存去除前缀后的原始内容
            type: 'note',
            title: generatedTitle, // 使用 AI 生成的标题
            description: noteContent, // 完整内容作为描述（保持原文）
            due_date: null,
            priority: 'medium',
            status: 'pending',
            tags: ['笔记'],
            entities: {},
            archived_at: null,
            url: null,
            url_title: null,
            url_summary: null,
            url_thumbnail: null,
            url_fetched_at: null,
            has_conflict: false,
            start_time: null,
            end_time: null,
            recurrence_rule: null,
            recurrence_end_date: null,
            master_item_id: null,
            is_master: false
          });

          if (newItem) {
            toast.success('笔记已保存');
            onProcessingComplete?.(processingId);
            onItemCreated?.();
            return newItem;
          } else {
            toast.error('保存失败,请重试');
            onProcessingError?.(processingId);
            return null;
          }
        } catch (error) {
          console.error('笔记保存失败:', error);
          toast.error('笔记保存失败');
          onProcessingError?.(processingId);
          return null;
        }
      } else if (isData) {
        // 资料类型：使用 AI 生成标题，但内容保持原文
        console.log('📚 检测到资料，生成标题...');
        toast.info('正在生成标题...');
        
        try {
          // 使用 AI 生成简洁的标题
          const generatedTitle = await generateNoteTitle(contentWithoutPrefix);
          
          // 创建资料类型的条目
          const newItem = await itemApi.createItem({
            raw_text: contentWithoutPrefix, // 保存去除前缀后的原始内容
            type: 'data',
            title: generatedTitle, // 使用 AI 生成的标题
            description: contentWithoutPrefix, // 完整内容作为描述（保持原文）
            due_date: null,
            priority: 'medium',
            status: 'pending',
            tags: ['资料'],
            entities: {},
            archived_at: null,
            url: null,
            url_title: null,
            url_summary: null,
            url_thumbnail: null,
            url_fetched_at: null,
            has_conflict: false,
            start_time: null,
            end_time: null,
            recurrence_rule: null,
            recurrence_end_date: null,
            master_item_id: null,
            is_master: false
          });

          if (newItem) {
            toast.success('资料已保存');
            onProcessingComplete?.(processingId);
            onItemCreated?.();
            return newItem;
          } else {
            toast.error('保存失败,请重试');
            onProcessingError?.(processingId);
            return null;
          }
        } catch (error) {
          console.error('资料保存失败:', error);
          toast.error('资料保存失败');
          onProcessingError?.(processingId);
          return null;
        }
      } else {
        // 其他类型：使用 AI 处理（如果用户指定了类型，优先使用用户指定的类型）
        
        // 检查 API 使用次数
        const usageCheck = await checkApiUsageBeforeAction('卡片记录创建');
        if (!usageCheck.canProceed) {
          toast.error(usageCheck.message || 'API 使用次数已达上限');
          onProcessingError?.(processingId);
          return null;
        }
        
        const textToProcess = userSpecifiedType ? contentWithoutPrefix : inputText;
        const aiResult = await processTextWithAI(textToProcess);

        // 如果用户指定了类型，使用用户指定的类型；否则使用 AI 识别的类型
        const itemType = userSpecifiedType || aiResult.type || 'task';
        
        console.log('🤖 AI 处理结果:', {
          用户指定类型: userSpecifiedType,
          AI识别类型: aiResult.type,
          最终类型: itemType,
          原始文本: inputText,
          处理文本: textToProcess
        });

        // 标准化时间格式：移除时区信息，确保使用本地时间格式
        const normalizeTimeString = (timeStr: string | null | undefined): string | null => {
          if (!timeStr) return null;
          // 移除末尾的 'Z' 或时区偏移（如 +08:00）
          const normalized = timeStr.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
          console.log('🕐 [时间标准化]', { original: timeStr, normalized });
          return normalized;
        };

        const normalizedDueDate = normalizeTimeString(aiResult.due_date);
        const normalizedStartTime = normalizeTimeString(aiResult.start_time);
        const normalizedEndTime = normalizeTimeString(aiResult.end_time);

        console.log('📅 [创建事项] 时间信息:', {
          原始: { due_date: aiResult.due_date, start_time: aiResult.start_time, end_time: aiResult.end_time },
          标准化: { due_date: normalizedDueDate, start_time: normalizedStartTime, end_time: normalizedEndTime }
        });

        // 创建条目
        const newItem = await itemApi.createItem({
          raw_text: inputText,
          type: itemType,
          title: aiResult.title,
          description: aiResult.description,
          due_date: normalizedDueDate,
          priority: aiResult.priority,
          status: 'pending',
          tags: aiResult.tags,
          entities: aiResult.entities,
          archived_at: null,
          url: null,
          url_title: null,
          url_summary: null,
          url_thumbnail: null,
          url_fetched_at: null,
          has_conflict: false,
          start_time: normalizedStartTime,
          end_time: normalizedEndTime,
          recurrence_rule: null,
          recurrence_end_date: null,
          master_item_id: null,
          is_master: false
        });

        if (newItem) {
          console.log('✅ 普通文本条目创建成功:', newItem);
          toast.success('已添加到智能仪表盘');
          onProcessingComplete?.(processingId);
          onItemCreated?.();
          console.log('🔄 已调用数据刷新回调');
          return newItem;
        } else {
          console.error('❌ 创建条目返回 null');
          toast.error('创建失败,请重试');
          onProcessingError?.(processingId);
          return null;
        }
      }
    } catch (error) {
      console.error('处理失败:', error);
      toast.error('处理失败,请重试');
      onProcessingError?.(processingId);
      return null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCloseQuery = () => {
    setQueryResults(null);
    setQuerySummary('');
  };

  const isQueryMode = text.trim().startsWith('?') || text.trim().startsWith('/q');

  return (
    <>
      {/* 查询结果浮层 */}
      {queryResults && (
        <QueryResultPanel
          items={queryResults}
          summary={querySummary}
          onClose={handleCloseQuery}
          onUpdate={onItemCreated}
          onDeleteURL={onDeleteURL}
        />
      )}

      {/* 模板输入模态框 */}
      {selectedTemplate && (
        <TemplateInputModal
          open={showTemplateModal}
          onOpenChange={setShowTemplateModal}
          template={selectedTemplate}
          onSave={handleTemplateSave}
        />
      )}

      {/* 帮助对话框 */}
      <HelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
      />

      {/* 博客编辑器 */}
      <BlogEditorDialog
        open={showBlogEditor}
        onOpenChange={setShowBlogEditor}
        onSave={handleBlogSave}
      />

      {/* 输入框 */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50">
        <div className="max-w-4xl mx-auto">
          {/* 模板菜单 */}
          {showTemplateMenu && (
            <div className="mb-2 bg-card border rounded-lg shadow-lg overflow-hidden">
              <Command className="rounded-lg border-0">
                <CommandInput placeholder="搜索模板..." />
                <CommandList>
                  <CommandEmpty>未找到模板</CommandEmpty>
                  <CommandGroup heading="智能模板">
                    {templates
                      .filter((t) => t.is_active)
                      .map((template) => (
                        <CommandItem
                          key={template.id}
                          onSelect={() => handleTemplateSelect(template)}
                          className="cursor-pointer"
                        >
                          <span className="mr-2">{template.icon}</span>
                          <span className="font-medium">
                            /{template.trigger_word}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {template.template_name}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                  <CommandGroup>
                    <CommandItem className="cursor-pointer text-muted-foreground">
                      <span className="mr-2">⚙️</span>
                      管理模板...
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
          
          <div className="flex gap-2">
            {/* 附件上传按钮 */}
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="h-[60px] px-3"
                disabled={isQuerying || isUploading}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {/* 语音输入按钮 */}
              <VoiceInputButton
                onTranscript={(voiceText) => {
                  // 将语音识别的文本追加到现有文本后面
                  setText((prev) => {
                    const newText = prev ? `${prev} ${voiceText}` : voiceText;
                    return newText;
                  });
                }}
                disabled={isQuerying || isUploading}
                size="lg"
                className="h-[60px] px-3"
              />
              
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.doc,.docx"
                multiple
                onChange={handleFileSelect}
              />
            </div>
            
            <div className="flex-1 flex flex-col gap-2">
              {/* 已选择的文件预览 */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-lg">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative flex items-center gap-2 bg-background rounded px-2 py-1 pr-6"
                    >
                      <span className="text-xs truncate max-w-[150px]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-0 right-0 p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <Textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isQueryMode 
                    ? "🔍 查询模式: 输入查询内容 (如: 今天有什么事? 查询本周的会议)" 
                    : "输入任何想法、任务、日程或URL链接... (输入 /blog 写博客, / 使用智能模板, ? 或 /q 开启查询模式, @help 查看帮助, Enter发送)"
                }
                className={`min-h-[60px] max-h-[120px] resize-none ${
                  isQueryMode ? 'border-primary' : ''
                }`}
              />
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={(!text.trim() && selectedFiles.length === 0) || isQuerying || isUploading}
              size="lg"
              className="px-6 h-[60px]"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isQueryMode ? (
                <Search className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {/* 提示文本 */}
          {isQueryMode ? (
            <div className="mt-2 text-xs text-muted-foreground">
              💡 提示: 可以查询"今天的任务"、"本周的会议"、"标签:工作"等
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              💡 快捷提示: 输入 <code className="px-1 py-0.5 bg-muted rounded">/blog</code> 写博客 | 
              <code className="px-1 py-0.5 bg-muted rounded">@help</code> 查看帮助 | 
              <code className="px-1 py-0.5 bg-muted rounded">/</code> 使用模板 | 
              <code className="px-1 py-0.5 bg-muted rounded">?</code> 开启搜索 | 
              🎤 点击麦克风使用语音输入
            </div>
          )}
        </div>
      </div>
    </>
  );
}
