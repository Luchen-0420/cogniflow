"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog({
  onOpenChange,
  open,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const prevOpenRef = React.useRef<boolean | undefined>(open);

  // 监听 open 状态变化，确保关闭时恢复滚动
  React.useEffect(() => {
    // 检测从打开变为关闭的状态变化
    if (prevOpenRef.current === true && open === false) {
      // Dialog 从打开变为关闭，强制恢复滚动
      const restoreScroll = () => {
        // 恢复 body 和 html 的滚动样式
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.paddingRight = '';
        
        // 移除可能存在的锁定类名
        document.body.classList.remove('radix-scroll-lock');
        document.documentElement.classList.remove('radix-scroll-lock');
      };

      // 立即恢复
      restoreScroll();
      
      // 延迟恢复（确保动画完成）
      const timer1 = setTimeout(restoreScroll, 100);
      const timer2 = setTimeout(restoreScroll, 300);
      const timer3 = setTimeout(restoreScroll, 500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
    
    // 更新前一个状态
    prevOpenRef.current = open;
  }, [open]);

  // 包装 onOpenChange
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    onOpenChange?.(newOpen);
  }, [onOpenChange]);

  return <DialogPrimitive.Root data-slot="dialog" open={open} onOpenChange={handleOpenChange} {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  // 监听 Dialog 内容的状态变化，确保关闭时恢复滚动
  React.useEffect(() => {
    const restoreScroll = () => {
      // 强制恢复 body 和 html 的滚动样式
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
      // 移除可能存在的锁定类名
      document.body.classList.remove('radix-scroll-lock');
      document.documentElement.classList.remove('radix-scroll-lock');
    };

    let observer: MutationObserver | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // 等待元素挂载后再设置 observer
    const setupObserver = () => {
      const contentElement = contentRef.current;
      if (!contentElement) {
        // 如果元素还没挂载，稍后再试
        timeoutId = setTimeout(setupObserver, 50);
        return;
      }

      observer = new MutationObserver(() => {
        const dataState = contentElement.getAttribute('data-state');
        if (dataState === 'closed') {
          // Dialog 关闭时，强制恢复滚动
          // 立即恢复
          restoreScroll();
          // 延迟恢复（确保动画完成）
          setTimeout(restoreScroll, 100);
          setTimeout(restoreScroll, 300);
          setTimeout(restoreScroll, 500);
        }
      });

      observer.observe(contentElement, {
        attributes: true,
        attributeFilter: ['data-state'],
      });
    };

    setupObserver();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (observer) {
        observer.disconnect();
      }
      // 组件卸载时也恢复滚动
      restoreScroll();
      setTimeout(restoreScroll, 100);
      setTimeout(restoreScroll, 300);
    };
  }, []);

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={combinedRef}
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
