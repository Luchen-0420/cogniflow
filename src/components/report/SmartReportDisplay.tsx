import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check, Download, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SmartReportDisplayProps {
  content: string;
  className?: string;
}

export default function SmartReportDisplay({ content, className }: SmartReportDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败，请重试');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `智能报告_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('报告已下载');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 操作按钮栏 */}
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            AI 生成报告
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">下载</span>
          </Button>
          <Button
            variant={copied ? "default" : "outline"}
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">复制</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 报告内容 */}
      <Card className="p-6 sm:p-8 bg-card border-2 shadow-lg">
        <div className="markdown-report prose prose-gray dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 标题样式
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-foreground mb-6 pb-3 border-b-2 border-primary">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-lg font-semibold text-foreground mt-4 mb-2">
                  {children}
                </h4>
              ),
              // 段落样式
              p: ({ children }) => (
                <p className="text-card-foreground leading-relaxed mb-4">
                  {children}
                </p>
              ),
              // 列表样式
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-4 text-card-foreground">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-2 mb-4 text-card-foreground">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="ml-4 pl-2">
                  {children}
                </li>
              ),
              // 表格样式
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="min-w-full divide-y divide-border border border-border rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted">
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-border bg-card">
                  {children}
                </tbody>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-sm text-card-foreground">
                  {children}
                </td>
              ),
              // 引用样式
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary/5 italic text-card-foreground">
                  {children}
                </blockquote>
              ),
              // 代码块样式
              code: ({ className, children }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 bg-muted text-primary rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block px-4 py-3 bg-muted text-foreground rounded-lg overflow-x-auto text-sm font-mono">
                    {children}
                  </code>
                );
              },
              // 分隔线样式
              hr: () => (
                <hr className="my-8 border-t-2 border-border" />
              ),
              // 强调样式
              strong: ({ children }) => (
                <strong className="font-bold text-foreground">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic text-foreground">
                  {children}
                </em>
              ),
              // 链接样式
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline decoration-dotted"
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </Card>

      {/* 底部提示 */}
      <div className="flex items-center justify-center text-xs text-muted-foreground">
        <span>💡 由 CogniFlow AI 智能生成 · {new Date().toLocaleString('zh-CN')}</span>
      </div>
    </div>
  );
}
