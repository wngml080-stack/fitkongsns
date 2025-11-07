"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";

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

interface MentionSuggestion {
  id: string;
  clerk_id: string;
  name: string;
}

interface MentionSelection extends MentionSuggestion {
  displayText: string;
}

export default function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const { isSignedIn, userId } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionSelections, setMentionSelections] = useState<MentionSelection[]>([]);

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
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error fetching mention suggestions:", err);
        }
      }
    };

    const timeout = setTimeout(fetchSuggestions, 200);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [mentionQuery]);

  const sanitizeMentions = (text: string, mentions: MentionSelection[]) => {
    const normalized = text.toLowerCase();
    const seen = new Set<string>();
    return mentions.filter((mention) => {
      const key = `@${mention.displayText.toLowerCase()}`;
      const uniqueKey = `${mention.id}-${key}`;
      if (!normalized.includes(key) || seen.has(uniqueKey)) {
        return false;
      }
      seen.add(uniqueKey);
      return true;
    });
  };

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
      const validMentions = sanitizeMentions(trimmedContent, mentionSelections);
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: postId,
          content: trimmedContent,
          mentions: validMentions.map((mention) => ({
            mentioned_user_id: mention.id,
            display_text: mention.displayText,
          })),
        }),
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 성공 시 입력 필드 초기화
      setContent("");
      setError(null);
      setMentionSelections([]);
      setMentionQuery("");
      setShowMentionSuggestions(false);

      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Comment submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      setShowMentionSuggestions(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);
    setError(null);

    const cursorPos = e.target.selectionStart || value.length;
    setCursorPosition(cursorPos);

    setMentionSelections((prev) => sanitizeMentions(value, prev));

    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(textAfterAt.length > 0);
        return;
      }
    }

    setShowMentionSuggestions(false);
    setMentionQuery("");
  };

  const handleMentionSelect = (suggestion: MentionSuggestion) => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const start = cursorPosition;
    const textBeforeCursor = content.substring(0, start);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const displayText = suggestion.name;
      const newText =
        content.substring(0, lastAtIndex) +
        `@${displayText} ` +
        content.substring(start);
      setContent(newText);
      setMentionSelections((prev) => [...prev, { ...suggestion, displayText }]);

      setTimeout(() => {
        input.focus();
        const newCursorPos = lastAtIndex + displayText.length + 2;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }

    setShowMentionSuggestions(false);
    setMentionQuery("");
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
      <div className="relative flex items-center gap-2 px-4 py-3">
        <Input
          ref={inputRef}
          type="text"
          placeholder="댓글 달기..."
          value={content}
          onChange={handleContentChange}
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
        {showMentionSuggestions && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-[var(--card)] border border-[var(--instagram-border)] dark:border-[var(--border)] rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
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
      </div>
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[var(--instagram-like)]">{error}</p>
        </div>
      )}
    </form>
  );
}

