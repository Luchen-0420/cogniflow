import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { useAuth } from '@/db/apiAdapter';
import { 
  getMessages, 
  getMessage,
  createMessage, 
  toggleReaction, 
  getUserReaction,
  deleteMessage,
  type Message 
} from '@/services/messageApi';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Send, 
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react';

export default function MessageBoardPage() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Record<string, 'like' | 'dislike' | null>>({});
  
  // 检查是否真的已登录（双重检查：hook 状态 + localStorage）
  const checkAuthenticated = () => {
    // 优先检查 localStorage，因为这是最可靠的
    const token = localStorage.getItem('cogniflow_auth_token');
    const userStr = localStorage.getItem('cogniflow_current_user');
    
    // 如果有 token 和 user，说明已登录（即使 hook 状态还没更新）
    if (token && userStr) {
      return true;
    }
    
    // 如果 localStorage 没有，再检查 hook 状态
    return isAuthenticated;
  };

  // 加载留言列表
  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await getMessages(1, 50);
      setMessages(response.messages);
      
      // 加载用户反应状态
      if (isAuthenticated) {
        const reactionPromises = response.messages.map(async (msg) => {
          const reaction = await getUserReaction(msg.id);
          return { id: msg.id, reaction: reaction.reaction_type };
        });
        const reactionResults = await Promise.all(reactionPromises);
        const reactionMap: Record<string, 'like' | 'dislike' | null> = {};
        reactionResults.forEach(({ id, reaction }) => {
          reactionMap[id] = reaction;
        });
        setReactions(reactionMap);
      }
    } catch (error) {
      console.error('加载留言失败:', error);
      toast.error('加载留言失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [isAuthenticated]);

  // 提交留言
  const handleSubmit = async () => {
    if (!newMessage.trim()) {
      toast.error('请输入留言内容');
      return;
    }

    // 先检查登录状态
    if (!checkAuthenticated()) {
      toast.info('请先登录后再发布留言');
      setShowLoginDialog(true);
      return;
    }

    try {
      setSubmitting(true);
      await createMessage(newMessage);
      toast.success('留言发布成功');
      setNewMessage('');
      await loadMessages();
    } catch (error: any) {
      console.error('发布留言失败:', error);
      // 检查是否是认证错误（401未授权）或用户不存在（404）
      if (error.message.includes('未登录') || 
          error.message.includes('401') || 
          error.message.includes('未授权') ||
          error.message.includes('用户不存在') ||
          error.message.includes('404')) {
        // 清除无效的认证信息
        localStorage.removeItem('cogniflow_auth_token');
        localStorage.removeItem('cogniflow_current_user');
        toast.error('登录已过期或用户不存在，请重新登录');
        setShowLoginDialog(true);
      } else {
        toast.error(error.message || '发布留言失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 提交回复
  const handleReply = async () => {
    if (!replyContent.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    if (!replyingTo) return;

    try {
      setSubmitting(true);
      await createMessage(replyContent, replyingTo.id);
      toast.success('回复发布成功');
      setReplyContent('');
      setReplyingTo(null);
      await loadMessages();
    } catch (error: any) {
      console.error('发布回复失败:', error);
      // 检查是否是认证错误（401未授权）或用户不存在（404）
      if (error.message.includes('未登录') || 
          error.message.includes('401') || 
          error.message.includes('未授权') ||
          error.message.includes('用户不存在') ||
          error.message.includes('404')) {
        localStorage.removeItem('cogniflow_auth_token');
        localStorage.removeItem('cogniflow_current_user');
        toast.error('登录已过期或用户不存在，请重新登录');
        setShowLoginDialog(true);
      } else {
        toast.error(error.message || '发布回复失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 切换点赞/点踩
  const handleReaction = async (messageId: string, reactionType: 'like' | 'dislike') => {
    if (!isAuthenticated) {
      toast.info('请先登录后再进行此操作');
      setShowLoginDialog(true);
      return;
    }

    try {
      const currentReaction = reactions[messageId];
      const newReaction = currentReaction === reactionType ? null : reactionType;
      
      // 乐观更新
      setReactions(prev => ({ ...prev, [messageId]: newReaction as 'like' | 'dislike' | null }));
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          if (currentReaction === reactionType) {
            // 取消反应
            return {
              ...msg,
              like_count: reactionType === 'like' ? Math.max(0, msg.like_count - 1) : msg.like_count,
              dislike_count: reactionType === 'dislike' ? Math.max(0, msg.dislike_count - 1) : msg.dislike_count,
            };
          } else {
            // 添加或切换反应
            const newMsg = { ...msg };
            if (currentReaction === 'like') {
              newMsg.like_count = Math.max(0, newMsg.like_count - 1);
            } else if (currentReaction === 'dislike') {
              newMsg.dislike_count = Math.max(0, newMsg.dislike_count - 1);
            }
            if (reactionType === 'like') {
              newMsg.like_count += 1;
            } else {
              newMsg.dislike_count += 1;
            }
            return newMsg;
          }
        }
        return msg;
      }));

      await toggleReaction(messageId, reactionType);
      await loadMessages(); // 重新加载以确保数据同步
    } catch (error: any) {
      console.error('操作失败:', error);
      if (error.message.includes('未登录')) {
        setShowLoginDialog(true);
      } else {
        toast.error(error.message || '操作失败，请稍后重试');
        await loadMessages(); // 恢复数据
      }
    }
  };

  // 删除留言
  const handleDelete = async (messageId: string) => {
    if (!confirm('确定要删除这条留言吗？')) {
      return;
    }

    try {
      await deleteMessage(messageId);
      toast.success('留言已删除');
      await loadMessages();
    } catch (error: any) {
      console.error('删除留言失败:', error);
      toast.error(error.message || '删除失败，请稍后重试');
    }
  };

  // 展开/收起回复
  const toggleReplies = async (message: Message) => {
    if (expandedMessages.has(message.id)) {
      setExpandedMessages(prev => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    } else {
      setExpandedMessages(prev => new Set(prev).add(message.id));
      // 加载回复
      try {
        const response = await getMessage(message.id);
        setMessages(prev => prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, replies: response.message.replies || [] }
            : msg
        ));
      } catch (error) {
        console.error('加载回复失败:', error);
        toast.error('加载回复失败');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">留言板</h1>
        <p className="text-muted-foreground">欢迎分享您的想法、建议和反馈</p>
      </div>

      {/* 发布留言区域 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">发表留言</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!checkAuthenticated() && (
              <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground text-center">
                  请先登录后再发表留言
                </p>
              </div>
            )}
            <Textarea
              placeholder={checkAuthenticated() ? "写下您的想法..." : "请先登录后再发表留言"}
              value={newMessage}
              onChange={(e) => {
                if (checkAuthenticated()) {
                  setNewMessage(e.target.value);
                }
              }}
              rows={4}
              disabled={!checkAuthenticated() || submitting}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              {!checkAuthenticated() ? (
                <Button onClick={() => setShowLoginDialog(true)}>
                  登录后发表
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!newMessage.trim() || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      发布中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      发布
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 留言列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无留言，快来发表第一条吧！
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              currentUserId={user?.id}
              currentUserRole={user?.role}
              reaction={reactions[message.id] || null}
              onReaction={handleReaction}
              onReply={() => setReplyingTo(message)}
              onDelete={handleDelete}
              onToggleReplies={toggleReplies}
              isExpanded={expandedMessages.has(message.id)}
            />
          ))
        )}
      </div>

      {/* 刷新按钮 */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={loadMessages} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 回复对话框 */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回复 @{replyingTo?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">@{replyingTo?.username}</p>
              <p className="text-sm">{replyingTo?.content}</p>
            </div>
            <Textarea
              placeholder="写下您的回复..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              disabled={submitting}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyingTo(null)}>
                取消
              </Button>
              <Button onClick={handleReply} disabled={!replyContent.trim() || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    发布回复
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 登录对话框 */}
      <LoginDialog 
        open={showLoginDialog} 
        onOpenChange={setShowLoginDialog}
        onSuccess={async () => {
          setShowLoginDialog(false);
          // 等待认证状态更新（useAuth hook 会异步更新，postgresAuth 会调用 notifyListeners）
          // 使用轮询方式确保状态已更新
          let retries = 0;
          const maxRetries = 10;
          while (retries < maxRetries) {
            if (checkAuthenticated()) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
          // 重新加载留言和反应状态
          await loadMessages();
        }}
      />
    </div>
  );
}

interface MessageCardProps {
  message: Message;
  currentUserId?: string;
  currentUserRole?: string;
  reaction: 'like' | 'dislike' | null;
  onReaction: (messageId: string, type: 'like' | 'dislike') => void;
  onReply: () => void;
  onDelete: (messageId: string) => void;
  onToggleReplies: (message: Message) => void;
  isExpanded: boolean;
}

function MessageCard({
  message,
  currentUserId,
  currentUserRole,
  reaction,
  onReaction,
  onReply,
  onDelete,
  onToggleReplies,
  isExpanded,
}: MessageCardProps) {
  const isOwner = currentUserId === message.user_id;
  const canDelete = isOwner || currentUserRole === 'admin';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 留言头部 */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">@{message.username}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
            </div>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(message.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReaction(message.id, 'like')}
              className={`h-8 ${reaction === 'like' ? 'text-primary' : ''}`}
            >
              <ThumbsUp className={`h-4 w-4 mr-1 ${reaction === 'like' ? 'fill-current' : ''}`} />
              <span>{message.like_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReaction(message.id, 'dislike')}
              className={`h-8 ${reaction === 'dislike' ? 'text-destructive' : ''}`}
            >
              <ThumbsDown className={`h-4 w-4 mr-1 ${reaction === 'dislike' ? 'fill-current' : ''}`} />
              <span>{message.dislike_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReply}
              className="h-8"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>回复</span>
            </Button>
            {message.reply_count !== undefined && message.reply_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleReplies(message)}
                className="h-8"
              >
                {isExpanded ? '收起' : `展开 ${message.reply_count} 条回复`}
              </Button>
            )}
          </div>

          {/* 回复列表 */}
          {isExpanded && message.replies && message.replies.length > 0 && (
            <div className="mt-4 space-y-3 pl-4 border-l-2 border-muted">
              {message.replies.map((reply) => (
                <div key={reply.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">@{reply.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{reply.content}</p>
                    </div>
                    {(currentUserId === reply.user_id || currentUserRole === 'admin') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(reply.id)}
                        className="text-destructive hover:text-destructive h-6"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

