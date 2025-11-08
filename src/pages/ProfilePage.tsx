/**
 * 用户个人资料页面
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, profileApi, userSettingsApi } from '@/db/api';
import { LocalStorageManager } from '@/services/localStorageManager';
import { toast } from 'sonner';
import { ArrowLeft, Save, Download, Upload, Trash2, RefreshCw, Eye, EyeOff, Key } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [personalApiKey, setPersonalApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiUsage, setApiUsage] = useState<{
    current: number;
    max: number;
    hasPersonalKey: boolean;
  } | null>(null);
  const [, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);

  // 当 user 对象变化时，更新 profileData
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // 加载用户数据和设置
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userSettings = await userSettingsApi.getSettings();
      setSettings(userSettings);
      
      // 获取完整的用户信息（包括手机号和API Key状态）
      try {
        const token = localStorage.getItem('cogniflow_auth_token');
        if (token) {
          // 从服务器获取用户信息
          const meResponse = await fetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (meResponse.ok) {
            const userData = await meResponse.json();
            // 更新 profileData 以显示已保存的信息
            setProfileData({
              username: userData.username || '',
              email: userData.email || '',
              phone: userData.phone || ''
            });
            
            // 如果用户有个人 API Key，显示掩码
            if (userData.has_personal_key) {
              setPersonalApiKey('••••••••••••••••••••••••••••••••');
            }
          }
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
      
      // 获取 API 使用情况（从服务器或本地）
      try {
        const response = await fetch('/api/users/api-usage', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('cogniflow_auth_token')}`
          }
        });
        if (response.ok) {
          const usage = await response.json();
          setApiUsage(usage);
          // 如果之前没有设置过 API Key 显示，这里再设置一次
          if (usage.hasPersonalKey && !personalApiKey) {
            setPersonalApiKey('••••••••••••••••••••••••••••••••');
          }
        }
      } catch (error) {
        console.error('获取API使用情况失败:', error);
        // 如果是本地模式，设置默认值
        setApiUsage({
          current: 0,
          max: 100,
          hasPersonalKey: false
        });
      }
      
      // 获取统计数据
      const userData = await LocalStorageManager.getUserData(user?.id || '');
      if (userData) {
        const itemStats = {
          totalItems: userData.items.length,
          todoItems: userData.items.filter(item => item.type === 'task' && item.status !== 'completed').length,
          completedItems: userData.items.filter(item => item.status === 'completed').length,
          noteItems: userData.items.filter(item => item.type === 'note' || item.type === 'data').length,  // 包含笔记和资料
          urlItems: userData.items.filter(item => item.type === 'url').length,
          tags: new Set(userData.items.flatMap(item => item.tags)).size
        };
        setStatsData(itemStats);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  };

  // 更新个人信息
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const success = await profileApi.updateProfile(profileData);
      if (success) {
        toast.success('个人信息更新成功');
      } else {
        toast.error('更新失败');
      }
    } catch (error) {
      console.error('更新个人信息失败:', error);
      toast.error('更新失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 导出个人数据
  const handleExportData = async () => {
    try {
      if (!user?.id) return;
      
      const exportData = await LocalStorageManager.exportUserData(user.id);
      if (exportData) {
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cogniflow-${user.username || user.id}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('个人数据导出成功');
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      toast.error('导出失败');
    }
  };

  // 清除个人数据
  const handleClearData = async () => {
    if (!confirm('确定要清除所有个人数据吗？此操作不可恢复！')) {
      return;
    }

    try {
      if (!user?.id) return;
      
      await LocalStorageManager.deleteUserData(user.id);
      toast.success('个人数据已清除');
      
      // 重新初始化用户数据
      await LocalStorageManager.initializeUserData(user.id);
      loadUserData();
    } catch (error) {
      console.error('清除数据失败:', error);
      toast.error('清除失败');
    }
  };

  // 删除账户
  const handleDeleteAccount = async () => {
    if (!confirm('确定要删除账户吗？此操作不可恢复！')) {
      return;
    }

    const confirmText = prompt('请输入 "DELETE" 确认删除账户:');
    if (confirmText !== 'DELETE') {
      toast.error('确认文本不正确');
      return;
    }

    try {
      if (!user?.id) return;
      
      // 删除用户数据
      await LocalStorageManager.deleteUserData(user.id);
      
      // 删除用户记录
      const users = await LocalStorageManager.getAllUsers();
      const updatedUsers = users.filter(u => u.id !== user.id);
      await LocalStorageManager.saveUsers(updatedUsers);
      
      // 登出
      logout();
      toast.success('账户已删除');
      navigate('/login');
    } catch (error) {
      console.error('删除账户失败:', error);
      toast.error('删除失败');
    }
  };

  const getUserInitials = () => {
    const name = profileData.username || profileData.email?.split('@')[0] || '用户';
    return name.slice(0, 2).toUpperCase();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>请先登录</p>
            <Button onClick={() => navigate('/login')} className="mt-4">
              去登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">个人资料</h1>
            <p className="text-muted-foreground">管理您的账户信息和设置</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基本信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 个人信息卡片 */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="" alt={profileData.username} />
                    <AvatarFallback className="text-lg">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>个人信息</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        注册时间: {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="设置用户名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="设置邮箱"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="设置手机号"
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? '保存中...' : '保存更改'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* API Key 配置 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    <CardTitle>API 配置</CardTitle>
                  </div>
                  {apiUsage?.hasPersonalKey && (
                    <Badge className="bg-green-500 text-white">
                      已配置个人 API
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API 使用统计 */}
                {apiUsage && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">API 调用次数</span>
                      {apiUsage.hasPersonalKey ? (
                        <Badge variant="outline" className="text-green-600">
                          无限制
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {apiUsage.current} / {apiUsage.max}
                        </span>
                      )}
                    </div>
                    {!apiUsage.hasPersonalKey && (
                      <>
                        <Progress 
                          value={(apiUsage.current / apiUsage.max) * 100} 
                          className="h-2"
                        />
                        <Alert>
                          <AlertDescription className="text-xs">
                            {apiUsage.current >= apiUsage.max ? (
                              <span className="text-red-600 font-medium">
                                ⚠️ 已达到使用限制，请配置个人 API Key 以继续使用
                              </span>
                            ) : (
                              <span>
                                剩余 {apiUsage.max - apiUsage.current} 次调用机会
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </div>
                )}

                <Separator />

                {/* API Key 输入 */}
                <div className="space-y-2">
                  <Label htmlFor="personalApiKey">
                    智谱 AI API Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="personalApiKey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="配置后将不受使用次数限制"
                      value={personalApiKey}
                      onChange={(e) => setPersonalApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {apiUsage?.hasPersonalKey ? (
                      <>
                        当前已配置 API Key。如需修改，请先删除现有密钥，然后输入新密钥。
                      </>
                    ) : (
                      <>
                        配置个人 API Key 后将不受调用次数限制。
                        <a 
                          href="https://open.bigmodel.cn/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline ml-1"
                        >
                          获取 API Key
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <Button 
                  onClick={async () => {
                    // 如果输入的是掩码，不发送请求
                    if (personalApiKey.startsWith('••••')) {
                      toast.info('API Key 未修改');
                      return;
                    }
                    
                    // 如果输入为空，提示用户
                    if (!personalApiKey.trim()) {
                      toast.error('请输入有效的 API Key');
                      return;
                    }
                    
                    setLoading(true);
                    try {
                      const response = await fetch('/api/users/api-key', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('cogniflow_auth_token')}`
                        },
                        body: JSON.stringify({ personalApiKey })
                      });

                      if (response.ok) {
                        toast.success('API Key 更新成功');
                        // 更新为掩码显示
                        setPersonalApiKey('••••••••••••••••••••••••••••••••');
                        await loadUserData();
                      } else {
                        const error = await response.json();
                        toast.error(error.error || 'API Key 更新失败');
                      }
                    } catch (error) {
                      console.error('更新 API Key 失败:', error);
                      toast.error('更新失败');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? '保存中...' : '保存 API Key'}
                </Button>

                {apiUsage?.hasPersonalKey && (
                  <Button 
                    onClick={async () => {
                      if (!confirm('确定要删除个人 API Key 吗？删除后将使用默认配额限制。')) {
                        return;
                      }
                      
                      setLoading(true);
                      try {
                        const response = await fetch('/api/users/api-key', {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('cogniflow_auth_token')}`
                          }
                        });

                        if (response.ok) {
                          toast.success('API Key 已删除');
                          setPersonalApiKey('');
                          await loadUserData();
                        } else {
                          toast.error('删除失败');
                        }
                      } catch (error) {
                        console.error('删除 API Key 失败:', error);
                        toast.error('删除失败');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除 API Key
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 数据管理 */}
            <Card>
              <CardHeader>
                <CardTitle>数据管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    导出个人数据
                  </Button>
                  <Button onClick={loadUserData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新数据
                  </Button>
                </div>
                
                <Separator />
                
                <Alert>
                  <AlertDescription>
                    导出功能将包含您的所有个人数据，包括笔记、任务、设置等。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* 危险操作 */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">危险操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleClearData} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除所有数据
                  </Button>
                  <Button onClick={handleDeleteAccount} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除账户
                  </Button>
                </div>
                
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>警告：</strong>这些操作不可恢复。清除数据将删除所有个人内容，删除账户将完全移除您的账户。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：统计信息 */}
          <div className="space-y-6">
            {statsData && (
              <Card>
                <CardHeader>
                  <CardTitle>数据统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">总条目</span>
                      <span className="font-semibold">{statsData.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">待办事项</span>
                      <span className="font-semibold">{statsData.todoItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">已完成</span>
                      <span className="font-semibold">{statsData.completedItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">笔记</span>
                      <span className="font-semibold">{statsData.noteItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">链接</span>
                      <span className="font-semibold">{statsData.urlItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">标签数</span>
                      <span className="font-semibold">{statsData.tags}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 快捷操作 */}
            <Card>
              <CardHeader>
                <CardTitle>快捷操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">

                {user.role === 'admin' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => navigate('/admin')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    系统管理
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => logout()}
                >
                  退出登录
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}