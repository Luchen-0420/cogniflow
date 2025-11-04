/**
 * 附件图片展示组件
 * 用于在卡片中优雅地展示附件图片
 */

import { useState, useEffect } from 'react';
import { Loader2, ImageIcon, ZoomIn } from 'lucide-react';
import { getItemAttachments, getAttachmentFileURL, type Attachment } from '@/utils/attachmentUtils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AttachmentImagesProps {
  itemId: string;
  className?: string;
  maxDisplay?: number; // 最多显示几张图片
  compact?: boolean; // 紧凑模式
}

export function AttachmentImages({ 
  itemId, 
  className,
  maxDisplay = 4,
  compact = false
}: AttachmentImagesProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAttachments();
  }, [itemId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await getItemAttachments(itemId);
      console.log(`[AttachmentImages] Item ${itemId}: API返回 ${data.length} 个附件`, data);
      
      // 只获取图片类型的附件
      const imageAttachments = data.filter(att => att.file_type === 'image');
      console.log(`[AttachmentImages] Item ${itemId}: 过滤后得到 ${imageAttachments.length} 个图片附件`, imageAttachments);
      
      setAttachments(imageAttachments);
    } catch (error) {
      console.error(`[AttachmentImages] Item ${itemId}: 加载附件失败:`, error);
      // 静默失败，不显示错误提示
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageLoad = (attachmentId: string) => {
    console.log(`[AttachmentImages] 图片加载成功: ${attachmentId}`);
    setLoadedImages(prev => new Set([...prev, attachmentId]));
  };

  const handleImageError = (attachmentId: string, attachment: Attachment) => {
    console.error(`[AttachmentImages] 图片加载失败: ${attachmentId}`, {
      filename: attachment.original_filename,
      url: getAttachmentFileURL(attachmentId)
    });
    setFailedImages(prev => new Set([...prev, attachmentId]));
  };

  if (loading) {
    return null; // 改为不显示加载状态，避免闪烁
  }

  if (attachments.length === 0) {
    console.log(`[AttachmentImages] Item ${itemId}: 没有图片附件，不渲染组件`);
    return null;
  }

  console.log(`[AttachmentImages] Item ${itemId}: 渲染 ${attachments.length} 张图片`);

  const displayAttachments = attachments.slice(0, maxDisplay);
  const remainingCount = attachments.length - maxDisplay;

  // 根据图片数量决定布局
  const getLayoutClass = () => {
    const count = displayAttachments.length;
    if (compact) {
      return 'grid grid-cols-4 gap-1';
    }
    if (count === 1) {
      return 'grid grid-cols-1';
    }
    if (count === 2) {
      return 'grid grid-cols-2 gap-2';
    }
    if (count === 3) {
      return 'grid grid-cols-3 gap-2';
    }
    return 'grid grid-cols-2 gap-2';
  };

  const getImageClass = () => {
    const count = displayAttachments.length;
    if (compact) {
      return 'aspect-square';
    }
    if (count === 1) {
      return 'aspect-video max-h-64';
    }
    return 'aspect-square';
  };

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {/* 图片网格 */}
        <div className={getLayoutClass()}>
          {displayAttachments.map((attachment, index) => {
            const imageUrl = getAttachmentFileURL(attachment.id);
            console.log(`[AttachmentImages] 渲染图片 ${index + 1}:`, {
              id: attachment.id,
              filename: attachment.original_filename,
              url: imageUrl
            });
            
            return (
            <div
              key={attachment.id}
              className={cn(
                'relative group overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer transition-all hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg',
                getImageClass()
              )}
              onClick={() => setPreviewImage(imageUrl)}
            >
              {/* 加载状态 */}
              {!loadedImages.has(attachment.id) && !failedImages.has(attachment.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {/* 加载失败 */}
              {failedImages.has(attachment.id) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                  <ImageIcon className="h-8 w-8 mb-1" />
                  <span className="text-xs">加载失败</span>
                </div>
              )}

              {/* 图片 */}
              <img
                src={getAttachmentFileURL(attachment.id)}
                alt={attachment.original_filename}
                className={cn(
                  'w-full h-full object-cover transition-all group-hover:scale-110',
                  !loadedImages.has(attachment.id) && 'invisible'
                )}
                onLoad={() => handleImageLoad(attachment.id)}
                onError={() => handleImageError(attachment.id, attachment)}
              />

              {/* 悬浮遮罩 */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* 显示剩余数量（最后一张图片） */}
              {index === displayAttachments.length - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    +{remainingCount}
                  </span>
                </div>
              )}

              {/* AI 描述提示 */}
              {attachment.ai_description && !compact && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs line-clamp-2">
                    {attachment.ai_description}
                  </p>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* AI 标签（非紧凑模式） */}
        {!compact && attachments.length > 0 && attachments[0].ai_tags && attachments[0].ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {attachments[0].ai_tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="预览"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
