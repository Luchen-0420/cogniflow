import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertCircle, 
  CheckCircle2, 
  Circle,
  Edit, 
  Archive, 
  Trash2,
  Tag as TagIcon,
  Calendar,
  Sparkles
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Item, TaskStatus, SubItem, SubItemStatus } from '@/types/types';
import { itemApi } from '@/db/api';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import EditItemDialog from './EditItemDialog';
import { AttachmentImages } from '@/components/attachments/AttachmentImages';
import { cn } from '@/lib/utils';
import { getTypeBadgeClasses } from '@/styles/color-utils';

/**
 * 将不带时区的ISO时间字符串解析为本地时间
 */
const parseLocalDateTime = (dateTimeString: string): Date => {
  if (!dateTimeString.includes('Z') && !dateTimeString.includes('+') && !dateTimeString.includes('T')) {
    return new Date(dateTimeString + 'T00:00:00');
  }
  
  if (!dateTimeString.includes('Z') && !dateTimeString.match(/[+-]\d{2}:\d{2}$/)) {
    const parts = dateTimeString.split(/[-T:]/);
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      parseInt(parts[3] || '0'),
      parseInt(parts[4] || '0'),
      parseInt(parts[5] || '0')
    );
  }
  
  return new Date(dateTimeString);
};

interface TodoCardProps {
  item: Item;
  onUpdate: () => void;
}

const statusLabels = {
  pending: '待处理',
  'in-progress': '进行中',
  blocked: '已阻塞',
  completed: '已完成'
};

export default function TodoCard({ item, onUpdate }: TodoCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubItemsExpanded, setIsSubItemsExpanded] = useState(false); // 子卡片折叠/展开状态
  const [assistStatus, setAssistStatus] = useState<{
    hasAssist: boolean;
    status: 'pending' | 'processing' | 'completed' | 'failed' | null;
    completedAt: string | null;
  } | null>(null);

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
              onUpdate?.();
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
  }, [item.id, onUpdate]);
  
  // 过期判断：只有截止日期在今天之前（不包括今天）才算过期
  const isOverdue = item.due_date && (() => {
    const dueDate = parseLocalDateTime(item.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为当天00:00:00
    dueDate.setHours(0, 0, 0, 0); // 设置为截止日期00:00:00
    return dueDate < today && item.status !== 'completed';
  })();

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (isUpdatingStatus) return;
    
    setIsUpdatingStatus(true);
    try {
      await itemApi.updateItem(item.id, {
        ...item,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      toast.success(`任务状态已更新为${statusLabels[newStatus]}`);
      onUpdate();
    } catch (error) {
      console.error('更新任务状态失败:', error);
      toast.error('更新任务状态失败');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchive = async () => {
    try {
      await itemApi.updateItem(item.id, {
        ...item,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      toast.success('任务已归档');
      onUpdate();
    } catch (error) {
      console.error('归档任务失败:', error);
      toast.error('归档任务失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个任务吗？此操作无法撤销。')) return;
    
    try {
      await itemApi.deleteItem(item.id);
      toast.success('任务已删除');
      onUpdate();
    } catch (error) {
      console.error('删除任务失败:', error);
      toast.error('删除任务失败');
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发其他点击事件
    
    if (isUpdatingStatus) return;
    
    const newStatus: TaskStatus = item.status === 'completed' ? 'pending' : 'completed';
    
    setIsUpdatingStatus(true);
    try {
      await itemApi.updateItem(item.id, {
        ...item,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      toast.success(newStatus === 'completed' ? '任务已完成' : '任务已标记为待处理');
      onUpdate();
    } catch (error) {
      console.error('更新任务状态失败:', error);
      toast.error('更新任务状态失败');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isCompleted = item.status === 'completed';
  const isArchived = item.archived_at !== null;
  const canEdit = !isCompleted && !isArchived;

  return (
    <>
      <Card className={cn(
        'group relative',
        isCompleted && 'opacity-50',
        'hover:shadow-hover hover:scale-[1.01]',
        'transition-all duration-fast ease-in-out',
        'border border-border',
        'bg-card/50 backdrop-blur-sm'
      )}>
        {/* 悬浮操作按钮 */}
        <div className="absolute top-1.5 right-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 flex gap-0.5 z-10">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 bg-card/90 backdrop-blur hover:bg-muted rounded-lg shadow-sm"
              onClick={() => setShowEditDialog(true)}
              title="编辑"
            >
              <Edit className="h-2.5 w-2.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 bg-card/90 backdrop-blur hover:bg-muted rounded-lg shadow-sm"
            onClick={handleArchive}
            title="归档"
          >
            <Archive className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 bg-card/90 backdrop-blur hover:bg-status-error-bg/30 rounded-lg shadow-sm"
            onClick={handleDelete}
            title="删除"
          >
            <Trash2 className="h-2.5 w-2.5 text-status-error-text" />
          </Button>
        </div>

        <CardHeader className="pb-1 pt-1.5 px-2 sm:px-3">
          <div className="flex items-start gap-2 pr-16">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-4 w-4 mt-0.5 flex-shrink-0 hover:bg-transparent"
                  onClick={handleToggleComplete}
                  disabled={isUpdatingStatus}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success-text hover:text-status-success-text/80 transition-colors" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  )}
                </Button>
                <CardTitle className={cn(
                  'text-xs font-medium break-words',
                  isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                )}>
                  {item.title || '无标题任务'}
                </CardTitle>
                {/* AI 辅助完成提示气泡 */}
                {assistStatus?.hasAssist && assistStatus.status === 'completed' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700">
                          <Sparkles className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400">AI辅助</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800">
                        <p className="text-blue-900 dark:text-blue-100 font-medium text-xs">✨ AI 已为您补充相关信息</p>
                        <p className="text-[10px] text-blue-700 dark:text-blue-300/80 mt-1">
                          {assistStatus.completedAt 
                            ? `完成时间: ${format(new Date(assistStatus.completedAt), 'MM-dd HH:mm', { locale: zhCN })}`
                            : '已自动添加相关知识点和参考信息'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {isOverdue && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-status-error-bg/30 border border-status-error-border">
                          <AlertCircle className="h-2.5 w-2.5 text-status-error-text flex-shrink-0" />
                          <span className="text-[9px] font-medium text-status-error-text">已过期</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-status-error-bg border-status-error-border">
                        <p className="text-status-error-text font-medium text-xs">⚠️ 任务已过期</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {/* 类型标签 */}
                <Badge className={cn(
                  getTypeBadgeClasses('task'),
                  'text-[10px] px-1.5 py-0 font-normal'
                )}>
                  任务
                </Badge>

                {/* 状态选择器 */}
                <Select
                  value={item.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-20 h-6 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="in-progress">进行中</SelectItem>
                    <SelectItem value="blocked">已阻塞</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>

                {/* 截止日期 */}
                {item.due_date && (
                  <div className={cn(
                    'flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md',
                    isOverdue 
                      ? 'bg-status-error-bg/30 text-status-error-text' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                    <Calendar className="h-2.5 w-2.5" />
                    <span className="font-medium">
                      {isToday(parseLocalDateTime(item.due_date))
                        ? '今天'
                        : format(parseLocalDateTime(item.due_date), 'MM月dd日 HH:mm', { locale: zhCN })}
                    </span>
                  </div>
                )}

                {/* 标签 */}
                {(() => {
                  const tags = Array.isArray(item.tags) ? item.tags : (item.tags ? Object.values(item.tags) : []);
                  return tags.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <TagIcon className="h-2.5 w-2.5 text-muted-foreground" />
                      <div className="flex gap-0.5">
                        {tags.slice(0, 2).map((tag, index) => (
                          <Badge key={typeof tag === 'string' ? tag : `tag-${index}`} variant="outline" className="text-[10px] px-0.5 py-0 border-border text-muted-foreground">
                            {String(tag)}
                          </Badge>
                        ))}
                        {tags.length > 2 && (
                          <Badge variant="outline" className="text-[10px] px-0.5 py-0 border-border text-muted-foreground">
                            +{tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-0 pb-1.5 px-2 sm:px-3 space-y-1">
          {item.description && (
            <p className={cn(
              'text-xs text-muted-foreground leading-relaxed pl-5',
              isCompleted && 'line-through'
            )}>
              {item.description}
            </p>
          )}

          {/* 附件图片展示 */}
          <div className="pl-5">
            <AttachmentImages itemId={item.id} maxDisplay={3} compact />
          </div>

          {/* 显示子卡片（AI辅助生成的内容） */}
          {item.sub_items && item.sub_items.length > 0 && (
            <div className="pl-5 space-y-1">
              <div className="flex items-center justify-between mb-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">
                  AI 辅助信息 ({item.sub_items.length})
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSubItemsExpanded(!isSubItemsExpanded)}
                  className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {isSubItemsExpanded ? '收起' : '展开'}
                </Button>
              </div>
              {isSubItemsExpanded && (
                <div className="space-y-1">
                  {item.sub_items.map((subItem: SubItem) => (
                    <div
                      key={subItem.id}
                      className="flex items-start gap-1.5 p-1 rounded-md bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={subItem.status === 'done'}
                        onCheckedChange={async (checked) => {
                          if (!onUpdate) return;
                          const newStatus: SubItemStatus = checked === true ? 'done' : 'pending';
                          const updatedSubItems: SubItem[] = (item.sub_items || []).map((si: SubItem) =>
                            si.id === subItem.id
                              ? { ...si, status: newStatus }
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
                          'flex-1 text-xs leading-relaxed',
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

          {/* 创建时间 */}
          {item.created_at && (
            <div className="pt-0.5 pl-5">
              <span className="text-[10px] text-muted-foreground/70">
                创建于 {format(parseLocalDateTime(item.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <EditItemDialog
        item={item}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={onUpdate}
      />
    </>
  );
}