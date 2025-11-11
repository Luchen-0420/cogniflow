import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MDEditor from '@uiw/react-md-editor';
import { Save, X, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import rehypeSanitize from 'rehype-sanitize';
import './blog-editor.css';

interface BlogEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string) => void;
  initialContent?: string;
}

export function BlogEditorDialog({
  open,
  onOpenChange,
  onSave,
  initialContent = '',
}: BlogEditorDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化内容
  useEffect(() => {
    if (open) {
      setContent(initialContent || '# 标题\n\n在这里开始写作...\n\n');
    }
  }, [open, initialContent]);

  // 实时自动保存到 localStorage
  const autoSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('blog_draft', newContent);
        setLastSaved(new Date());
        console.log('📝 草稿已自动保存');
      } catch (error) {
        console.error('自动保存失败:', error);
      }
    }, 1000); // 1秒后保存
  }, []);

  // 处理内容变化
  const handleContentChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    autoSave(newContent);
  };

  // 加载草稿
  useEffect(() => {
    if (open && !initialContent) {
      try {
        const draft = localStorage.getItem('blog_draft');
        if (draft) {
          setContent(draft);
          toast.info('已加载上次的草稿');
        }
      } catch (error) {
        console.error('加载草稿失败:', error);
      }
    }
  }, [open, initialContent]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 处理保存
  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('内容不能为空');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(content);
      // 清除草稿
      localStorage.removeItem('blog_draft');
      toast.success('文章已保存到笔记卡片');
      onOpenChange(false);
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (content.trim() && content !== initialContent) {
      // 保存到草稿
      localStorage.setItem('blog_draft', content);
      toast.info('草稿已保存');
    }
    onOpenChange(false);
  };

  // 获取字数统计
  const wordCount = content.replace(/[#*`\->\[\]()]/g, '').trim().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="blog-editor-container w-[95vw] !max-w-[1400px] h-[85vh] sm:h-[90vh] flex flex-col p-0 gap-0 sm:!max-w-[1400px]">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg sm:text-2xl flex items-center gap-2">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                <span className="truncate">博客编辑器</span>
              </DialogTitle>
              <DialogDescription className="mt-1 sm:mt-2 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="hidden sm:inline">支持 Markdown 语法，实时预览</span>
                <span className="text-xs">
                  字数: {wordCount}
                </span>
                {lastSaved && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    ✓ 已保存 {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
                <span className="hidden sm:inline">保存并归类</span>
                <span className="sm:hidden">保存</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-3 sm:px-6 pb-3 sm:pb-6">
          <div data-color-mode="auto" className="h-full w-full">
            <MDEditor
              value={content}
              onChange={handleContentChange}
              height="100%"
              preview="live"
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
              hideToolbar={false}
              enableScroll={true}
              visibleDragbar={false}
              textareaProps={{
                placeholder: '# 标题\n\n在这里开始写作...\n\n支持 Markdown 语法：\n- **粗体** 和 *斜体*\n- [链接](url)\n- ![图片](url)\n- 代码块\n- 列表\n- 等等...',
              }}
              className="shadow-sm border rounded-lg overflow-hidden"
              style={{
                minHeight: '100%',
              }}
            />
          </div>
        </div>

        <div className="px-3 sm:px-6 py-2 sm:py-3 border-t bg-muted/30 shrink-0">
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            💡 提示: 编辑器自动保存草稿。点击"保存"后，AI 会自动提取标题和标签。
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
