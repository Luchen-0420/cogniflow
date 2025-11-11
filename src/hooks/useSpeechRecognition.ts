import { useState, useEffect, useRef, useCallback } from 'react';

// 声明 Web Speech API 类型
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'zh-CN',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = useRef(false);

  // 检查浏览器支持
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      isSupported.current = !!SpeechRecognitionAPI;

      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = interimResults;
        recognitionRef.current.lang = lang;

        // 处理识别结果
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += text;
            } else {
              interimText += text;
            }
          }

          if (finalTranscript) {
            setTranscript((prev) => prev + finalTranscript);
            if (onResult) {
              onResult(finalTranscript, true);
            }
          }

          setInterimTranscript(interimText);
          if (interimText && onResult) {
            onResult(interimText, false);
          }
        };

        // 处理错误
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          let errorMessage = '';
          
          switch (event.error) {
            case 'no-speech':
              errorMessage = '没有检测到语音，请重试';
              break;
            case 'audio-capture':
              errorMessage = '无法访问麦克风';
              break;
            case 'not-allowed':
              errorMessage = '麦克风权限被拒绝';
              break;
            case 'network':
              errorMessage = '网络错误，请检查网络连接';
              break;
            case 'aborted':
              errorMessage = '语音识别已取消';
              break;
            default:
              errorMessage = `语音识别错误: ${event.error}`;
          }

          setError(errorMessage);
          setIsListening(false);
          
          if (onError) {
            onError(errorMessage);
          }
        };

        // 处理结束
        recognitionRef.current.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          
          if (onEnd) {
            onEnd();
          }
        };

        // 处理开始
        recognitionRef.current.onstart = () => {
          setError(null);
          setIsListening(true);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [lang, continuous, interimResults, onResult, onError, onEnd]);

  // 开始监听
  const startListening = useCallback(() => {
    if (!isSupported.current) {
      const errorMsg = '您的浏览器不支持语音识别功能，请使用 Chrome、Edge 或 Safari 浏览器';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    if (recognitionRef.current && !isListening) {
      setError(null);
      setInterimTranscript('');
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        const errorMsg = '无法启动语音识别，请确保已授予麦克风权限';
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      }
    }
  }, [isListening, onError]);

  // 停止监听
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // 重置转录文本
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isSupported: isSupported.current,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
