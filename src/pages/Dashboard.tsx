import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SmartInputAssistant, RelatedItem, GapAnalysis, ExternalRecommendation } from '@/components/smart-assist/SmartInputAssistant';
import { shouldTriggerSmartAssist, getRelatedItems, analyzeKnowledgeGap, getExternalRecommendations } from '@/features/smart-assist';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Inbox, Tag, CalendarDays, Link as LinkIcon, History, Archive, Calendar, Filter, X, CheckCircle2, FileText, Plus } from 'lucide-react';
import QuickInput from '@/components/items/QuickInput';
import ItemCard from '@/components/items/ItemCard';
import TodoCard from '@/components/items/TodoCard';
import ProcessingCard from '@/components/items/ProcessingCard';
import { CollectionCard } from '@/components/items/CollectionCard';
import TagCard from '@/components/tags/TagCard';
import { URLCard } from '@/components/url/URLCard';
import CalendarView from '@/components/calendar/CalendarView';
import ReportView from '@/components/report/ReportView';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { useAuth } from '@/db/apiAdapter';
import { itemApi, templateApi, auth, userSettingsApi } from '@/db/api';
import type { Item, TagStats, UserTemplate, ItemType } from '@/types/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { FloatingActionMenu } from '@/components/common/FloatingActionMenu';
import { WeeklyReportDialog } from '@/components/report/WeeklyReportDialog';
import { TemplateInputModal } from '@/components/items/TemplateInputModal';
import { BlogEditorDialog } from '@/components/blog/BlogEditorDialog';
import { HelpDialog } from '@/components/help/HelpDialog';
import { extractBlogMetadata } from '@/utils/ai';
import { checkApiUsageBeforeAction } from '@/services/apiUsageService';

interface ProcessingItem {
  id: string;
  text: string;
}

export default function Dashboard() {
  const location = useLocation();
  // 智能输入助手相关状态
  const [showSmartAssist, setShowSmartAssist] = useState(false);
  const [smartAssistTopic, setSmartAssistTopic] = useState('');
  const [smartAssistRelated, setSmartAssistRelated] = useState<RelatedItem[]>([]);
  const [smartAssistGap, setSmartAssistGap] = useState<GapAnalysis | undefined>(undefined);
  const [smartAssistRecs, setSmartAssistRecs] = useState<ExternalRecommendation[] | undefined>(undefined);
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [topicsSubTab, setTopicsSubTab] = useState('tags'); // 'tags' | 'history' | 'calendar'
  const [upcomingItems, setUpcomingItems] = useState<Item[]>([]);
  const [todoItems, setTodoItems] = useState<Item[]>([]);
  const [inboxItems, setInboxItems] = useState<Item[]>([]);
  const [urlItems, setUrlItems] = useState<Item[]>([]);
  const [archivedItems, setArchivedItems] = useState<Item[]>([]);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [historyItems, setHistoryItems] = useState<Item[]>([]);
  const [filteredHistoryItems, setFilteredHistoryItems] = useState<Item[]>([]);
  const [historyDateRange, setHistoryDateRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagItems, setTagItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  
  // 归档分类相关状态
  const [archivedSubTab, setArchivedSubTab] = useState<string>('all'); // 'all' | ItemType | 'tag:标签名'
  const [customArchiveCategories, setCustomArchiveCategories] = useState<string[]>([]); // 用户自定义的标签分类
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // 浮动按钮相关状态
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [dailyReportTemplate, setDailyReportTemplate] = useState<UserTemplate | null>(null);

  const loadData = async () => {
    console.log('🔄 开始加载数据...');
    const [upcoming, todos, inbox, urls, archived, tags, history] = await Promise.all([
      itemApi.getUpcomingItems(),
      itemApi.getTodoItems(),
      itemApi.getInboxItems(),
      itemApi.getURLItems(),
      itemApi.getArchivedItems(),
      itemApi.getTagStats(),
      itemApi.getAllItemsHistory()
    ]);

    console.log('📊 数据加载完成:', {
      upcoming: upcoming.length,
      todos: todos.length,
      inbox: inbox.length,
      urls: urls.length,
      archived: archived.length,
      tags: tags.length,
      history: history.length
    });

    setUpcomingItems(upcoming);
    setTodoItems(todos);
    setInboxItems(inbox);
    setUrlItems(urls);
    setArchivedItems(archived);
    setTagStats(tags);
    setHistoryItems(history);
  };

  // 加载自定义归档分类
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const settings = await userSettingsApi.getSettings();
        const categories = settings.archiveCategories || [];
        setCustomArchiveCategories(categories);
      } catch (error) {
        console.error('加载自定义归档分类失败:', error);
      }
    };
    loadCustomCategories();
  }, []);

  useEffect(() => {
    loadData();
    
    // 定时刷新数据，确保获取到最新的 AI 辅助结果（每2分钟刷新一次）
    const refreshInterval = setInterval(() => {
      loadData();
    }, 2 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const searchItems = async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        // 直接使用搜索查询字符串
        const results = await itemApi.searchItems(searchQuery.trim());
        setSearchResults(results);
      } else {
        setIsSearching(false);
        setSearchResults([]);
      }
    };

    const timer = setTimeout(searchItems, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleTagClick = async (tag: string) => {
    setSelectedTag(tag);
    const items = await itemApi.getItemsByTag(tag);
    setTagItems(items);
  };

  const handleProcessingStart = (text: string, id: string) => {
    setProcessingItems(prev => [...prev, { id, text }]);
  };

  const handleProcessingComplete = (id: string) => {
    setProcessingItems(prev => prev.filter(item => item.id !== id));
    loadData();
  };

  const handleProcessingError = (id: string) => {
    setProcessingItems(prev => prev.filter(item => item.id !== id));
  };

  const handleDeleteURL = async (id: string) => {
    const success = await itemApi.deleteItem(id);
    if (success) {
      loadData();
    }
  };

  // 筛选归档项
  const getFilteredArchivedItems = (): Item[] => {
    if (archivedSubTab === 'all') {
      return archivedItems;
    }
    
    if (archivedSubTab.startsWith('tag:')) {
      const tag = archivedSubTab.replace('tag:', '');
      return archivedItems.filter(item => item.tags && item.tags.includes(tag));
    }
    
    // 按类型筛选
    return archivedItems.filter(item => item.type === archivedSubTab);
  };

  // 添加自定义归档分类
  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('请输入标签名');
      return;
    }

    const tag = newCategoryName.trim();
    if (customArchiveCategories.includes(tag)) {
      toast.error('该标签分类已存在');
      return;
    }

    try {
      const updatedCategories = [...customArchiveCategories, tag];
      setCustomArchiveCategories(updatedCategories);
      await userSettingsApi.updateSettings({ archiveCategories: updatedCategories });
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
      toast.success('已添加归档分类');
    } catch (error) {
      console.error('添加归档分类失败:', error);
      toast.error('添加失败');
    }
  };

  // 删除自定义归档分类
  const handleDeleteCustomCategory = async (tag: string) => {
    try {
      const updatedCategories = customArchiveCategories.filter(cat => cat !== tag);
      setCustomArchiveCategories(updatedCategories);
      await userSettingsApi.updateSettings({ archiveCategories: updatedCategories });
      
      // 如果当前选中的是该分类，切换到全部
      if (archivedSubTab === `tag:${tag}`) {
        setArchivedSubTab('all');
      }
      
      toast.success('已删除归档分类');
    } catch (error) {
      console.error('删除归档分类失败:', error);
      toast.error('删除失败');
    }
  };

  // 处理首次输入时的登录提示
  const handleFirstInput = () => {
    if (!isAuthenticated && !hasInteracted) {
      setHasInteracted(true);
      setShowLoginDialog(true);
    }
  };

  // 智能输入助手触发逻辑
  const handleQuickInput = async (input: { title: string; tags: string[]; type: string; content: string }, manual = false) => {
    if (shouldTriggerSmartAssist(input, manual)) {
      const topic = input.title || input.content.slice(0, 50) || '当前输入';
      setSmartAssistTopic(topic);
      setShowSmartAssist(true);
      
      // 异步加载数据
      try {
        // 第一层：历史关联（快速响应）
        const related = await getRelatedItems(topic);
        setSmartAssistRelated(related);
        
        // 第二层：缺口分析（稍慢，手动触发时简化分析）
        if (manual && input.content.length < 50) {
          // 手动触发且内容较短时，只做简单分析
          setSmartAssistGap({
            completeness: {
              score: 0,
              gaps: [
                { type: '信息不足', description: '输入内容较短，建议补充更多信息以获得更准确的分析', priority: 'medium' }
              ]
            },
            timeliness: {
              latestDate: '',
              needsUpdate: false,
              reason: '内容较短，无法进行时效性分析'
            },
            suggestions: [
              { action: '补充信息', details: '建议输入更多内容以获得更准确的关联和分析' }
            ],
            outline: [] // 内容太短时不生成大纲
          });
        } else {
          // 异步加载缺口分析（包含大纲生成）
          analyzeKnowledgeGap(topic).then(gap => {
            setSmartAssistGap(gap);
          }).catch(error => {
            console.error('缺口分析失败:', error);
            // 失败时设置一个基础的分析结果
            setSmartAssistGap({
              completeness: {
                score: 50,
                gaps: [
                  { type: '分析失败', description: '无法完成分析，请稍后重试', priority: 'medium' }
                ]
              },
              timeliness: {
                latestDate: '',
                needsUpdate: false,
                reason: '无法获取时间信息'
              },
              suggestions: [
                { action: '重试', details: '请稍后重试分析功能' }
              ],
              outline: []
            });
          });
        }
        
        // 第三层：外部推荐（异步加载并验证链接）
        getExternalRecommendations(topic).then(recs => {
          setSmartAssistRecs(recs);
        }).catch(error => {
          console.error('获取外部推荐失败:', error);
          // 失败时不显示推荐，不设置状态
        });
      } catch (error) {
        console.error('加载智能助手数据失败:', error);
      }
    }
  };

  const handleCloseSmartAssist = () => setShowSmartAssist(false);
  
  // 交互操作实现
  const handleLoadItem = async (id: string) => {
    try {
      const item = await itemApi.getItem(id);
      if (item) {
        // 加载：将内容复制到输入框，方便用户编辑或引用
        // 这里可以触发一个回调，将内容传递给输入框
        // 暂时显示预览弹窗，并提示可以复制内容
        setPreviewItem(item);
        setPreviewDialogOpen(true);
        toast.success(`已加载：${item.title}，可以在预览中复制内容到输入框`);
      }
    } catch (error) {
      console.error('加载条目失败:', error);
      toast.error('加载失败');
    }
  };
  
  const handlePreviewItem = async (id: string) => {
    try {
      const item = await itemApi.getItem(id);
      if (item) {
        // 预览：只查看内容，不进行任何操作
        setPreviewItem(item);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error('预览条目失败:', error);
      toast.error('预览失败');
    }
  };
  
  const handleGenerateOutline = () => {
    if (smartAssistGap?.outline) {
      const outlineText = smartAssistGap.outline.join('\n');
      // 可以复制到剪贴板或创建新笔记
      navigator.clipboard.writeText(outlineText).then(() => {
        toast.success('调研大纲已复制到剪贴板');
      }).catch(() => {
        toast.info('调研大纲：\n' + outlineText);
      });
    }
  };
  
  const handleCreateSubTasks = async () => {
    if (!smartAssistGap?.suggestions || smartAssistGap.suggestions.length === 0) {
      toast.warning('没有可创建的子任务');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      // 为每个建议创建子任务
      for (const suggestion of smartAssistGap.suggestions) {
        try {
          const taskTitle = `${suggestion.action}：${suggestion.details}`;
          
          const newTask = await itemApi.createItem({
            raw_text: taskTitle,
            type: 'task',
            title: taskTitle,
            description: suggestion.details,
            due_date: null,
            priority: 'medium',
            status: 'pending',
            tags: ['调研', '子任务', ...(smartAssistTopic ? [smartAssistTopic] : [])],
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

          if (newTask) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('创建子任务失败:', error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`成功创建 ${successCount} 个子任务${failCount > 0 ? `，${failCount} 个失败` : ''}`);
        loadData(); // 刷新数据
      } else {
        toast.error('创建子任务失败，请重试');
      }
    } catch (error) {
      console.error('创建子任务异常:', error);
      toast.error('创建子任务失败');
    }
  };
  
  const handleAddRecommendation = async (url: string) => {
    try {
      // 创建链接类型的卡片
      const newItem = await itemApi.createItem({
        raw_text: url,
        type: 'url',
        title: url,
        description: '',
        due_date: null,
        priority: 'medium',
        status: 'pending',
        tags: ['推荐资料'],
        entities: {},
        archived_at: null,
        url: url,
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
        toast.success('已添加到链接库');
        loadData(); // 刷新数据
      } else {
        toast.error('添加失败');
      }
    } catch (error) {
      console.error('添加推荐链接失败:', error);
      toast.error('添加失败，请重试');
    }
  };

  // 加载日报模板
  const loadDailyReportTemplate = async () => {
    try {
      const templates = await templateApi.getAll();
      const dailyTemplate = templates.find(
        (t) => t.collection_type === '日报' && t.is_active
      );
      
      if (dailyTemplate) {
        setDailyReportTemplate(dailyTemplate);
      } else {
        // 使用默认模板
        setDailyReportTemplate({
          id: 'default-daily',
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
        });
      }
    } catch (error) {
      console.error('加载日报模板失败:', error);
      // 使用默认模板
      setDailyReportTemplate({
        id: 'default-daily',
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
      });
    }
  };

  // 处理日报按钮点击
  const handleDailyReportClick = async () => {
    await loadDailyReportTemplate();
    setShowDailyReport(true);
  };

  // 处理日报保存
  const handleDailyReportSave = async (data: {
    title: string;
    description: string;
    sub_items: any[];
    tags: string[];
  }) => {
    if (!dailyReportTemplate) return;

    try {
      const user = auth.getCurrentUser();
      if (!user) {
        toast.error('用户未登录');
        return;
      }

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
        collection_type: dailyReportTemplate.collection_type,
        sub_items: data.sub_items,
      });

      if (newItem) {
        toast.success('日报已保存');
        loadData();
        
        // 更新模板使用次数
        try {
          await templateApi.incrementUsage(dailyReportTemplate.id);
        } catch (err) {
          console.warn('更新模板使用次数失败:', err);
        }
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error('保存日报失败:', error);
      toast.error('保存失败，请重试');
    }
  };

  // 处理博客保存
  const handleBlogSave = async (content: string) => {
    try {
      const user = auth.getCurrentUser();
      if (!user) {
        toast.error('用户未登录');
        return;
      }

      // 检查 API 使用次数
      const usageCheck = await checkApiUsageBeforeAction('博客文章创建');
      if (!usageCheck.canProceed) {
        toast.error(usageCheck.message || 'API 使用次数已达上限');
        return;
      }

      // 使用 AI 提取标题和标签
      const metadata = await extractBlogMetadata(content, {
        onProgress: (message, type) => {
          if (type === 'error') {
            toast.error(message);
          } else if (type === 'success') {
            toast.success(message);
          } else {
            toast.info(message);
          }
        }
      });

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
        toast.success(`博客《${metadata.title}》已保存`);
        loadData();
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error('保存博客失败:', error);
      toast.error('保存失败，请重试');
    }
  };

  // 处理调研按钮点击（暂时使用智能助手）
  const handleResearchClick = () => {
    toast.info('调研功能开发中，请使用智能助手功能');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-32">
      <div className="max-w-4xl mx-auto p-2 sm:p-4 pt-4 sm:pt-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            CogniFlow
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </p>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索笔记、任务、日程、链接..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 text-sm sm:text-base"
            />
          </div>
        </div>

        {isSearching ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              搜索结果 ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                未找到相关内容
              </p>
            ) : (
              <div className="space-y-3">
                {searchResults.map((item) => (
                  item.type === 'collection' ? (
                    <CollectionCard 
                      key={item.id} 
                      item={item} 
                      onUpdate={async (id, updates) => {
                        await itemApi.updateItem(id, updates);
                        await loadData();
                      }}
                      onDelete={async (id) => {
                        await itemApi.deleteItem(id);
                        await loadData();
                      }}
                    />
                  ) : item.type === 'url' ? (
                    <URLCard key={item.id} item={item} onDelete={handleDeleteURL} />
                  ) : (
                    <ItemCard key={item.id} item={item} onUpdate={loadData} />
                  )
                ))}
              </div>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7 mb-4 sm:mb-6 h-auto">
              <TabsTrigger value="upcoming" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">即将发生</span>
                <span className="sm:hidden">日程</span>
              </TabsTrigger>
              <TabsTrigger value="todos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">待办清单</span>
                <span className="sm:hidden">待办</span>
              </TabsTrigger>
              <TabsTrigger value="inbox" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>笔记</span>
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">链接库</span>
                <span className="sm:hidden">链接</span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Archive className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>归档</span>
              </TabsTrigger>
              <TabsTrigger value="topics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>主题</span>
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-3 py-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>报告</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-2">
              {processingItems.map((item) => (
                <ProcessingCard key={item.id} text={item.text} />
              ))}
              {upcomingItems.length === 0 && processingItems.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">暂无即将发生的事项</p>
                </div>
              ) : (
                upcomingItems.map((item) => (
                  item.type === 'collection' ? (
                    <CollectionCard 
                      key={item.id} 
                      item={item} 
                      onUpdate={async (id, updates) => {
                        await itemApi.updateItem(id, updates);
                        await loadData();
                      }}
                      onDelete={async (id) => {
                        await itemApi.deleteItem(id);
                        await loadData();
                      }}
                    />
                  ) : (
                    <ItemCard key={item.id} item={item} onUpdate={loadData} />
                  )
                ))
              )}
            </TabsContent>

            <TabsContent value="todos" className="space-y-2">
              {todoItems.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">待办清单为空</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    添加任务开始管理你的待办事项
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        我的待办清单
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <span>共 {todoItems.length} 个任务</span>
                        {todoItems.filter(item => item.priority === 'high').length > 0 && 
                          <span className="text-red-600 dark:text-red-400">
                            {todoItems.filter(item => item.priority === 'high').length} 个高优先级
                          </span>
                        }
                        {todoItems.filter(item => item.status === 'in-progress').length > 0 && 
                          <span className="text-blue-600 dark:text-blue-400">
                            {todoItems.filter(item => item.status === 'in-progress').length} 个进行中
                          </span>
                        }
                        {todoItems.filter(item => item.status === 'blocked').length > 0 && 
                          <span className="text-red-600 dark:text-red-400">
                            {todoItems.filter(item => item.status === 'blocked').length} 个已阻塞
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {todoItems.map((item) => (
                      <TodoCard key={item.id} item={item} onUpdate={loadData} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="inbox" className="space-y-2">
              {inboxItems.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">笔记本为空</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    记录想法、知识和灵感
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      我的笔记
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      共 {inboxItems.length} 条记录性内容
                    </p>
                  </div>
                  <div className="space-y-3">
                    {inboxItems.map((item) => (
                      <ItemCard key={item.id} item={item} onUpdate={loadData} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="links" className="space-y-2">
              {urlItems.length === 0 ? (
                <div className="text-center py-12">
                  <LinkIcon className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">链接库为空</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    输入URL链接,自动抓取网页内容并生成梗概
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      我的链接库
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      共 {urlItems.length} 个链接
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {urlItems.map((item) => (
                      <URLCard key={item.id} item={item} onDelete={handleDeleteURL} />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="space-y-2">
              {archivedItems.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">归档箱为空</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    已归档的内容会出现在这里
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        已归档的内容
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddCategoryDialog(true)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        添加分类
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      共 {archivedItems.length} 条记录，点击可恢复
                    </p>
                  </div>
                  
                  {/* 归档子 tabs */}
                  <Tabs value={archivedSubTab} onValueChange={setArchivedSubTab} className="mb-4">
                    <TabsList className="flex-wrap h-auto">
                      <TabsTrigger value="all">全部</TabsTrigger>
                      <TabsTrigger value="task">任务</TabsTrigger>
                      <TabsTrigger value="event">日程</TabsTrigger>
                      <TabsTrigger value="note">笔记</TabsTrigger>
                      <TabsTrigger value="data">资料</TabsTrigger>
                      <TabsTrigger value="url">链接</TabsTrigger>
                      <TabsTrigger value="collection">合集</TabsTrigger>
                      {customArchiveCategories.map((tag) => (
                        <TabsTrigger 
                          key={tag} 
                          value={`tag:${tag}`}
                          className="flex items-center gap-1"
                        >
                          <span>#{tag}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomCategory(tag);
                            }}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {/* 渲染归档内容的辅助函数 */}
                    {(() => {
                      const renderArchivedContent = (filteredItems: Item[], emptyMessage?: string) => {
                        if (filteredItems.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <p className="text-gray-500 dark:text-gray-400">
                                {emptyMessage || '暂无归档内容'}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {filteredItems.map((item) => (
                              item.type === 'collection' ? (
                                <CollectionCard 
                                  key={item.id} 
                                  item={item} 
                                  onUpdate={async (id, updates) => {
                                    await itemApi.updateItem(id, updates);
                                    await loadData();
                                  }}
                                  onDelete={async (id) => {
                                    await itemApi.deleteItem(id);
                                    await loadData();
                                  }}
                                />
                              ) : item.type === 'url' ? (
                                <URLCard key={item.id} item={item} onDelete={handleDeleteURL} />
                              ) : (
                                <ItemCard key={item.id} item={item} onUpdate={loadData} />
                              )
                            ))}
                          </div>
                        );
                      };
                      
                      return (
                        <>
                          <TabsContent value="all" className="mt-4">
                            {renderArchivedContent(archivedItems, '暂无归档内容')}
                          </TabsContent>
                          <TabsContent value="task" className="mt-4">
                            {renderArchivedContent(archivedItems.filter(item => item.type === 'task'), '暂无任务类型的归档内容')}
                          </TabsContent>
                          <TabsContent value="event" className="mt-4">
                            {renderArchivedContent(archivedItems.filter(item => item.type === 'event'), '暂无日程类型的归档内容')}
                          </TabsContent>
                          <TabsContent value="note" className="mt-4">
                            {renderArchivedContent(archivedItems.filter(item => item.type === 'note'), '暂无笔记类型的归档内容')}
                          </TabsContent>
                          <TabsContent value="data" className="mt-4">
                            {renderArchivedContent(archivedItems.filter(item => item.type === 'data'), '暂无资料类型的归档内容')}
                          </TabsContent>
                          <TabsContent value="url" className="mt-4">
                            {renderArchivedContent(archivedItems.filter(item => item.type === 'url'), '暂无链接类型的归档内容')}
                          </TabsContent>
                          <TabsContent value="collection" className="mt-4">
                            {renderArchivedContent(archivedItems.filter(item => item.type === 'collection'), '暂无合集类型的归档内容')}
                          </TabsContent>
                          {customArchiveCategories.map((tag) => (
                            <TabsContent key={tag} value={`tag:${tag}`} className="mt-4">
                              {renderArchivedContent(archivedItems.filter(item => item.tags && item.tags.includes(tag)), `标签 #${tag} 下暂无归档内容`)}
                            </TabsContent>
                          ))}
                        </>
                      );
                    })()}
                  </Tabs>
                </div>
              )}
            </TabsContent>

            <TabsContent value="topics">
              {selectedTag ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      标签: {selectedTag}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTag(null)}
                    >
                      返回
                    </Button>
                  </div>
                  {tagItems.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      该标签下暂无条目
                    </p>
                  ) : (
                    tagItems.map((item) => (
                      item.type === 'collection' ? (
                        <CollectionCard 
                          key={item.id} 
                          item={item} 
                          onUpdate={async (id, updates) => {
                            await itemApi.updateItem(id, updates);
                            await loadData();
                          }}
                          onDelete={async (id) => {
                            await itemApi.deleteItem(id);
                            await loadData();
                          }}
                        />
                      ) : item.type === 'url' ? (
                        <URLCard key={item.id} item={item} onDelete={handleDeleteURL} />
                      ) : (
                        <ItemCard key={item.id} item={item} onUpdate={loadData} />
                      )
                    ))
                  )}
                </div>
              ) : (
                <div>
                  {/* 二级Tab导航 */}
                  <Tabs value={topicsSubTab} onValueChange={setTopicsSubTab} className="mb-4">
                    <TabsList className="grid w-full grid-cols-3 h-auto">
                      <TabsTrigger value="tags" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
                        <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>标签</span>
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
                        <History className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">历史记录</span>
                        <span className="sm:hidden">历史</span>
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>日历</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tags" className="mt-6">
                      {tagStats.length === 0 ? (
                        <div className="text-center py-12">
                          <Tag className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">暂无标签</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                            开始输入信息,AI会自动生成标签
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              标签统计
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              共 {tagStats.length} 个标签,点击查看详情
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tagStats.map((stats) => (
                              <TagCard
                                key={stats.tag}
                                tagStats={stats}
                                onClick={() => handleTagClick(stats.tag)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-6">
                      {historyItems.length === 0 ? (
                        <div className="text-center py-12">
                          <History className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">暂无历史记录</p>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4 sm:mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                              <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                  全部历史记录
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                  共 {filteredHistoryItems.length > 0 ? filteredHistoryItems.length : historyItems.length} 条记录,按时间倒序排列
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                                      <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span className="hidden sm:inline">{historyDateRange ? '已筛选' : '按日期筛选'}</span>
                                      <span className="sm:hidden">筛选</span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-3 sm:p-4" align="end">
                                    <div className="space-y-3">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">开始日期</label>
                                        <Input
                                          type="date"
                                          value={historyDateRange?.start || ''}
                                          onChange={(e) => {
                                            const start = e.target.value;
                                            setHistoryDateRange(prev => ({
                                              start,
                                              end: prev?.end || start
                                            }));
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">结束日期</label>
                                        <Input
                                          type="date"
                                          value={historyDateRange?.end || ''}
                                          onChange={(e) => {
                                            const end = e.target.value;
                                            setHistoryDateRange(prev => ({
                                              start: prev?.start || end,
                                              end
                                            }));
                                          }}
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        className="w-full"
                                        onClick={async () => {
                                          if (historyDateRange?.start && historyDateRange?.end) {
                                            // @ts-ignore - 新方法 TypeScript 还未识别
                                            const filtered = await itemApi.getHistoryByDateRange(
                                              historyDateRange.start,
                                              historyDateRange.end
                                            );
                                            setFilteredHistoryItems(filtered);
                                          }
                                        }}
                                        disabled={!historyDateRange?.start || !historyDateRange?.end}
                                      >
                                        应用筛选
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                {historyDateRange && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setHistoryDateRange(null);
                                      setFilteredHistoryItems([]);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {(filteredHistoryItems.length > 0 ? filteredHistoryItems : historyItems).map((item) => (
                              item.type === 'url' ? (
                                <URLCard key={item.id} item={item} onDelete={handleDeleteURL} />
                              ) : (
                                <ItemCard key={item.id} item={item} onUpdate={loadData} />
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="calendar" className="mt-6">
                      <CalendarView onUpdate={loadData} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </TabsContent>

            <TabsContent value="report">
              <ReportView />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <QuickInput 
        onItemCreated={loadData}
        onProcessingStart={handleProcessingStart}
        onProcessingComplete={handleProcessingComplete}
        onProcessingError={handleProcessingError}
        onDeleteURL={handleDeleteURL}
        onFirstInput={handleFirstInput}
        // 智能输入助手集成
        onSmartAssistTrigger={handleQuickInput}
      />

      {/* 智能输入助手侧边栏 */}
      <SmartInputAssistant
        visible={showSmartAssist}
        loading={smartAssistRelated.length === 0 && !smartAssistGap}
        topic={smartAssistTopic}
        relatedItems={smartAssistRelated}
        gapAnalysis={smartAssistGap}
        recommendations={smartAssistRecs}
        onClose={handleCloseSmartAssist}
        onLoadItem={handleLoadItem}
        onPreviewItem={handlePreviewItem}
        onGenerateOutline={handleGenerateOutline}
        onCreateSubTasks={handleCreateSubTasks}
        onAddRecommendation={handleAddRecommendation}
      />

      {/* 登录弹窗 */}
      <LoginDialog 
        open={showLoginDialog} 
        onOpenChange={setShowLoginDialog}
        onSuccess={loadData}
      />

      {/* 浮动操作菜单 - 只在 Dashboard 主界面显示 */}
      {location.pathname === '/' && (
        <FloatingActionMenu
          onDailyReport={handleDailyReportClick}
          onWeeklyReport={() => setShowWeeklyReport(true)}
          onBlog={() => setShowBlogEditor(true)}
          onResearch={handleResearchClick}
          onHelp={() => setShowHelpDialog(true)}
        />
      )}

      {/* 周报对话框 */}
      <WeeklyReportDialog
        open={showWeeklyReport}
        onOpenChange={setShowWeeklyReport}
        onReportCreated={loadData}
      />

      {/* 日报模板对话框 */}
      {dailyReportTemplate && (
        <TemplateInputModal
          open={showDailyReport}
          onOpenChange={setShowDailyReport}
          template={dailyReportTemplate}
          onSave={handleDailyReportSave}
        />
      )}

      {/* 博客编辑器 */}
      <BlogEditorDialog
        open={showBlogEditor}
        onOpenChange={setShowBlogEditor}
        onSave={handleBlogSave}
      />

      {/* 帮助对话框 */}
      <HelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
      />

      {/* 添加归档分类对话框 */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加归档分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                标签名
              </label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="输入标签名，例如：工作、学习、项目等"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomCategory();
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                将创建一个新的归档分类，显示包含该标签的所有归档内容
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCategoryDialog(false);
                  setNewCategoryName('');
                }}
              >
                取消
              </Button>
              <Button onClick={handleAddCustomCategory}>
                添加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 预览/加载弹窗 */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewItem?.title || '预览'}</span>
              {previewItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 复制内容到剪贴板
                    const content = previewItem.raw_text || previewItem.description || '';
                    navigator.clipboard.writeText(content).then(() => {
                      toast.success('内容已复制到剪贴板，可以粘贴到输入框');
                    }).catch(() => {
                      toast.error('复制失败');
                    });
                  }}
                  className="ml-2"
                >
                  复制内容
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {previewItem && (
              <>
                {/* 基本信息 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>类型：{previewItem.type}</span>
                    {previewItem.created_at && (
                      <span>• 创建时间：{new Date(previewItem.created_at).toLocaleString('zh-CN')}</span>
                    )}
                  </div>
                  {previewItem.tags && previewItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {previewItem.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-muted rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 内容 */}
                <div className="space-y-2">
                  <h3 className="font-semibold">内容</h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {previewItem.raw_text || previewItem.description || '无内容'}
                    </div>
                  </div>
                </div>

                {/* 描述（如果有） */}
                {previewItem.description && previewItem.description !== previewItem.raw_text && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">描述</h3>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {previewItem.description}
                      </div>
                    </div>
                  </div>
                )}

                {/* URL 信息（如果是链接类型） */}
                {previewItem.type === 'url' && previewItem.url && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">链接</h3>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <a
                        href={previewItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {previewItem.url}
                      </a>
                      {previewItem.url_summary && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {previewItem.url_summary}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
