/**
 * 附件展示组件
 * 用于在ItemCard等地方展示附件列表
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  getItemAttachments,
  deleteAttachment,
  getAttachmentFileURL,
  formatFileSize,
  getFileIcon,
  type Attachment,
} from '@/utils/attachmentUtils';

interface AttachmentListProps {
  itemId: string;
  onDelete?: () => void;
}

export function AttachmentList({ itemId, onDelete }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [itemId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await getItemAttachments(itemId);
      setAttachments(data);
    } catch (error) {
      console.error('加载附件失败:', error);
      toast.error('加载附件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('确定要删除这个附件吗？')) {
      return;
    }

    try {
      setDeletingId(attachmentId);
      await deleteAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success('附件已删除');
      onDelete?.();
    } catch (error: any) {
      console.error('删除附件失败:', error);
      toast.error(error.message || '删除附件失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const url = getAttachmentFileURL(attachment.id);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        附件 ({attachments.length})
      </div>
      
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            {/* 文件图标/预览 */}
            {attachment.file_type === 'image' && attachment.thumbnail_path ? (
              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                <img
                  src={getAttachmentFileURL(attachment.id)}
                  alt={attachment.original_filename}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handleDownload(attachment)}
                />
              </div>
            ) : (
              <div className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                {getFileIcon(attachment.mime_type)}
              </div>
            )}

            {/* 文件信息 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {attachment.original_filename}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{formatFileSize(attachment.file_size)}</span>
                {attachment.ai_description && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[200px]" title={attachment.ai_description}>
                      {attachment.ai_description}
                    </span>
                  </>
                )}
              </div>
              {attachment.ai_tags && attachment.ai_tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {attachment.ai_tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(attachment)}
                className="h-8 w-8 p-0"
              >
                {attachment.file_type === 'image' ? (
                  <ExternalLink className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(attachment.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                disabled={deletingId === attachment.id}
              >
                {deletingId === attachment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
