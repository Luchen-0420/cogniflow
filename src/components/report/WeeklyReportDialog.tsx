import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Calendar, FileText, Save, Sparkles } from 'lucide-react';
import { itemApi, auth } from '@/db/api';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { generateSmartSummary } from '@/utils/ai';
import { checkApiUsageBeforeAction } from '@/services/apiUsageService';
import { cn } from '@/lib/utils';
import type { Item, SubItem } from '@/types/types';

interface WeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportCreated?: () => void;
}

export function WeeklyReportDialog({
  open,
  onOpenChange,
  onReportCreated,
}: WeeklyReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dailyReports, setDailyReports] = useState<Item[]>([]);
  const [weekRange, setWeekRange] = useState<{ start: Date; end: Date } | null>(null);
  const [summary, setSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载本周的日报数据
  useEffect(() => {
    if (open) {
      loadWeeklyData();
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // 周一开始
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // 周日结束
      
      setWeekRange({ start: weekStart, end: weekEnd });

      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');

      // 获取本周所有条目
      const allItems = await itemApi.getHistoryByDateRange(startDateStr, endDateStr);
      
      // 筛选出标签包含"日报"的卡片
      const reports = allItems.filter(
        (item: Item) => item.tags && item.tags.includes('日报')
      );

      // 按日期排序
      reports.sort((a: Item, b: Item) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setDailyReports(reports);

      // 如果有日报，自动生成总结
      if (reports.length > 0) {
        generateSummary(reports);
      } else {
        setSummary('');
      }
    } catch (error) {
      console.error('加载周报数据失败:', error);
      toast.error('加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (reports: Item[]) => {
    setGenerating(true);
    try {
      const usageCheck = await checkApiUsageBeforeAction('周报总结生成');
      if (!usageCheck.canProceed) {
        toast.error(usageCheck.message || 'API 使用次数已达上限');
        setGenerating(false);
        return;
      }

      // 准备日报内容用于 AI 总结
      const reportsContent = reports.map((report: Item) => {
        const date = format(parseISO(report.created_at), 'MM月dd日', { locale: zhCN });
        const subItems = (report.sub_items || []).map((item: SubItem) => 
          `- ${item.text} ${item.status === 'done' ? '✓' : ''}`
        ).join('\n');
        return `${date} ${report.title || '日报'}:\n${subItems}\n${report.description || ''}`;
      }).join('\n\n');

      const aiSummary = await generateSmartSummary(
        reports,
        '本周',
        {
          onProgress: (message, type) => {
            if (type === 'error') {
              toast.error(message);
            } else if (type === 'success') {
              toast.success(message);
            } else {
              toast.info(message);
            }
          }
        }
      );

      setSummary(aiSummary || '');
    } catch (error) {
      console.error('生成总结失败:', error);
      toast.error('生成总结失败，请重试');
      setSummary(''); // 失败时清空，用户可以手动输入
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!summary.trim()) {
      toast.error('请输入周报总结');
      return;
    }

    setSaving(true);
    try {
      const user = auth.getCurrentUser();
      if (!user) {
        toast.error('用户未登录');
        return;
      }

      const weekStartStr = weekRange 
        ? format(weekRange.start, 'yyyy年MM月dd日', { locale: zhCN })
        : '';
      const weekEndStr = weekRange 
        ? format(weekRange.end, 'MM月dd日', { locale: zhCN })
        : '';

      const reportIds = dailyReports.map((item: Item) => item.id);

      const weeklyReport = await itemApi.createItem({
        raw_text: summary,
        type: 'collection',
        title: `${weekStartStr} - ${weekEndStr} 工作周报`,
        description: summary.slice(0, 200),
        due_date: null,
        priority: 'medium',
        status: 'pending',
        tags: ['周报', '工作', '总结'],
        entities: {
          related_daily_reports: reportIds,
          week_start: weekRange?.start.toISOString(),
          week_end: weekRange?.end.toISOString(),
        },
        archived_at: null,
        url: null,
        url_title: null,
        url_summary: null,
        url_thumbnail: null,
        url_fetched_at: null,
        has_conflict: false,
        start_time: weekRange?.start.toISOString() || null,
        end_time: weekRange?.end.toISOString() || null,
        recurrence_rule: null,
        recurrence_end_date: null,
        master_item_id: null,
        is_master: false,
        collection_type: '周报',
        sub_items: dailyReports.map((report: Item, index) => ({
          id: `day-${index}`,
          text: format(parseISO(report.created_at), 'MM月dd日', { locale: zhCN }),
          status: 'done',
        })),
      });

      if (weeklyReport) {
        toast.success('周报已保存');
        onReportCreated?.();
        onOpenChange(false);
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error('保存周报失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 格式化日报内容显示
  const formatDailyReport = (report: Item) => {
    const subItems = (report.sub_items || []) as SubItem[];
    return subItems.map((item: SubItem) => ({
      text: item.text,
      done: item.status === 'done',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            本周工作周报
          </DialogTitle>
          <DialogDescription>
            {weekRange && (
              <span>
                {format(weekRange.start, 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
                {format(weekRange.end, 'yyyy年MM月dd日', { locale: zhCN })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">加载数据中...</span>
            </div>
          ) : dailyReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">本周暂无日报记录</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 横版排列的每天工作记录 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">每日工作记录</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dailyReports.map((report: Item) => {
                    const date = format(parseISO(report.created_at), 'MM月dd日', { locale: zhCN });
                    const weekday = format(parseISO(report.created_at), 'EEEE', { locale: zhCN });
                    const items = formatDailyReport(report);
                    
                    return (
                      <Card key={report.id} className="h-full">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-sm">{date}</div>
                              <div className="text-xs text-muted-foreground">{weekday}</div>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-2">
                            {items.length > 0 ? (
                              items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    'text-xs p-2 rounded',
                                    item.done
                                      ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 line-through'
                                      : 'bg-muted text-foreground'
                                  )}
                                >
                                  {item.text}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">暂无记录</p>
                            )}
                          </div>
                          {report.description && (
                            <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {report.description}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* AI 总结编辑区域 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI 周报总结
                  </h3>
                  <div className="flex gap-2">
                    {!isEditingSummary && summary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingSummary(true);
                          setTimeout(() => {
                            textareaRef.current?.focus();
                          }, 100);
                        }}
                      >
                        编辑
                      </Button>
                    )}
                    {generating && (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        生成中...
                      </Button>
                    )}
                    {!generating && dailyReports.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateSummary(dailyReports)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        重新生成
                      </Button>
                    )}
                  </div>
                </div>
                {isEditingSummary || !summary ? (
                  <Textarea
                    ref={textareaRef}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="输入或编辑周报总结..."
                    className="min-h-[200px] font-mono text-sm"
                    onBlur={() => {
                      if (summary.trim()) {
                        setIsEditingSummary(false);
                      }
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {summary}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving || !summary.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存周报
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
