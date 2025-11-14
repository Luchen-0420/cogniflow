import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MDEditor from '@uiw/react-md-editor';
import { Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import rehypeSanitize from 'rehype-sanitize';
import type { Item } from '@/types/types';
import { itemApi } from '@/db/api';
import '@/components/blog/blog-editor.css';

interface NoteViewDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function NoteViewDialog({
  item,
  open,
  onOpenChange,
  onUpdate,
}: NoteViewDialogProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 初始化内容
  useEffect(() => {
    if (open) {
      setContent(item.raw_text || item.description || '');
    }
  }, [open, item]);

  // 处理保存
  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('内容不能为空');
      return;
    }

    setIsSaving(true);
    try {
      const success = await itemApi.updateItem(item.id, {
        raw_text: content,
        description: content.length > 200 ? content.slice(0, 200) + '...' : content,
      });

      if (success) {
        toast.success('保存成功');
        onUpdate?.();
        onOpenChange(false);
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (content !== (item.raw_text || item.description || '')) {
      if (confirm('内容已修改，确定要关闭吗？未保存的修改将丢失。')) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="note-view-container w-[95vw] !max-w-[1400px] h-[85vh] sm:h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              {item.title || '查看笔记'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSaving}
                className="h-8 sm:h-9"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">关闭</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                className="h-8 sm:h-9"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin sm:mr-1" />
                ) : (
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">保存</span>
                <span className="sm:hidden">保存</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-3 sm:px-6 pb-3 sm:pb-6">
          <div data-color-mode="auto" className="h-full w-full">
            <MDEditor
              value={content}
              onChange={(value) => setContent(value || '')}
              height="100%"
              preview="live"
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
              hideToolbar={false}
              enableScroll={true}
              visibleDragbar={false}
              textareaProps={{
                placeholder: '在这里编辑笔记内容...\n\n支持 Markdown 语法：\n- **粗体** 和 *斜体*\n- [链接](url)\n- ![图片](url)\n- 代码块\n- 列表\n- 等等...',
                wrap: 'soft',
                style: {
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                },
              }}
              className="shadow-sm border rounded-lg overflow-hidden"
              style={{
                minHeight: '100%',
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

