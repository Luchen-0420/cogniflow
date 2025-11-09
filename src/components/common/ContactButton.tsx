import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ContactButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* 右下角浮动按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsDialogOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-full shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105"
          aria-label="联系我们"
        >
          <MessageCircle className="w-5 h-5" />
          <span 
            className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${
              isHovered ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'
            }`}
          >
            联系我们
          </span>
        </button>
      </div>

      {/* 弹窗显示群二维码 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-900 dark:text-gray-100">
              加入我们的交流群
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-gray-600 dark:text-gray-400">
              扫描下方二维码，加入用户交流群
            </p>
            <p className="text-center text-sm text-gray-500 dark:text-gray-500">
              获取最新更新、使用技巧和反馈问题
            </p>
            <div className="relative w-full max-w-xs aspect-square bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <img
                src="/imgs/group.png"
                alt="交流群二维码"
                className="w-full h-full object-contain rounded-md"
              />
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-2">
              如二维码失效，请通过其他方式联系开发者
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactButton;
