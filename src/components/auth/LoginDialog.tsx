/**
 * 登录弹窗组件
 * 用于在未登录用户首次交互时提示登录
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/db/apiAdapter';
import type { LoginUserData, RegisterUserData } from '@/db/localAuth';
import { toast } from 'sonner';
import { Eye, EyeOff, Cloud, Zap } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginDialog({ open, onOpenChange, onSuccess }: LoginDialogProps) {
  const [loginForm, setLoginForm] = useState<LoginUserData>({
    username: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState<RegisterUserData>({
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { loginWithPassword, register } = useAuth();

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
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
      toast.success('登录成功！');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('登录失败:', error);
      const errorMessage = error instanceof Error ? error.message : '登录失败，请重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 处理快速体验（创建临时账号）
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
        description: `用户名：${username}\n密码：${password}\n请妥善保存以便下次登录`
      });
      
      onOpenChange(false);
      onSuccess?.();
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

  // 处理注册输入变化
  const handleRegisterInputChange = (field: keyof RegisterUserData, value: string) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 表单验证
  const validateRegisterForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 用户名验证
    if (!registerForm.username) {
      newErrors.username = '请输入用户名';
    } else if (registerForm.username.length < 3) {
      newErrors.username = '用户名至少需要3个字符';
    } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(registerForm.username)) {
      newErrors.username = '用户名只能包含字母、数字、下划线和中文';
    }

    // 邮箱验证
    if (!registerForm.email) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    // 手机号验证（可选）
    if (registerForm.phone && !/^1[3-9]\d{9}$/.test(registerForm.phone)) {
      newErrors.phone = '请输入有效的手机号';
    }

    // 密码验证
    if (!registerForm.password) {
      newErrors.password = '请输入密码';
    } else if (registerForm.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(registerForm.password)) {
      newErrors.password = '密码需要包含字母和数字';
    }

    // 确认密码验证
    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (confirmPassword !== registerForm.password) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) {
      return;
    }

    setLoading(true);
    try {
      await register(registerForm);
      toast.success('注册成功！');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('注册失败:', error);
      const errorMessage = error instanceof Error ? error.message : '注册失败，请重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">欢迎使用 CogniFlow</DialogTitle>
          <DialogDescription className="text-center">
            智能流笔记 - 你只管记录，我负责管理
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* 登录 */}
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-username">用户名或邮箱</Label>
                <Input
                  id="dialog-username"
                  type="text"
                  placeholder="请输入用户名或邮箱"
                  value={loginForm.username || loginForm.email || ''}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dialog-password">密码</Label>
                <div className="relative">
                  <Input
                    id="dialog-password"
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
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                <Cloud className="mr-2 h-4 w-4" />
                {loading ? '登录中...' : '登录并同步数据'}
              </Button>
            </form>

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

            <div className="space-y-1">
              <p className="text-xs text-center text-muted-foreground">
                登录后可在多设备间同步您的笔记数据
              </p>
              <p className="text-[10px] text-center text-muted-foreground/70">
                * 注册用户可使用 100 次 AI 功能，快捷登录用户可使用 50 次
              </p>
            </div>
          </TabsContent>

          {/* 注册 */}
          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username">用户名 *</Label>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="请输入用户名（至少3个字符）"
                  value={registerForm.username}
                  onChange={(e) => handleRegisterInputChange('username', e.target.value)}
                  disabled={loading}
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">邮箱 *</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="请输入邮箱"
                  value={registerForm.email}
                  onChange={(e) => handleRegisterInputChange('email', e.target.value)}
                  disabled={loading}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone">手机号（可选）</Label>
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={registerForm.phone || ''}
                  onChange={(e) => handleRegisterInputChange('phone', e.target.value)}
                  disabled={loading}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">密码 *</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码（至少6位，包含字母和数字）"
                    value={registerForm.password}
                    onChange={(e) => handleRegisterInputChange('password', e.target.value)}
                    disabled={loading}
                    className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">确认密码 *</Label>
                <div className="relative">
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    disabled={loading}
                    className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? '注册中...' : '注册'}
              </Button>

              <div className="space-y-1">
                <p className="text-xs text-center text-muted-foreground">
                  注册后即可在多设备间同步您的笔记数据
                </p>
                <p className="text-[10px] text-center text-muted-foreground/70">
                  * 注册用户可使用 100 次 AI 功能（包括卡片记录和智能报告）
                </p>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
