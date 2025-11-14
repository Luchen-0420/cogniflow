import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RelatedItem {
  id: string;
  title: string;
  createdAt: string;
  summary: string;
  relevance: number;
}

export interface GapAnalysis {
  completeness: {
    score: number;
    gaps: Array<{ type: string; description: string; priority: string }>;
  };
  timeliness: {
    latestDate: string;
    needsUpdate: boolean;
    reason: string;
  };
  suggestions: Array<{ action: string; details: string }>;
  outline: string[];
}

export interface ExternalRecommendation {
  title: string;
  url: string;
  reason: string;
  type: string;
}

interface SmartInputAssistantProps {
  visible: boolean;
  loading: boolean;
  topic: string;
  relatedItems: RelatedItem[];
  gapAnalysis?: GapAnalysis;
  recommendations?: ExternalRecommendation[];
  onClose: () => void;
  onLoadItem: (id: string) => void;
  onPreviewItem: (id: string) => void;
  onGenerateOutline: () => void;
  onCreateSubTasks: () => void;
  onAddRecommendation: (url: string) => void;
}

export const SmartInputAssistant: React.FC<SmartInputAssistantProps> = ({
  visible,
  loading,
  topic,
  relatedItems,
  gapAnalysis,
  recommendations,
  onClose,
  onLoadItem,
  onPreviewItem,
  onGenerateOutline,
  onCreateSubTasks,
  onAddRecommendation,
}) => {
  // ESC 键关闭侧边栏
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <>
      {/* 移动端遮罩层（仅在移动端显示） */}
      {visible && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-[540px] z-50",
          "bg-background border-l shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          visible ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* 头部 */}
          <div className="flex-shrink-0 border-b p-4 bg-background">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                🔍 智能助手
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              正在分析「{topic}」...
            </div>
          </div>

          {/* 内容区域 - 确保可以滚动 */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">正在加载...</span>
              </div>
            )}
            
            <div className="space-y-6">
              {/* 历史关联 */}
              <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            📚 历史关联 
            <span className="text-sm font-normal text-muted-foreground">
              ({relatedItems.length})
            </span>
          </h3>
          {relatedItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              暂无相关历史资料
            </div>
          ) : (
            <div className="space-y-3">
              {relatedItems.map(item => (
                <div key={item.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium mb-1">{item.title}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {item.createdAt} | 相关度 {item.relevance}%
                  </div>
                  <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.summary}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onLoadItem(item.id)}
                    >
                      加载
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onPreviewItem(item.id)}
                    >
                      预览
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
            {/* 缺口分析 */}
            {gapAnalysis && (
              <section>
            <h3 className="text-lg font-semibold mb-3">💡 缺口分析</h3>
            <div className="p-4 bg-muted/50 rounded-lg mb-3">
              <div className="text-sm mb-2">
                <span className="font-medium">知识完整度：</span>
                <span className="text-primary font-semibold">{gapAnalysis.completeness.score}/100</span>
              </div>
              {gapAnalysis.completeness.gaps.length > 0 && (
                <div className="mt-3 space-y-2">
                  {gapAnalysis.completeness.gaps.map((gap, idx) => (
                    <div 
                      key={idx} 
                      className={`text-sm ${
                        gap.priority === 'high' 
                          ? 'text-destructive' 
                          : gap.priority === 'medium'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      • {gap.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-3">
              <div className="text-sm font-medium mb-1">⏰ 时效性提醒</div>
              <div className="text-sm text-muted-foreground">
                {gapAnalysis.timeliness.reason}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                size="sm" 
                onClick={onGenerateOutline}
                disabled={!gapAnalysis.outline || gapAnalysis.outline.length === 0}
              >
                生成调研大纲
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onCreateSubTasks}
                disabled={!gapAnalysis.suggestions || gapAnalysis.suggestions.length === 0}
              >
                创建子任务
              </Button>
            </div>
          </section>
        )}
        
            {/* 外部推荐 */}
            {recommendations && recommendations.length > 0 && (
              <section>
            <h3 className="text-lg font-semibold mb-3">
              🌐 推荐资料 
              <span className="text-sm font-normal text-muted-foreground">
                ({recommendations.length})
              </span>
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">
                    • {rec.title} 
                    <span className="text-xs text-muted-foreground ml-2">[{rec.type}]</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    理由：{rec.reason}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // 在新标签页打开
                        window.open(rec.url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      打开
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onAddRecommendation(rec.url)}
                    >
                      添加到资料库
                    </Button>
                  </div>
                </div>
              ))}
              </div>
              </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
