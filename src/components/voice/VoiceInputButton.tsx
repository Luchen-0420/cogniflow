import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';

export interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
}

export function VoiceInputButton({
  onTranscript,
  disabled = false,
  className,
  size = 'lg',
  variant = 'outline',
}: VoiceInputButtonProps) {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        // 最终识别结果
        onTranscript(text);
      }
    },
    onError: (errorMsg) => {
      toast.error(errorMsg);
    },
    onEnd: () => {
      // 识别结束，清理临时状态
      if (transcript) {
        resetTranscript();
      }
    },
  });

  // 当有新的完整转录文本时，传递给父组件
  useEffect(() => {
    if (transcript && !isListening) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, onTranscript, resetTranscript]);

  // 显示错误提示
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleClick = () => {
    if (!isSupported) {
      toast.error('您的浏览器不支持语音识别功能，请使用 Chrome、Edge 或 Safari 浏览器', {
        duration: 5000,
      });
      return;
    }

    if (isListening) {
      stopListening();
      toast.info('语音输入已停止');
    } else {
      startListening();
      toast.success('开始语音输入，请说话...', {
        duration: 2000,
      });
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isListening ? 'default' : variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || !isSupported}
        className={cn(
          'transition-all',
          isListening && 'animate-pulse bg-red-500 hover:bg-red-600',
          className
        )}
        title={
          !isSupported
            ? '浏览器不支持语音识别'
            : isListening
            ? '点击停止语音输入'
            : '点击开始语音输入'
        }
      >
        {isListening ? (
          <Mic className="h-5 w-5 text-white" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>

      {/* 显示实时识别的临时文本 */}
      {isListening && interimTranscript && (
        <div className="absolute top-full mt-2 left-0 right-0 min-w-[200px] max-w-[400px] p-2 bg-background border rounded-md shadow-lg z-50 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="inline-block w-1 h-1 bg-red-500 rounded-full animate-bounce" />
              <span className="inline-block w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="inline-block w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>正在识别...</span>
          </div>
          <p className="mt-1 text-foreground">{interimTranscript}</p>
        </div>
      )}
    </div>
  );
}
