import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Clock, Calendar, Save, Edit, AlertCircle } from 'lucide-react';
import type { Item, ItemType } from '@/types/types';
import { itemApi } from '@/db/api';

interface EditItemDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

/**
 * 将ISO时间字符串转换为本地时间字符串（用于datetime-local输入）
 */
const formatDateTimeLocal = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * 将datetime-local输入值转换为ISO字符串（不带时区偏移）
 */
const formatToISOWithoutTimezone = (dateTimeLocal: string): string => {
  // datetime-local格式: "2025-11-02T18:00"
  // 直接添加秒数，不进行时区转换
  return dateTimeLocal + ':00';
};

export default function EditItemDialog({ item, open, onOpenChange, onUpdate }: EditItemDialogProps) {
  const [formData, setFormData] = useState({
    title: item.title || '',
    description: item.description || '',
    type: item.type,
    priority: item.priority,
    start_time: item.start_time ? formatDateTimeLocal(item.start_time) : '',
    end_time: item.end_time ? formatDateTimeLocal(item.end_time) : '',
    due_date: item.due_date ? formatDateTimeLocal(item.due_date) : '',
    tags: item.tags.join(', ')
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setFormData({
      title: item.title || '',
      description: item.description || '',
      type: item.type,
      priority: item.priority,
      start_time: item.start_time ? formatDateTimeLocal(item.start_time) : '',
      end_time: item.end_time ? formatDateTimeLocal(item.end_time) : '',
      due_date: item.due_date ? formatDateTimeLocal(item.due_date) : '',
      tags: item.tags.join(', ')
    });
    setSaveStatus('idle');
    setLastSavedAt(null);
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setSaveStatus('saving');

    // 对于事件类型，如果设置了 due_date 但没有设置 end_time，将 end_time 设置为 due_date
    let endTime = formData.end_time ? formatToISOWithoutTimezone(formData.end_time) : null;
    const dueDate = formData.due_date ? formatToISOWithoutTimezone(formData.due_date) : null;
    
    // 如果是事件类型，且有开始时间和截止时间，但没有结束时间，使用截止时间作为结束时间
    if (formData.type === 'event' && formData.start_time && dueDate && !endTime) {
      endTime = dueDate;
    }

    const updates = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      priority: formData.priority,
      start_time: formData.start_time ? formatToISOWithoutTimezone(formData.start_time) : null,
      end_time: endTime,
      due_date: dueDate,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
      const success = await itemApi.updateItem(item.id, updates);

      if (success) {
        setSaveStatus('success');
        setLastSavedAt(new Date());
        toast.success('已保存到数据库');
        
        // 如果是事件类型且更新了时间信息，提示可能需要重新检测冲突
        if (formData.type === 'event' && (updates.start_time || updates.end_time || updates.due_date)) {
          console.log('事件时间已更新，将重新检测时间冲突');
        }
        
        // 延迟关闭对话框，让用户看到成功状态
        setTimeout(() => {
          onOpenChange(false);
          onUpdate?.(); // 这会触发数据刷新，后端应该已经重新检测了冲突
        }, 800);
      } else {
        setSaveStatus('error');
        toast.error('保存失败，请重试');
      }
    } catch (error) {
      console.error('保存失败:', error);
      setSaveStatus('error');
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Edit className="h-5 w-5" />
            编辑条目
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
              <span>标题</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="输入标题"
              className="h-10"
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="输入描述"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* 类型和优先级 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as ItemType })}
              >
                <SelectTrigger id="type" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">任务</SelectItem>
                  <SelectItem value="event">日程</SelectItem>
                  <SelectItem value="note">笔记</SelectItem>
                  <SelectItem value="data">资料</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">优先级</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 时间设置 */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">时间设置</Label>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  开始时间
                </Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  结束时间
                </Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  截止时间
                </Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium">标签</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="标签1, 标签2, 标签3"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">多个标签请用逗号分隔</p>
          </div>

          {/* 同步状态显示 */}
          {(saveStatus !== 'idle' || lastSavedAt) && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md border">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-muted-foreground">正在同步到数据库...</span>
                </>
              )}
              {saveStatus === 'success' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">已同步到数据库</span>
                  {lastSavedAt && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {lastSavedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">同步失败，请重试</span>
                </>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="h-10 min-w-[100px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
