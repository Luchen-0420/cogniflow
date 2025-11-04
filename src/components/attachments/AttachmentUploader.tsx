/**
 * 附件上传组件
 * 在 QuickInput 左侧显示，支持图片、文档等多种格式
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadAttachment,
  validateFileType,
  validateFileSize,
  formatFileSize,
  getFileIcon,
  type AttachmentUploadResponse,
} from '@/utils/attachmentUtils';

interface AttachmentUploaderProps {
  onUploadSuccess?: (attachment: AttachmentUploadResponse) => void;
  onUploadError?: (error: string) => void;
  itemId?: string;
  maxFiles?: number;
}

interface FilePreview {
  file: File;
  preview?: string;
  uploading: boolean;
  uploadedAttachment?: AttachmentUploadResponse;
}

export function AttachmentUploader({
  onUploadSuccess,
  onUploadError,
  itemId,
  maxFiles = 5,
}: AttachmentUploaderProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    // 验证文件
    for (const file of selectedFiles) {
      const typeValidation = validateFileType(file);
      if (!typeValidation.valid) {
        toast.error(`${file.name}: ${typeValidation.error}`);
        continue;
      }

      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        toast.error(`${file.name}: ${sizeValidation.error}`);
        continue;
      }

      // 添加文件预览
      const preview: FilePreview = {
        file,
        uploading: false,
      };

      // 如果是图片，生成预览
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, preview: e.target?.result as string } : f
            )
          );
        };
        reader.readAsDataURL(file);
      }

      setFiles((prev) => [...prev, preview]);
    }

    // 清空input以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (filePreview: FilePreview) => {
    setFiles((prev) =>
      prev.map((f) => (f.file === filePreview.file ? { ...f, uploading: true } : f))
    );

    try {
      const attachment = await uploadAttachment(filePreview.file, itemId);
      
      setFiles((prev) =>
        prev.map((f) =>
          f.file === filePreview.file
            ? { ...f, uploading: false, uploadedAttachment: attachment }
            : f
        )
      );

      toast.success('文件上传成功');
      onUploadSuccess?.(attachment);
    } catch (error: any) {
      console.error('文件上传失败:', error);
      setFiles((prev) =>
        prev.map((f) => (f.file === filePreview.file ? { ...f, uploading: false } : f))
      );
      toast.error(error.message || '文件上传失败');
      onUploadError?.(error.message);
    }
  };

  const handleRemove = (filePreview: FilePreview) => {
    setFiles((prev) => prev.filter((f) => f.file !== filePreview.file));
  };

  const handleUploadAll = async () => {
    const filesToUpload = files.filter((f) => !f.uploadedAttachment && !f.uploading);
    
    for (const filePreview of filesToUpload) {
      await handleUpload(filePreview);
    }
  };

  return (
    <div className="flex items-start gap-2">
      {/* 上传按钮 */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="h-10 px-3"
        disabled={files.length >= maxFiles}
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.txt,.md,.doc,.docx"
        multiple
        onChange={handleFileSelect}
      />

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            {files.map((filePreview, index) => (
              <div
                key={index}
                className="relative flex items-center gap-2 bg-muted rounded-lg p-2 pr-8"
              >
                {/* 文件图标/预览 */}
                {filePreview.preview ? (
                  <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={filePreview.preview}
                      alt={filePreview.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center text-2xl flex-shrink-0">
                    {getFileIcon(filePreview.file.type)}
                  </div>
                )}

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate max-w-[150px]">
                    {filePreview.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(filePreview.file.size)}
                  </div>
                </div>

                {/* 状态 */}
                {filePreview.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : filePreview.uploadedAttachment ? (
                  <span className="text-xs text-green-600">✓</span>
                ) : null}

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => handleRemove(filePreview)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-background hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  disabled={filePreview.uploading}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 批量上传按钮 */}
          {files.some((f) => !f.uploadedAttachment && !f.uploading) && (
            <Button
              type="button"
              size="sm"
              onClick={handleUploadAll}
              className="h-8"
            >
              上传全部
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
