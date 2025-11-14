import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Calendar, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlogEditorDialog } from '@/components/blog/BlogEditorDialog';
import { useAuth } from '@/db/apiAdapter';

export default function BlogPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showEditor, setShowEditor] = useState(false);

  // 示例博客文章（实际应该从 API 获取）
  const blogPosts = [
    {
      id: '1',
      title: 'CogniFlow v0.1.0 正式发布',
      description: '全新的 AI 驱动信息工作台，支持多种卡片类型和智能分析',
      date: '2025-01-15',
      tags: ['发布', '新功能'],
    },
    {
      id: '2',
      title: '智能模板功能详解',
      description: '如何使用智能模板快速创建任务、日程和笔记',
      date: '2025-01-10',
      tags: ['功能', '教程'],
    },
    {
      id: '3',
      title: 'PostgreSQL 部署指南',
      description: '详细的生产环境部署步骤和配置说明',
      date: '2025-01-05',
      tags: ['部署', '教程'],
    },
  ];

  const handleCreateBlog = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowEditor(true);
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
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2 hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {post.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <div className="flex gap-1.5 flex-wrap">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    阅读更多
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 提示信息 */}
        {blogPosts.length === 0 && (
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
        />
      )}
    </div>
  );
}

