"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";
import { getCroppedImg, blobToFile } from "@/lib/utils/image-crop";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

/**
 * @file EditProfileModal.tsx
 * @description 프로필 편집 모달 컴포넌트
 *
 * 주요 기능:
 * - 프로필 사진 업로드 및 크롭 (1:1 정사각형)
 * - 이름 변경
 * - 프로필 정보 업데이트
 *
 * @dependencies
 * - components/ui/dialog: 모달 UI
 * - components/ui/button: 버튼 컴포넌트
 * - components/ui/input: 입력 필드
 * - react-easy-crop: 이미지 크롭
 */

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  currentImageUrl: string | null;
  currentBio: string | null;
  currentWebsite: string | null;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function EditProfileModal({
  open,
  onOpenChange,
  currentName,
  currentImageUrl,
  currentBio,
  currentWebsite,
  onSuccess,
}: EditProfileModalProps) {
  const { userId } = useAuth();
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio || "");
  const [website, setWebsite] = useState(currentWebsite || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 크롭 관련 상태
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // 모달이 열릴 때 초기값 설정
  useEffect(() => {
    if (open) {
      setName(currentName);
      setPreviewUrl(currentImageUrl);
      setCroppedPreviewUrl(null);
      setSelectedFile(null);
      setOriginalFile(null);
      setShowCrop(false);
      setError(null);
      setBio(currentBio || "");
      setWebsite(currentWebsite || "");
    }
  }, [open, currentName, currentImageUrl, currentBio, currentWebsite]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("파일 크기는 5MB를 초과할 수 없습니다.");
      return;
    }

    setError(null);
    setOriginalFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCrop(true);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }, []);

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
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      const fileExtension = originalFile.name.split(".").pop() || "jpg";
      const croppedFile = blobToFile(croppedBlob, `profile.${fileExtension}`);
      const croppedUrl = URL.createObjectURL(croppedBlob);
      
      setCroppedPreviewUrl(croppedUrl);
      setSelectedFile(croppedFile);
      setShowCrop(false);
    } catch (err) {
      console.error("Crop error:", err);
      setError("이미지 크롭에 실패했습니다.");
    }
  }, [previewUrl, croppedAreaPixels, originalFile]);

  // 프로필 업데이트 핸들러
  const handleSubmit = async () => {
    if (!userId) {
      setError("인증이 필요합니다.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      if (selectedFile) {
        formData.append("image", selectedFile);
      }
      formData.append("bio", bio);
      formData.append("website", website);

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Update error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
          <DialogDescription className="sr-only">
            프로필 사진과 이름, 소개글, 웹사이트를 변경할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 프로필 사진 업로드 */}
          <div className="space-y-4">
            <Label>프로필 사진</Label>
            {showCrop ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-square max-w-xs mx-auto bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <Cropper
                    image={previewUrl || ""}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape="round"
                    showGrid={false}
                    style={{
                      containerStyle: {
                        width: "100%",
                        height: "100%",
                        position: "relative",
                      },
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>확대/축소</Label>
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
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCrop(false);
                      if (originalFile) {
                        URL.revokeObjectURL(previewUrl || "");
                        setPreviewUrl(currentImageUrl);
                        setOriginalFile(null);
                      }
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCropComplete}
                    className="bg-[var(--instagram-blue)] hover:bg-[var(--instagram-blue)]/90 text-white"
                  >
                    적용
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={croppedPreviewUrl || previewUrl || "/default-avatar.png"}
                    alt="프로필 사진"
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    사진 변경
                  </Button>
                  {croppedPreviewUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCrop(true);
                        if (originalFile && previewUrl) {
                          setPreviewUrl(URL.createObjectURL(originalFile));
                        }
                      }}
                    >
                      크롭 수정
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="이름을 입력하세요"
            />
          </div>

          {/* 소개글 입력 */}
          <div className="space-y-2">
            <Label htmlFor="bio">소개글</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              rows={4}
              placeholder="간단한 소개글을 작성하세요 (최대 150자)"
              className="resize-none"
            />
            <div className="text-right text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              {bio.length}/150
            </div>
          </div>

          {/* 웹사이트 입력 */}
          <div className="space-y-2">
            <Label htmlFor="website">웹사이트</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
            <p className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              웹사이트 주소는 "https://"를 포함해야 합니다. (없으면 자동으로 추가됩니다)
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-sm text-[var(--instagram-like)] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--instagram-border)] dark:border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isUploading || !name.trim()}
              className="bg-[var(--instagram-blue)] hover:bg-[var(--instagram-blue)]/90 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

