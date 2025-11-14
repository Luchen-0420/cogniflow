import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Calendar, Tag, ArrowRight, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlogEditorDialog } from '@/components/blog/BlogEditorDialog';
import { useAuth } from '@/db/apiAdapter';
import { itemApi } from '@/db/api';
import { toast } from 'sonner';
import { extractBlogMetadata } from '@/utils/ai';
import type { Item } from '@/types/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function BlogPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showEditor, setShowEditor] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [blogPosts, setBlogPosts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 从 API 加载博客列表
  const loadBlogs = async () => {
    try {
      setLoading(true);
      // 获取所有带有 '博客' 标签的笔记
      const items = await itemApi.getItems({ tag: '博客' });
      // 按创建时间降序排列（API 已经排序，但确保一下）
      const sortedItems = items.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setBlogPosts(sortedItems);
    } catch (error) {
      console.error('加载博客列表失败:', error);
      toast.error('加载博客列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleCreateBlog = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowEditor(true);
  };

  const handleSaveBlog = async (content: string) => {
    try {
      // 使用 AI 提取标题和描述
      const metadata = await extractBlogMetadata(content);
      
      // 创建笔记类型的条目，确保包含 '博客' 标签
      const tags = metadata.tags || [];
      if (!tags.includes('博客')) {
        tags.push('博客');
      }
      
      const newItem = await itemApi.createItem({
        raw_text: content,
        type: 'note',
        title: metadata.title || '未命名博客',
        description: metadata.description || content.slice(0, 200),
        tags: tags,
        priority: 'medium',
        status: 'pending',
      });

      if (newItem) {
        toast.success('博客已保存');
        // 重新加载博客列表
        await loadBlogs();
        return;
      } else {
        throw new Error('保存失败');
      }
    } catch (error: any) {
      console.error('保存博客失败:', error);
      throw error;
    }
  };

  const togglePost = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* 头部 */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            CogniFlow 博客
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-6">
            分享产品更新、使用技巧和最佳实践
          </p>
          <Button onClick={handleCreateBlog} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            写博客
          </Button>
        </div>

        {/* 博客列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {blogPosts.map((post) => {
              const isExpanded = expandedPosts.has(post.id);
              const postDate = format(new Date(post.created_at), 'yyyy-MM-dd', { locale: zhCN });
              // 过滤掉 '博客' 标签，因为所有博客都有这个标签
              const displayTags = post.tags.filter(tag => tag !== '博客');
              
              return (
                <Card 
                  key={post.id} 
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => togglePost(post.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 hover:text-primary transition-colors">
                          {post.title || '未命名博客'}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {post.description || post.raw_text.slice(0, 200)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isExpanded && post.raw_text && (
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap text-sm">{post.raw_text}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{postDate}</span>
                        </div>
                        {displayTags.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            <div className="flex gap-1.5 flex-wrap">
                              {displayTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePost(post.id);
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            收起
                          </>
                        ) : (
                          <>
                            阅读更多
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 提示信息 */}
        {!loading && blogPosts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">暂无博客文章</p>
              <Button onClick={handleCreateBlog} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                创建第一篇博客
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 返回首页 */}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link to="/">
              返回首页
            </Link>
          </Button>
        </div>
      </div>

      {/* 博客编辑器 */}
      {showEditor && (
        <BlogEditorDialog
          open={showEditor}
          onOpenChange={setShowEditor}
          onSave={handleSaveBlog}
        />
      )}
    </div>
  );
}

