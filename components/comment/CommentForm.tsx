"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

/**
 * @file CommentForm.tsx
 * @description 댓글 작성 폼 컴포넌트
 *
 * 주요 기능:
 * - "댓글 달기..." placeholder 입력창
 * - Enter 키 또는 "게시" 버튼으로 제출
 * - 로그인하지 않은 사용자: SignInButton으로 감싸기
 * - 제출 중 로딩 상태
 *
 * @dependencies
 * - components/ui/button: 버튼 컴포넌트
 * - components/ui/input: 입력 필드 컴포넌트
 * - @clerk/nextjs: 인증 상태 확인
 */

interface CommentFormProps {
  postId: string;
  onSuccess?: () => void; // 댓글 작성 성공 시 콜백
}

export default function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const { isSignedIn, userId } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isSignedIn || !userId) {
      return; // SignInButton으로 처리
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("댓글을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: postId,
          content: trimmedContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "댓글 작성에 실패했습니다.");
      }

      // 성공 시 입력 필드 초기화
      setContent("");
      setError(null);

      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 작성에 실패했습니다.");
      console.error("Comment submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // 로그인하지 않은 사용자
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--instagram-border)] dark:border-[var(--border)]">
          <Input
            type="text"
            placeholder="댓글 달기..."
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
            readOnly
            onClick={(e) => {
              // SignInButton이 클릭 이벤트를 처리하도록 함
              e.currentTarget.blur();
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[var(--instagram-blue)] hover:text-[var(--instagram-blue)]/80 font-semibold text-sm px-2"
          >
            게시
          </Button>
        </div>
      </SignInButton>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--instagram-border)] dark:border-[var(--border)]">
      <div className="flex items-center gap-2 px-4 py-3">
        <Input
          type="text"
          placeholder="댓글 달기..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
          maxLength={1000}
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={!content.trim() || isSubmitting}
          className="text-[var(--instagram-blue)] hover:text-[var(--instagram-blue)]/80 font-semibold text-sm px-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "게시"
          )}
        </Button>
      </div>
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[var(--instagram-like)]">{error}</p>
        </div>
      )}
    </form>
  );
}

