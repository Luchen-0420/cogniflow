import { Link } from 'react-router-dom';
import { BookOpen, FileText, Rocket, Settings, Code, Database, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DocsPage() {
  const docCategories = [
    {
      title: '快速开始',
      description: '新用户入门指南，快速部署和配置',
      icon: Rocket,
      links: [
        { name: '快速开始', path: '/docs/quickstart/QUICK_START.md' },
        { name: '启动指南', path: '/docs/quickstart/STARTUP_GUIDE.md' },
        { name: 'PostgreSQL 快速开始', path: '/docs/quickstart/QUICKSTART_POSTGRES.md' },
      ],
    },
    {
      title: '用户指南',
      description: '完整的功能使用说明和操作指南',
      icon: FileText,
      links: [
        { name: '用户手册', path: '/docs/user-guide/USER_MANUAL.md' },
        { name: '界面指南', path: '/docs/user-guide/USER_INTERFACE_GUIDE.md' },
        { name: '用户系统指南', path: '/docs/user-guide/USER_SYSTEM_GUIDE.md' },
      ],
    },
    {
      title: '开发文档',
      description: '开发者文档、架构说明和开发指南',
      icon: Code,
      links: [
        { name: '开发指南', path: '/docs/development/DEVELOPER_GUIDE.md' },
        { name: '数据库指南', path: '/docs/development/DATABASE_GUIDE.md' },
        { name: '测试指南', path: '/docs/development/TESTING_GUIDE.md' },
      ],
    },
    {
      title: '部署文档',
      description: '生产环境部署、安全配置和运维指南',
      icon: Settings,
      links: [
        { name: '部署指南', path: '/docs/deployment/DEPLOYMENT_GUIDE.md' },
        { name: '数据库部署', path: '/docs/deployment/DATABASE_DEPLOYMENT_GUIDE.md' },
        { name: '安全指南', path: '/docs/deployment/SECURITY_GUIDE.md' },
      ],
    },
    {
      title: '功能说明',
      description: '核心功能详细说明和使用技巧',
      icon: BookOpen,
      links: [
        { name: '智能模板', path: '/docs/features/SMART_TEMPLATES.md' },
        { name: '冲突检测', path: '/docs/features/CONFLICT_DETECTION.md' },
        { name: '自动备份', path: '/docs/features/AUTO_BACKUP.md' },
      ],
    },
    {
      title: '配置说明',
      description: 'API 配置、环境变量和系统参数',
      icon: Database,
      links: [
        { name: 'GLM API 配置', path: '/docs/configuration/GLM_SETUP.md' },
        { name: '环境变量', path: '/docs/configuration/ENVIRONMENT.md' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* 头部 */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            CogniFlow 文档中心
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            完整的文档导航，帮助您快速上手和使用 CogniFlow
          </p>
        </div>

        {/* 文档分类 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {docCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.links.map((link) => (
                      <a
                        key={link.name}
                        href={`https://github.com/your-repo/cogniflow/blob/main${link.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        {link.name} →
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 快速链接 */}
        <div className="mt-8 sm:mt-12 text-center">
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                更多文档和更新，请访问：
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <a
                    href="https://github.com/your-repo/cogniflow"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    GitHub 仓库
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">
                    返回首页
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

