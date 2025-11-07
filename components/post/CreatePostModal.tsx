"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "@/components/providers/theme-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Loader2, Check, Smile, Hash } from "lucide-react";
import Image from "next/image";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImg, blobToFile } from "@/lib/utils/image-crop";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { getHashtagSuggestions } from "@/lib/utils/hashtag-suggestions";

/**
 * @file CreatePostModal.tsx
 * @description 게시물 작성 모달 컴포넌트
 *
 * 주요 기능:
 * - 이미지 업로드 (드래그 앤 드롭 또는 클릭)
 * - 이미지 크롭 (1:1 정사각형)
 * - 이미지 미리보기
 * - 게시물 피드글 입력 (최대 2,200자)
 * - 해시태그 입력 및 추천 (# 입력 시)
 * - 이모지 입력
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

interface MentionSuggestion {
  id: string;
  clerk_id: string;
  name: string;
}

interface MentionSelection extends MentionSuggestion {
  displayText: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CAPTION_LENGTH = 2200;

export default function CreatePostModal({
  open,
  onOpenChange,
  onSuccess,
}: CreatePostModalProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 크롭 관련 상태
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // 이모지 피커 상태
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState("");
  const hashtagSuggestionsRef = useRef<HTMLDivElement>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const mentionSuggestionsRef = useRef<HTMLDivElement>(null);
  const [mentionSelections, setMentionSelections] = useState<MentionSelection[]>([]);

  // 마운트 확인 (다크모드 감지용)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mentionQuery) {
      setMentionSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setMentionSuggestions(data.users || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching mention suggestions:", error);
        }
      }
    };

    const timeout = setTimeout(fetchSuggestions, 200);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [mentionQuery]);

  // 외부 클릭 시 해시태그 추천 및 이모지 피커 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        hashtagSuggestionsRef.current &&
        !hashtagSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowHashtagSuggestions(false);
      }

      if (
        mentionSuggestionsRef.current &&
        !mentionSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowMentionSuggestions(false);
      }

      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    setOriginalFile(file);

    // 미리보기 URL 생성 및 크롭 모드로 전환
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCrop(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
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

  // 크롭 완료 핸들러
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 크롭 적용 핸들러
  const handleCropComplete = useCallback(async () => {
    if (!previewUrl || !croppedAreaPixels || !originalFile) {
      return;
    }

    try {
      // 크롭된 이미지 생성
      const croppedBlob = await getCroppedImg(
        previewUrl,
        croppedAreaPixels
      );

      // Blob을 File로 변환
      const fileExtension = originalFile.name.split(".").pop() || "jpg";
      const croppedFile = blobToFile(
        croppedBlob,
        `cropped.${fileExtension}`
      );

      // 크롭된 이미지 미리보기 URL 생성
      const croppedUrl = URL.createObjectURL(croppedBlob);
      setCroppedPreviewUrl(croppedUrl);

      setSelectedFile(croppedFile);
      setShowCrop(false);
    } catch (err) {
      console.error("Crop error:", err);
      setError("이미지 크롭에 실패했습니다.");
    }
  }, [previewUrl, croppedAreaPixels, originalFile]);

  // 크롭 취소 핸들러
  const handleCropCancel = () => {
    setShowCrop(false);
    handleRemoveImage();
  };

  // 이모지 선택 핸들러
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = caption.substring(0, start) + emoji + caption.substring(end);
      setCaption(newText);
      
      // 커서 위치 조정
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setShowEmojiPicker(false);
  };

  // 해시태그 입력 핸들러
  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCaption(value);
    
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // # 입력 감지
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastHashIndex = textBeforeCursor.lastIndexOf("#");

    setMentionSelections((prev) => {
      const normalized = value.toLowerCase();
      const seen = new Set<string>();
      return prev.filter((mention) => {
        const key = `@${mention.displayText.toLowerCase()}`;
        const uniqueKey = `${mention.id}-${key}`;
        if (!normalized.includes(key) || seen.has(uniqueKey)) {
          return false;
        }
        seen.add(uniqueKey);
        return true;
      });
    });

    let shouldShowHashtag = false;
    if (lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
      if (!textAfterHash.includes(" ") && !textAfterHash.includes("\n")) {
        setHashtagQuery(textAfterHash);
        shouldShowHashtag = textAfterHash.length > 0;
      }
    }
    setShowHashtagSuggestions(shouldShowHashtag);
    if (!shouldShowHashtag) {
      setHashtagQuery("");
    }

    let shouldShowMention = false;
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        shouldShowMention = textAfterAt.length > 0;
      }
    }
    setShowMentionSuggestions(shouldShowMention);
    if (!shouldShowMention) {
      setMentionQuery("");
    }
  };

  // 해시태그 선택 핸들러
  const handleHashtagSelect = (hashtag: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = cursorPosition;
      const textBeforeCursor = caption.substring(0, cursorPos);
      const lastHashIndex = textBeforeCursor.lastIndexOf("#");
      
      if (lastHashIndex !== -1) {
        const newText =
          caption.substring(0, lastHashIndex) +
          hashtag +
          " " +
          caption.substring(cursorPos);
        setCaption(newText);
        
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = lastHashIndex + hashtag.length + 1;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    }
    setShowHashtagSuggestions(false);
    setHashtagQuery("");
  };

  const handleMentionSelect = (suggestion: MentionSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const cursorPos = cursorPosition;
    const textBeforeCursor = caption.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const displayText = suggestion.name;
      const newText =
        caption.substring(0, lastAtIndex) +
        `@${displayText} ` +
        caption.substring(cursorPos);
      setCaption(newText);
      setMentionSelections((prev) => [...prev, { ...suggestion, displayText }]);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = lastAtIndex + displayText.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }

    setShowMentionSuggestions(false);
    setMentionQuery("");
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
    }
    setSelectedFile(null);
    setOriginalFile(null);
    setPreviewUrl(null);
    setCroppedPreviewUrl(null);
    setError(null);
    setShowCrop(false);
    setShowEmojiPicker(false);
    setShowHashtagSuggestions(false);
    setShowMentionSuggestions(false);
    setMentionSelections([]);
    setMentionQuery("");
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

      const normalizedMentions = (() => {
        const normalizedCaption = caption.toLowerCase();
        const seen = new Set<string>();
        return mentionSelections.filter((mention) => {
          const key = `@${mention.displayText.toLowerCase()}`;
          const uniqueKey = `${mention.id}-${key}`;
          if (!normalizedCaption.includes(key) || seen.has(uniqueKey)) {
            return false;
          }
          seen.add(uniqueKey);
          return true;
        });
      })();

      if (normalizedMentions.length > 0) {
        formData.append(
          "mentions",
          JSON.stringify(
            normalizedMentions.map((mention) => ({
              mentioned_user_id: mention.id,
              display_text: mention.displayText,
            }))
          )
        );
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 성공 시 상태 초기화
      handleRemoveImage();
      setCaption("");
      setMentionSelections([]);
      onOpenChange(false);

      // 피드 새로고침을 위한 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent("postCreated"));

      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
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
      setShowEmojiPicker(false);
      setShowHashtagSuggestions(false);
      setShowMentionSuggestions(false);
      setMentionSelections([]);
      setMentionQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 게시물 만들기</DialogTitle>
          <DialogDescription className="sr-only">
            이미지를 업로드하고 게시물 피드글을 작성하세요
          </DialogDescription>
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
          ) : showCrop ? (
            /* 크롭 모드 */
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <Cropper
                  image={previewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // 1:1 정사각형
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  showGrid={true}
                  style={{
                    containerStyle: {
                      width: "100%",
                      height: "100%",
                      position: "relative",
                    },
                  }}
                />
              </div>
              {/* 줌 컨트롤 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                  확대/축소
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              {/* 크롭 버튼 */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCropCancel}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleCropComplete}
                  className="bg-[var(--instagram-blue)] hover:bg-[var(--instagram-blue)]/90 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  적용
                </Button>
              </div>
            </div>
          ) : (
            /* 크롭 완료 후 미리보기 */
            <div className="relative">
              <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <Image
                  src={croppedPreviewUrl || previewUrl || ""}
                  alt="미리보기"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCrop(true)}
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  aria-label="이미지 크롭"
                  title="크롭 수정"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="이미지 제거"
              >
                <X className="w-4 h-4" />
              </button>
              </div>
            </div>
          )}

          {/* 게시물 피드글 입력 (크롭 모드가 아닐 때만 표시) */}
          {!showCrop && (
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <label
                htmlFor="caption"
                className="text-sm font-medium text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
              >
                게시물 피드글
              </label>
              <div className="flex items-center gap-2">
                {/* 해시태그 버튼 */}
                <button
                  type="button"
                  onClick={() => {
                    const textarea = textareaRef.current;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const newText = caption.substring(0, start) + "#" + caption.substring(start);
                      setCaption(newText);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 1, start + 1);
                      }, 0);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="해시태그 추가"
                  title="해시태그 추가"
                >
                  <Hash className="w-4 h-4 text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]" />
                </button>
                {/* 이모지 버튼 */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="이모지 추가"
                  title="이모지 추가"
                >
                  <Smile className="w-4 h-4 text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                id="caption"
                placeholder="게시물에 대한 설명을 입력하세요... 해시태그는 #을 입력해보세요"
                value={caption}
                onChange={handleCaptionChange}
                onSelect={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  setCursorPosition(target.selectionStart);
                }}
                maxLength={MAX_CAPTION_LENGTH}
                rows={4}
                className="resize-none pr-10"
              />
              
              {/* 해시태그 추천 리스트 */}
              {showHashtagSuggestions && (
                <div
                  ref={hashtagSuggestionsRef}
                  className="absolute z-20 mt-1 w-full bg-white dark:bg-[var(--card)] border border-[var(--instagram-border)] dark:border-[var(--border)] rounded-md shadow-lg max-h-48 overflow-y-auto"
                >
                  {getHashtagSuggestions(hashtagQuery).length > 0 ? (
                    getHashtagSuggestions(hashtagQuery).map((hashtag) => (
                      <button
                        key={hashtag}
                        type="button"
                        onClick={() => handleHashtagSelect(hashtag)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                      >
                        {hashtag}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
                      추천 해시태그가 없습니다
                    </div>
                  )}
                </div>
              )}

              {showMentionSuggestions && (
                <div
                  ref={mentionSuggestionsRef}
                  className="absolute z-20 mt-1 w-full bg-white dark:bg-[var(--card)] border border-[var(--instagram-border)] dark:border-[var(--border)] rounded-md shadow-lg max-h-48 overflow-y-auto"
                  style={{ top: "100%" }}
                >
                  {mentionSuggestions.length > 0 ? (
                    mentionSuggestions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleMentionSelect(user)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                      >
                        <span className="block text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                          {user.name}
                        </span>
                        <span className="block text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
                          @{user.clerk_id}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
                      결과가 없습니다
                    </div>
                  )}
                </div>
              )}
              
              {/* 이모지 피커 */}
              {showEmojiPicker && mounted && (
                <div ref={emojiPickerRef} className="absolute z-20 mt-1 right-0">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    theme={theme === "dark" ? "dark" : "light"}
                    width={350}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
            <div className="text-right text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              {caption.length}/{MAX_CAPTION_LENGTH}
            </div>
          </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-[var(--instagram-like)] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              {error}
            </div>
          )}

          {/* 게시 버튼 (크롭 모드가 아닐 때만 표시) */}
          {!showCrop && (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

