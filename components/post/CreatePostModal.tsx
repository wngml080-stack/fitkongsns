"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";

/**
 * @file CreatePostModal.tsx
 * @description 게시물 작성 모달 컴포넌트
 *
 * 주요 기능:
 * - 이미지 업로드 (드래그 앤 드롭 또는 클릭)
 * - 이미지 미리보기
 * - 캡션 입력 (최대 2,200자)
 * - 게시 버튼으로 업로드
 * - 업로드 진행 상태 표시
 *
 * @dependencies
 * - components/ui/dialog: 모달 UI
 * - components/ui/button: 버튼 컴포넌트
 * - components/ui/textarea: 텍스트 입력 필드
 * - next/image: 이미지 미리보기
 */

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // 게시 성공 시 콜백
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CAPTION_LENGTH = 2200;

export default function CreatePostModal({
  open,
  onOpenChange,
  onSuccess,
}: CreatePostModalProps) {
  const { userId } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((file: File) => {
    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      setError("파일 크기는 5MB를 초과할 수 없습니다.");
      return;
    }

    setError(null);
    setSelectedFile(file);

    // 미리보기 URL 생성
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  // 파일 입력 변경 핸들러
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 게시 핸들러
  const handleSubmit = async () => {
    if (!selectedFile || !userId) {
      setError("이미지를 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("caption", caption);

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "게시물 업로드에 실패했습니다.");
      }

      // 성공 시 상태 초기화
      handleRemoveImage();
      setCaption("");
      onOpenChange(false);

      // 피드 새로고침을 위한 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent("postCreated"));

      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시물 업로드에 실패했습니다.");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // 모달 닫기 시 상태 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUploading) {
      handleRemoveImage();
      setCaption("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 게시물 만들기</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 이미지 업로드 영역 */}
          {!previewUrl ? (
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center
                transition-colors cursor-pointer
                ${
                  isDragging
                    ? "border-[var(--instagram-blue)] bg-blue-50 dark:bg-blue-950/20"
                    : "border-[var(--instagram-border)] dark:border-[var(--border)] hover:border-[var(--instagram-blue)]"
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]" />
              <p className="text-lg font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] mb-2">
                사진을 여기에 끌어다 놓으세요
              </p>
              <p className="text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] mb-4">
                또는 클릭하여 선택하세요
              </p>
              <Button type="button" variant="outline" size="sm">
                컴퓨터에서 선택
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <Image
                  src={previewUrl}
                  alt="미리보기"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="이미지 제거"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 캡션 입력 */}
          <div className="space-y-2">
            <label
              htmlFor="caption"
              className="text-sm font-medium text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
            >
              캡션
            </label>
            <Textarea
              id="caption"
              placeholder="게시물에 대한 설명을 입력하세요..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={MAX_CAPTION_LENGTH}
              rows={4}
              className="resize-none"
            />
            <div className="text-right text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              {caption.length}/{MAX_CAPTION_LENGTH}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-[var(--instagram-like)] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              {error}
            </div>
          )}

          {/* 게시 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--instagram-border)] dark:border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isUploading}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="bg-[var(--instagram-blue)] hover:bg-[var(--instagram-blue)]/90 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  게시 중...
                </>
              ) : (
                "게시"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

