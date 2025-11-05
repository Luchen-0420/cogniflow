/**
 * 本地登录面板组件
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/db/apiAdapter';
import type { LoginUserData } from '@/db/localAuth';
import { RegisterPanel } from './RegisterPanel';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap } from 'lucide-react';

interface LocalLoginPanelProps {
  title?: string;
  desc?: string;
  privacyPolicyUrl?: string;
  userPolicyUrl?: string;
  showPolicy?: string;
  policyPrefix?: string;
}

export function LocalLoginPanel({
  title = 'CogniFlow',
  desc = '智能流笔记 - 你只管记录,我负责管理',
  privacyPolicyUrl,
  userPolicyUrl,
  showPolicy,
  policyPrefix
}: LocalLoginPanelProps) {
  // 登录表单状态
  const [loginForm, setLoginForm] = useState<LoginUserData>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'password' | 'register'>('password');

  const { loginWithPassword, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 如果已经登录，直接跳转到首页
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // 密码登录处理
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.username && !loginForm.email) {
      toast.error('请输入用户名或邮箱');
      return;
    }

    if (!loginForm.password) {
      toast.error('请输入密码');
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(loginForm);
      toast.success('登录成功');
      navigate('/');
    } catch (error) {
      console.error('登录失败:', error);
      const errorMessage = error instanceof Error ? error.message : '登录失败，请重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 快速体验（创建临时账号）
  const handleQuickExperience = async () => {
    setLoading(true);
    try {
      // 生成随机用户名和密码
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const username = `guest_${timestamp}_${randomStr}`;
      const password = `${randomStr}${timestamp}`;
      
      // 注册临时账号
      await register({
        username,
        password,
        email: ''
      });
      
      toast.success('体验账号创建成功！', {
        description: `用户名：${username}\n密码：${password}\n请妥善保存以便下次登录`,
        duration: 8000
      });
      
      navigate('/');
    } catch (error) {
      console.error('创建体验账号失败:', error);
      toast.error('创建体验账号失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof LoginUserData, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* 密码登录 */}
          <TabsContent value="password" className="space-y-4">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">用户名</Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="请输入用户名"
                  value={loginForm.username || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">或</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={handleQuickExperience}
              >
                <Zap className="mr-2 h-4 w-4" />
                {loading ? '创建中...' : '快速体验（自动创建账号）'}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-2">
                快速体验将自动创建一个临时账号，请保存好账号信息
              </p>
            </form>
          </TabsContent>

          {/* 注册 */}
          <TabsContent value="register" className="space-y-4">
            <RegisterPanel 
              onBackToLogin={() => setActiveTab('password')}
            />
          </TabsContent>
        </Tabs>

        {showPolicy === 'true' && (privacyPolicyUrl || userPolicyUrl) && (
          <div className="text-xs text-muted-foreground text-center mt-4">
            {policyPrefix && <span>{policyPrefix} </span>}
            {privacyPolicyUrl && (
              <a
                href={privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                隐私政策
              </a>
            )}
            {privacyPolicyUrl && userPolicyUrl && <span> 和 </span>}
            {userPolicyUrl && (
              <a
                href={userPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                用户协议
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}