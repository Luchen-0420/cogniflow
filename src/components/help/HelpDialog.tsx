import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Zap, 
  FileText, 
  Calendar, 
  Link as LinkIcon, 
  Tag, 
  Search,
  Paperclip,
  CheckSquare,
  Layers,
  Smartphone,
  Monitor
} from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            使用帮助
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cards" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cards">卡片类型</TabsTrigger>
            <TabsTrigger value="shortcuts">快捷输入</TabsTrigger>
            <TabsTrigger value="tips">使用技巧</TabsTrigger>
          </TabsList>

          {/* 卡片类型 */}
          <TabsContent value="cards" className="space-y-4 mt-4">
            <div className="space-y-3">
              <HelpCard
                icon={<FileText className="w-5 h-5 text-blue-500" />}
                title="笔记卡片"
                description="记录想法、知识点、会议纪要等文本内容"
                examples={[
                  "直接输入文字即可创建",
                  "支持 Markdown 格式",
                  "可添加标签进行分类"
                ]}
              />

              <HelpCard
                icon={<CheckSquare className="w-5 h-5 text-green-500" />}
                title="待办卡片"
                description="管理任务和待办事项"
                examples={[
                  "输入: 明天 提交报告",
                  "输入: 下周五 参加会议",
                  "自动识别时间和任务内容"
                ]}
              />

              <HelpCard
                icon={<Layers className="w-5 h-5 text-purple-500" />}
                title="集合卡片"
                description="使用模板快速创建结构化内容"
                examples={[
                  "输入 / 触发模板菜单",
                  "选择模板如 /日报、/会议、/月报",
                  "填写表单创建带子项的集合"
                ]}
              />

              <HelpCard
                icon={<LinkIcon className="w-5 h-5 text-orange-500" />}
                title="链接卡片"
                description="保存和管理网页链接"
                examples={[
                  "直接粘贴 URL 地址",
                  "自动抓取网页标题和内容",
                  "AI 生成摘要（需开启 AI 功能）"
                ]}
              />
            </div>
          </TabsContent>

          {/* 快捷输入 */}
          <TabsContent value="shortcuts" className="space-y-4 mt-4">
            <div className="space-y-3">
              <ShortcutCard
                icon={<Zap className="w-5 h-5 text-yellow-500" />}
                title="模板快捷键"
                shortcuts={[
                  { key: "/", desc: "触发模板菜单" },
                  { key: "/日报", desc: "创建日报模板" },
                  { key: "/会议", desc: "创建会议纪要模板" },
                  { key: "/月报", desc: "创建月报模板" },
                ]}
              />

              <ShortcutCard
                icon={<Search className="w-5 h-5 text-blue-500" />}
                title="查询指令"
                shortcuts={[
                  { key: "?关键词", desc: "搜索包含关键词的内容" },
                  { key: "@help", desc: "打开使用帮助" },
                  { key: "查询 今天的任务", desc: "自然语言查询" },
                ]}
              />

              <ShortcutCard
                icon={<Calendar className="w-5 h-5 text-green-500" />}
                title="时间识别"
                shortcuts={[
                  { key: "今天/明天/后天", desc: "自动设置日期" },
                  { key: "下周一/下周五", desc: "识别星期" },
                  { key: "2024-12-25", desc: "指定具体日期" },
                  { key: "本周末/下个月", desc: "相对时间表达" },
                ]}
              />

              <ShortcutCard
                icon={<Tag className="w-5 h-5 text-pink-500" />}
                title="标签添加"
                shortcuts={[
                  { key: "#标签名", desc: "快速添加标签" },
                  { key: "#工作 #重要", desc: "添加多个标签" },
                  { key: "在卡片中点击标签", desc: "查看同标签内容" },
                ]}
              />

              <ShortcutCard
                icon={<Paperclip className="w-5 h-5 text-gray-500" />}
                title="附件管理"
                shortcuts={[
                  { key: "点击📎图标", desc: "上传文件" },
                  { key: "支持图片/PDF/文档", desc: "多种格式支持" },
                  { key: "拖拽上传", desc: "拖拽文件到输入框" },
                ]}
              />
            </div>
          </TabsContent>

          {/* 使用技巧 */}
          <TabsContent value="tips" className="space-y-4 mt-4">
            <div className="space-y-4">
              <TipSection
                icon={<Monitor className="w-5 h-5 text-blue-500" />}
                title="PC 端使用建议"
                tips={[
                  "使用键盘快捷键提高效率，Enter 提交，Shift+Enter 换行",
                  "善用搜索功能快速定位内容",
                  "批量操作：按住 Shift 选择多个卡片",
                  "利用日历视图查看所有待办事项",
                  "定期使用归档功能整理已完成内容"
                ]}
              />

              <TipSection
                icon={<Smartphone className="w-5 h-5 text-green-500" />}
                title="移动端使用建议"
                tips={[
                  "点击右下角按钮快速创建内容",
                  "左右滑动卡片进行快速操作",
                  "使用语音输入提高录入速度",
                  "收藏常用标签方便快速筛选",
                  "开启自动备份确保数据安全"
                ]}
              />

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  专业提示
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>AI 功能：</strong>开启 AI 后可自动生成标题、摘要和分类建议</li>
                  <li>• <strong>智能模板：</strong>创建自定义模板，提高重复性工作效率</li>
                  <li>• <strong>数据备份：</strong>定期导出数据，防止意外丢失</li>
                  <li>• <strong>标签体系：</strong>建立统一的标签体系，便于长期管理</li>
                  <li>• <strong>定期回顾：</strong>利用历史视图和报告功能定期回顾内容</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  常见问题
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Q: 如何删除卡片？</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">A: 点击卡片右上角的菜单按钮，选择"删除"选项</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Q: 如何修改已创建的内容？</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">A: 点击卡片进入详情页面，可以编辑所有信息</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Q: 数据存储在哪里？</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">A: 数据本地存储在浏览器中，登录后可云端同步</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            更多问题？在输入框输入 <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">@help</code> 或点击右下角联系我们
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// 卡片类型帮助卡片
const HelpCard = ({ 
  icon, 
  title, 
  description, 
  examples 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  examples: string[];
}) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3">
      <div className="mt-1">{icon}</div>
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
        <div className="space-y-1">
          {examples.map((example, index) => (
            <p key={index} className="text-xs text-gray-500 dark:text-gray-500 flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span>{example}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// 快捷键卡片
const ShortcutCard = ({
  icon,
  title,
  shortcuts
}: {
  icon: React.ReactNode;
  title: string;
  shortcuts: { key: string; desc: string }[];
}) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
    </div>
    <div className="space-y-2">
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="flex items-center justify-between text-sm">
          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded font-mono">
            {shortcut.key}
          </code>
          <span className="text-gray-600 dark:text-gray-400 ml-3 flex-1">{shortcut.desc}</span>
        </div>
      ))}
    </div>
  </div>
);

// 提示部分
const TipSection = ({
  icon,
  title,
  tips
}: {
  icon: React.ReactNode;
  title: string;
  tips: string[];
}) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
    </div>
    <ul className="space-y-2">
      {tips.map((tip, index) => (
        <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
          <span className="text-green-500 mt-1">✓</span>
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  </div>
);
