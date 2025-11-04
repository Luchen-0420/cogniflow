import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Archive, ArchiveRestore, Trash2, ExternalLink, Globe, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Item } from '@/types/types';
import { itemApi } from '@/db/api';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import EditItemDialog from './EditItemDialog';
import { generateURLSummary } from '@/utils/urlProcessor';
import { AttachmentImages } from '@/components/attachments/AttachmentImages';

interface URLCardProps {
  item: Item;
  onUpdate?: () => void;
}

export default function URLCard({ item, onUpdate }: URLCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [localSummary, setLocalSummary] = useState(item.url_summary);
  const isArchived = item.archived_at !== null;

  useEffect(() => {
    setLocalSummary(item.url_summary);
  }, [item.url_summary]);

  const handleArchive = async () => {
    if (isArchived) {
      const success = await itemApi.unarchiveItem(item.id);
      if (success) {
        toast.success('已恢复');
        onUpdate?.();
      } else {
        toast.error('恢复失败');
      }
    } else {
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
    if (!confirm('确定要删除这条链接吗?')) return;

    const success = await itemApi.deleteItem(item.id);
    if (success) {
      toast.success('已删除');
      onUpdate?.();
    } else {
      toast.error('删除失败');
    }
  };

  const handleGenerateSummary = async () => {
    if (!item.url) return;

    setGeneratingSummary(true);
    try {
      const summary = await generateURLSummary(
        item.url,
        item.url_title || item.title || '链接',
        item.raw_text
      );
      
      setLocalSummary(summary);
      
      // 更新到数据库
      const success = await itemApi.updateItem(item.id, {
        url_summary: summary
      });

      if (success) {
        toast.success('梗概已生成');
        onUpdate?.();
      }
    } catch (error) {
      console.error('生成梗概失败:', error);
      toast.error('生成梗概失败，请重试');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const openURL = () => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  // 提取域名
  const getDomain = (url: string | null) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const domain = getDomain(item.url);

  return (
    <>
      <Card className={`
        group relative max-w-3xl
        hover:shadow-xl hover:scale-[1.02]
        transition-all duration-300 ease-out
        border-2 border-cyan-200 dark:border-cyan-800
        bg-gradient-to-br from-cyan-50/50 via-white to-blue-50/30
        dark:from-cyan-950/30 dark:via-gray-900 dark:to-blue-950/20
        backdrop-blur-sm
        overflow-hidden
      `}>
        {/* 装饰性渐变条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
        
        {/* 悬浮操作按钮 */}
        <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 flex gap-1 z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm"
            onClick={() => setIsEditOpen(true)}
            title="编辑"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm"
            onClick={handleArchive}
            title={isArchived ? "恢复" : "归档"}
          >
            {isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shadow-sm"
            onClick={handleDelete}
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>

        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-4">
            {/* 左侧：缩略图/图标 */}
            <div className="flex-shrink-0">
              {item.url_thumbnail ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-cyan-200 dark:border-cyan-700 shadow-md bg-white dark:bg-gray-800">
                  <img
                    src={item.url_thumbnail}
                    alt={item.url_title || '链接缩略图'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 图片加载失败时显示默认图标
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLElement).parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900">
                          <svg class="w-10 h-10 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-cyan-200 dark:border-cyan-700 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 flex items-center justify-center shadow-md">
                  <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-600 dark:text-cyan-400" />
                </div>
              )}
            </div>

            {/* 右侧：内容信息 */}
            <div className="flex-1 min-w-0 pr-20 sm:pr-24">
              {/* 标题和域名 */}
              <div className="mb-2">
                <h3 
                  className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  onClick={openURL}
                  title={item.url_title || item.title || '链接'}
                >
                  {item.url_title || item.title || '网页链接'}
                </h3>
                
                {domain && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Globe className="h-3 w-3" />
                    <span className="font-medium">{domain}</span>
                  </div>
                )}
              </div>

              {/* AI 梗概 */}
              <div className="mb-3">
                {localSummary ? (
                  <div className="relative">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                      {localSummary}
                    </p>
                    <div className="absolute -top-1 -left-1">
                      <Sparkles className="h-3 w-3 text-cyan-500 dark:text-cyan-400" />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                    className="text-xs gap-1.5 h-7 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                  >
                    {generatingSummary ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        生成梗概
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* URL 和操作按钮 */}
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openURL}
                  className="text-xs gap-1.5 h-7 flex-shrink-0 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                >
                  <ExternalLink className="h-3 w-3" />
                  访问链接
                </Button>
                
                {item.url && (
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate flex-1 font-mono">
                    {item.url}
                  </p>
                )}
              </div>

              {/* 标签 */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs px-2 py-0 font-normal border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 bg-cyan-50/50 dark:bg-cyan-950/20"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 附件图片展示 */}
              <div className="mb-3">
                <AttachmentImages itemId={item.id} maxDisplay={3} />
              </div>

              {/* 时间戳 */}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
                <span>
                  {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </span>
                {item.url_fetched_at && (
                  <>
                    <span>·</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            已抓取
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            抓取时间: {format(new Date(item.url_fetched_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditItemDialog
        item={item}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}
