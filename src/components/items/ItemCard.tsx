import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Circle, Edit, Archive, ArchiveRestore, Trash2, Calendar, AlertCircle, AlertTriangle, Sparkles, FileText } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Item, SubItem } from '@/types/types';
import { itemApi } from '@/db/api';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import EditItemDialog from './EditItemDialog';
import URLCard from './URLCard';
import { AttachmentImages } from '@/components/attachments/AttachmentImages';
import { NoteViewDialog } from './NoteViewDialog';
import { getTypeBadgeClasses, getPriorityBorderClasses, type ItemType } from '@/styles/color-utils';
import { cn } from '@/lib/utils';

/**
 * 将不带时区的ISO时间字符串解析为本地时间
 * 避免时区转换问题
 */
const parseLocalDateTime = (dateTimeString: string): Date => {
  // 如果字符串不包含时区信息，则当作本地时间解析
  if (!dateTimeString.includes('Z') && !dateTimeString.includes('+') && !dateTimeString.includes('T')) {
    // 只有日期，没有时间
    return new Date(dateTimeString + 'T00:00:00');
  }
  
  if (!dateTimeString.includes('Z') && !dateTimeString.match(/[+-]\d{2}:\d{2}$/)) {
    // 有日期和时间，但没有时区信息，当作本地时间
    // 例如: "2025-11-01T23:00:00" 应该被解析为本地的23:00，而不是UTC的23:00
    const parts = dateTimeString.split(/[-T:]/);
    return new Date(
      parseInt(parts[0]), // year
      parseInt(parts[1]) - 1, // month (0-indexed)
      parseInt(parts[2]), // day
      parseInt(parts[3] || '0'), // hour
      parseInt(parts[4] || '0'), // minute
      parseInt(parts[5] || '0')  // second
    );
  }
  
  // 有时区信息，正常解析
  return new Date(dateTimeString);
};

interface ItemCardProps {
  item: Item;
  onUpdate?: () => void;
}

const typeLabels = {
  task: '任务',
  event: '日程',
  note: '笔记',
  data: '资料',
  url: '链接',
  collection: '合集'
};

// 类型颜色已迁移到设计系统，使用 getTypeBadgeClasses 函数
// 优先级颜色已迁移到设计系统，使用 getPriorityBorderClasses 函数

export default function ItemCard({ item, onUpdate }: ItemCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNoteViewOpen, setIsNoteViewOpen] = useState(false);
  const [isSubItemsExpanded, setIsSubItemsExpanded] = useState(false); // 子卡片折叠/展开状态
  const [assistStatus, setAssistStatus] = useState<{
    hasAssist: boolean;
    status: 'pending' | 'processing' | 'completed' | 'failed' | null;
    completedAt: string | null;
  } | null>(null);

  // 使用 useRef 存储 onUpdate 回调，避免依赖变化导致 useEffect 重新执行
  const onUpdateRef = useRef(onUpdate);
  
  // 当 onUpdate 变化时更新 ref，但不触发 useEffect 重新执行
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // 获取 AI 辅助状态并自动刷新数据
  useEffect(() => {
    // 检查是否使用 PostgreSQL API（有 getItemAssistStatus 方法）
    const postgresApi = itemApi as any;
    if (postgresApi.getItemAssistStatus) {
      let lastStatus: string | null = null;
      
      const checkAssistStatus = async () => {
        try {
          const status = await postgresApi.getItemAssistStatus(item.id);
          
          // 如果状态从非 completed 变为 completed，立即刷新数据
          if (lastStatus !== 'completed' && status.status === 'completed') {
            console.log('✅ 检测到 AI 辅助完成，刷新数据...');
            // 延迟刷新，确保后端数据已更新
            setTimeout(() => {
              onUpdateRef.current?.();
            }, 1000);
          }
          
          setAssistStatus(status);
          lastStatus = status.status;
        } catch {
          // 静默失败
        }
      };
      
      // 立即检查一次
      checkAssistStatus();
      
      // 每15秒检查一次辅助状态（如果还在处理中或已完成但需要显示）
      const interval = setInterval(() => {
        checkAssistStatus();
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [item.id]); // 只依赖 item.id，不依赖 onUpdate

  // 如果是 URL 类型，使用专门的 URLCard 组件
  if (item.type === 'url') {
    return <URLCard item={item} onUpdate={onUpdate} />;
  }

  const isCompleted = item.status === 'completed';
  // 过期判断：只有截止日期在今天之前（不包括今天）才算过期
  const isOverdue = item.due_date && (() => {
    const dueDate = parseLocalDateTime(item.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为当天00:00:00
    dueDate.setHours(0, 0, 0, 0); // 设置为截止日期00:00:00
    return dueDate < today && !isCompleted;
  })();
  const hasConflict = item.has_conflict && item.type === 'event';
  const isArchived = item.archived_at !== null;
  const canEdit = !isCompleted && !isArchived;

  const handleToggleComplete = async () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    const success = await itemApi.updateItem(item.id, { status: newStatus });

    if (success) {
      toast.success(isCompleted ? '已标记为未完成' : '已完成');
      onUpdate?.();
    } else {
      toast.error('操作失败');
    }
  };

  const handleArchive = async () => {
    if (isArchived) {
      // 恢复归档
      const success = await itemApi.unarchiveItem(item.id);
      if (success) {
        toast.success('已恢复');
        onUpdate?.();
      } else {
        toast.error('恢复失败');
      }
    } else {
      // 归档
      const success = await itemApi.archiveItem(item.id);
      if (success) {
        toast.success('已归档');
        onUpdate?.();
      } else {
        toast.error('归档失败');
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条记录吗?')) return;

    const success = await itemApi.deleteItem(item.id);

    if (success) {
      toast.success('已删除');
      onUpdate?.();
    } else {
      toast.error('删除失败');
    }
  };

  // 确定边框颜色: 冲突优先级最高，然后是过期，最后是优先级
  const borderClass = hasConflict 
    ? 'border-l-4 border-l-status-error-border bg-status-error-bg/30' 
    : isOverdue
    ? 'border-l-4 border-l-status-warning-border'
    : getPriorityBorderClasses(item.priority as 'high' | 'medium' | 'low' | undefined || 'low');

  return (
    <>
      <Card className={cn(
        'group relative',
        borderClass,
        isCompleted && 'opacity-50',
        'hover:shadow-hover hover:scale-[1.01]',
        'transition-all duration-fast ease-in-out',
        'border border-border',
        hasConflict 
          ? 'shadow-md shadow-status-error-border/20' 
          : 'bg-card/50 backdrop-blur-sm'
      )}>
        {/* 悬浮操作按钮 */}
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 flex gap-1 z-10">
          {/* 笔记类型：Markdown 编辑器按钮 */}
          {item.type === 'note' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-card/90 backdrop-blur hover:bg-primary/10 hover:text-primary rounded-lg shadow-sm"
              onClick={() => setIsNoteViewOpen(true)}
              title="在 Markdown 编辑器中打开"
            >
              <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-card/90 backdrop-blur hover:bg-muted rounded-lg shadow-sm"
              onClick={() => setIsEditOpen(true)}
              title="编辑"
            >
              <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-card/90 backdrop-blur hover:bg-muted rounded-lg shadow-sm"
            onClick={handleArchive}
            title={isArchived ? "恢复" : "归档"}
          >
            {isArchived ? (
              <ArchiveRestore className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            ) : (
              <Archive className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-card/90 backdrop-blur hover:bg-status-error-bg/30 rounded-lg shadow-sm"
            onClick={handleDelete}
            title="删除"
          >
            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-status-error-text" />
          </Button>
        </div>

        <CardHeader className="pb-2 pt-2.5 px-3 sm:px-4">
          <div className="flex items-start gap-2 sm:gap-3 pr-20 sm:pr-24">
            {(item.type === 'task' || item.type === 'event') && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-5 w-5 mt-0.5 flex-shrink-0 hover:bg-transparent"
                onClick={handleToggleComplete}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-status-success-text hover:text-status-success-text/80 transition-colors" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                )}
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                <CardTitle className={cn(
                  'text-sm sm:text-base font-medium break-words',
                  isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                )}>
                  {item.title || '无标题'}
                </CardTitle>
                {/* AI 辅助完成提示气泡 */}
                {assistStatus?.hasAssist && assistStatus.status === 'completed' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700">
                          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400">AI辅助</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800">
                        <p className="text-blue-900 dark:text-blue-100 font-medium text-xs sm:text-sm">✨ AI 已为您补充相关信息</p>
                        <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300/80 mt-1">
                          {assistStatus.completedAt 
                            ? `完成时间: ${format(new Date(assistStatus.completedAt), 'MM-dd HH:mm', { locale: zhCN })}`
                            : '已自动添加相关知识点和参考信息'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {hasConflict && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-status-error-bg border border-status-error-border">
                          <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-status-error-text flex-shrink-0" />
                          <span className="text-[10px] sm:text-xs font-medium text-status-error-text">时间冲突</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-status-error-bg border-status-error-border">
                        <p className="text-status-error-text font-medium text-xs sm:text-sm">⚠️ 此日程与其他事项存在时间冲突</p>
                        <p className="text-[10px] sm:text-xs text-status-error-text/80 mt-1">请检查并调整时间安排</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              {/* 日程类型：显示完整的日期时间信息 */}
              {item.type === 'event' && (item.start_time || item.end_time || item.due_date) && (() => {
                // 确定实际使用的开始时间和结束时间
                const startTime = item.start_time;
                // 优先使用 end_time，如果没有 end_time 但有 due_date 和 start_time，使用 due_date 作为结束时间
                const endTime = item.end_time || (item.start_time && item.due_date ? item.due_date : null);
                const displayDate = startTime ? parseLocalDateTime(startTime) : (endTime ? parseLocalDateTime(endTime) : (item.due_date ? parseLocalDateTime(item.due_date) : null));
                
                if (!displayDate) return null;
                
                return (
                  <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 rounded-lg bg-type-event-bg/50 border border-type-event-border/50">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-type-event-text flex-shrink-0 mt-0.5 sm:mt-0" />
                      <div className="flex-1 min-w-0">
                        {startTime && endTime ? (
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="text-xs sm:text-sm font-semibold text-type-event-text break-words">
                              {format(parseLocalDateTime(startTime), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-type-event-text/80">
                              <span className="font-medium">
                                {format(parseLocalDateTime(startTime), 'HH:mm', { locale: zhCN })}
                              </span>
                              <span className="text-type-event-text/60">→</span>
                              <span className="font-medium">
                                {format(parseLocalDateTime(endTime), 'HH:mm', { locale: zhCN })}
                              </span>
                              <span className="text-[10px] sm:text-xs text-type-event-text/70">
                                ({Math.round((parseLocalDateTime(endTime).getTime() - parseLocalDateTime(startTime).getTime()) / 60000)}分钟)
                              </span>
                            </div>
                          </div>
                        ) : endTime ? (
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="text-xs sm:text-sm font-semibold text-type-event-text break-words">
                              {format(parseLocalDateTime(endTime), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                            </div>
                            <div className="text-xs sm:text-sm text-type-event-text/80">
                              <span className="font-medium">
                                {format(parseLocalDateTime(endTime), 'HH:mm', { locale: zhCN })}
                              </span>
                            </div>
                          </div>
                        ) : item.due_date ? (
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="text-xs sm:text-sm font-semibold text-type-event-text break-words">
                              {format(parseLocalDateTime(item.due_date), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                            </div>
                            <div className="text-xs sm:text-sm text-type-event-text/80">
                              <span className="font-medium">
                                {format(parseLocalDateTime(item.due_date), 'HH:mm', { locale: zhCN })}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* 非日程类型：保持原有的简洁显示 */}
              {item.type !== 'event' && (
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Badge className={cn(
                    getTypeBadgeClasses(item.type as ItemType),
                    'text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-normal'
                  )}>
                    {typeLabels[item.type]}
                  </Badge>
                  {item.due_date && (
                    <div className={cn(
                      'flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md',
                      isOverdue 
                        ? 'bg-status-error-bg/30 text-status-error-text' 
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {isOverdue && <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="font-medium">
                        {isToday(parseLocalDateTime(item.due_date))
                          ? '今天'
                          : format(parseLocalDateTime(item.due_date), 'MM月dd日 HH:mm', { locale: zhCN })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* 日程类型也显示类型标签 */}
              {item.type === 'event' && (
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap mt-1 sm:mt-2">
                  <Badge className={cn(
                    getTypeBadgeClasses(item.type as ItemType),
                    'text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-normal'
                  )}>
                    {typeLabels[item.type]}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-0 pb-2.5 px-3 sm:px-4 space-y-1.5">
          {/* 笔记类型：即使没有描述也显示内容区域 */}
          {item.type === 'note' && (
            <div className="pl-7">
              {item.raw_text || item.description ? (
                <>
                  {!isExpanded && item.raw_text && item.raw_text.split('\n').length > 3 ? (
                    // 折叠状态：显示前3行
                    <>
                      <div 
                        className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-3 cursor-pointer hover:bg-muted/30 rounded p-1 transition-colors"
                        onClick={() => setIsNoteViewOpen(true)}
                        title="点击在 Markdown 编辑器中打开"
                      >
                        {item.raw_text || item.description}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsNoteViewOpen(true)}
                        className="mt-1 h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
                      >
                        在编辑器中查看
                      </Button>
                    </>
                  ) : (
                    // 展开状态：显示完整内容，支持滚动
                    <div className="space-y-2">
                      <div 
                        className="text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2 scrollbar-thin cursor-pointer hover:bg-muted/30 rounded p-1 transition-colors"
                        onClick={() => setIsNoteViewOpen(true)}
                        title="点击在 Markdown 编辑器中打开"
                      >
                        {item.raw_text || item.description}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsNoteViewOpen(true)}
                        className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
                      >
                        在 Markdown 编辑器中打开
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                // 没有内容时，显示一个按钮打开编辑器
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNoteViewOpen(true)}
                  className="h-8 px-3 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 border-primary/20"
                >
                  <FileText className="h-3 w-3 mr-1.5" />
                  在 Markdown 编辑器中打开
                </Button>
              )}
            </div>
          )}
          
          {/* 其他类型：显示描述 */}
          {item.description && item.type !== 'note' && (
            <>
              {item.type === 'data' ? (
                // 资料类型：显示原始内容，支持折叠展开
                <div className="pl-7">
                  {!isExpanded && item.raw_text && item.raw_text.split('\n').length > 3 ? (
                    // 折叠状态：显示前3行
                    <>
                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {item.raw_text || item.description}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(true)}
                        className="mt-1 h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
                      >
                        展开全部
                      </Button>
                    </>
                  ) : (
                    // 展开状态：显示完整内容，支持滚动
                    <div className="space-y-2">
                      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                        {item.raw_text || item.description}
                      </div>
                      {item.raw_text && item.raw_text.split('\n').length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsExpanded(false)}
                          className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
                        >
                          收起
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // 其他类型：显示 AI 处理后的描述
                <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                  {item.description}
                </p>
              )}
            </>
          )}

          {/* 附件图片展示 */}
          <div className="pl-7">
            <AttachmentImages itemId={item.id} maxDisplay={4} />
          </div>

          {/* 显示子卡片（AI辅助生成的内容） */}
          {item.sub_items && item.sub_items.length > 0 && (
            <div className="pl-7 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-muted-foreground">
                  AI 辅助信息 ({item.sub_items.length})
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSubItemsExpanded(!isSubItemsExpanded)}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isSubItemsExpanded ? '收起' : '展开'}
                </Button>
              </div>
              {isSubItemsExpanded && (
                <div className="space-y-2">
                  {item.sub_items.map((subItem: SubItem) => (
                    <div
                      key={subItem.id}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={subItem.status === 'done'}
                        onCheckedChange={async (checked) => {
                          if (!onUpdate) return;
                          const updatedSubItems = (item.sub_items || []).map((si: SubItem) =>
                            si.id === subItem.id
                              ? { ...si, status: checked ? 'done' : 'pending' }
                              : si
                          );
                          const success = await itemApi.updateItem(item.id, { sub_items: updatedSubItems });
                          if (success) {
                            onUpdate();
                          }
                        }}
                        className="mt-0.5"
                      />
                      <span
                        className={cn(
                          'flex-1 text-sm leading-relaxed',
                          subItem.status === 'done'
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground'
                        )}
                      >
                        {subItem.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-7">
              {item.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs px-2 py-0 font-normal border-border text-muted-foreground"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          {/* 显示创建时间 - 所有类型都显示 */}
          {item.created_at && (
            <div className="pt-0.5 pl-7">
              <span className="text-xs text-muted-foreground/70">
                创建于 {format(parseLocalDateTime(item.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <EditItemDialog
        item={item}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdate={onUpdate}
      />

      {/* 笔记查看/编辑对话框 */}
      {item.type === 'note' && (
        <NoteViewDialog
          item={item}
          open={isNoteViewOpen}
          onOpenChange={setIsNoteViewOpen}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}
