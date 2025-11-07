"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, X, Loader2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-time";
import { useAuth } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { SignInButton } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CommentForm from "@/components/comment/CommentForm";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";
import ShareDialog from "./ShareDialog";
import MentionText, { MentionItem } from "@/components/ui/MentionText";

/**
 * @file PostModal.tsx
 * @description 게시물 상세 모달 컴포넌트
 *
 * 주요 기능:
 * - Desktop: 모달 형식 (이미지 50% + 댓글 50%)
 * - Mobile: 전체화면 모달
 * - 이미지 영역
 * - 전체 댓글 목록 (스크롤 가능)
 * - 좋아요/댓글 액션 버튼
 * - 댓글 작성 폼
 *
 * @dependencies
 * - components/ui/dialog: 모달 UI
 * - components/comment/CommentForm: 댓글 작성 폼
 * - lib/utils/format-time: 상대 시간 포맷팅
 */

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    clerk_id: string;
    name: string;
  };
  mentions?: MentionItem[];
}

interface PostUser {
  id: string;
  clerk_id: string;
  name: string;
  image_url?: string;
}

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  isLiked: boolean;
  isBookmarked: boolean;
  user: PostUser;
  comments: Comment[];
  mentions?: MentionItem[];
}

interface PostModalProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLikesCount: number;
  initialIsLiked: boolean;
  initialIsBookmarked: boolean;
  onLikeChange?: (liked: boolean, updatedLikesCount: number) => void;
  onBookmarkChange?: (bookmarked: boolean) => void;
}

export default function PostModal({
  open,
  onOpenChange,
  postId,
  initialLikesCount,
  initialIsLiked,
  initialIsBookmarked,
  onLikeChange,
  onBookmarkChange,
}: PostModalProps) {
  const { isSignedIn, userId } = useAuth();
  const supabase = useClerkSupabaseClient();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 게시물 데이터 가져오기
  useEffect(() => {
    if (!open || !postId) {
      return;
    }

    fetchPost();
  }, [open, postId]);

  // 현재 사용자 ID 가져오기
  useEffect(() => {
    if (!isSignedIn || !userId) {
      setCurrentUserId(null);
      return;
    }

    const fetchCurrentUserId = async () => {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();

        if (userData) {
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        console.error("Error fetching current user ID:", error);
      }
    };

    fetchCurrentUserId();
  }, [isSignedIn, userId, supabase]);

  useEffect(() => {
    setIsBookmarked(initialIsBookmarked);
  }, [initialIsBookmarked, open]);

  const fetchPost = async () => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}`);

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setPost(data.post);
      setComments(data.post.comments || []);
      setCommentsCount(data.post.comments_count || 0);
      setLikesCount(data.post.likes_count || 0);
      setIsLiked(data.post.isLiked || false);
      setIsBookmarked(data.post.isBookmarked || false);
      if (onBookmarkChange) {
        onBookmarkChange(data.post.isBookmarked || false);
      }
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Error fetching post:", err);
    } finally {
      setLoading(false);
    }
  };

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (!isSignedIn || !userId || !post || isToggling) {
      return;
    }

    setIsToggling(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // 낙관적 업데이트
    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 150);

    try {
      const url = "/api/likes";
      const method = previousLiked ? "DELETE" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post.id,
        }),
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 성공 시 데이터 새로고침
      await fetchPost();
    } catch (error) {
      // 에러 시 롤백
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error("Like toggle error:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!isSignedIn || !post) {
      return;
    }

    if (isBookmarking) {
      return;
    }

    setIsBookmarking(true);

    const previousBookmarked = isBookmarked;
    const method = isBookmarked ? "DELETE" : "POST";

    try {
      const response = await fetch(
        `/api/bookmarks${isBookmarked ? `?postId=${post.id}` : ""}`,
        {
          method,
          headers:
            method === "POST"
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
          body: method === "POST" ? JSON.stringify({ postId: post.id }) : undefined,
        }
      );

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      setIsBookmarked(!previousBookmarked);
      if (onBookmarkChange) {
        onBookmarkChange(!previousBookmarked);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
      setIsBookmarked(previousBookmarked);
    } finally {
      setIsBookmarking(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 댓글 목록 새로고침
      await fetchPost();
    } catch (error) {
      console.error("Error deleting comment:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    }
  };

  // 댓글 작성 성공 시 콜백
  const handleCommentSuccess = () => {
    fetchPost();
    // 댓글 목록 하단으로 스크롤
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 프로필 이미지 URL
  const profileImageUrl = post?.user.image_url || 
    (post?.user.clerk_id ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.clerk_id}` : "");

  const isSvg = profileImageUrl.includes("dicebear") || profileImageUrl.endsWith(".svg");

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] md:max-h-[90vh] h-full md:h-auto p-0 overflow-hidden flex flex-col md:flex-row md:rounded-lg duration-300">
        <DialogTitle className="sr-only">게시물 상세</DialogTitle>
        <DialogDescription className="sr-only">
          게시물 이미지와 댓글을 확인할 수 있습니다
        </DialogDescription>
        {loading ? (
          <div className="flex items-center justify-center w-full h-[500px] md:h-[600px]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--instagram-text-secondary)]" />
          </div>
        ) : error || !post ? (
          <div className="flex flex-col items-center justify-center w-full h-[500px] md:h-[600px] p-8">
            <p className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] mb-4">
              {error || "게시물을 불러올 수 없습니다."}
            </p>
            <Button onClick={fetchPost} variant="outline" size="sm">
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            {/* 이미지 영역 - Desktop 50%, Mobile 100% */}
            <div className="relative w-full md:w-1/2 h-[50vh] md:h-[600px] bg-black flex-shrink-0">
              <Image
                src={post.image_url}
                alt={post.caption || "게시물"}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={(e) => {
                  console.error("[PostModal] Image load error:", post.image_url);
                }}
                unoptimized={post.image_url.includes("supabase.co/storage")}
              />
            </div>

            {/* 댓글 영역 - Desktop 50%, Mobile 100% */}
            <div className="flex flex-col w-full md:w-1/2 h-[50vh] md:h-[600px] bg-white dark:bg-[var(--card)] border-t md:border-t-0 md:border-l border-[var(--instagram-border)] dark:border-[var(--border)]">
              {/* 헤더 */}
              <header className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--instagram-border)] dark:border-[var(--border)] flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${post.user.clerk_id}`} onClick={() => onOpenChange(false)}>
                    {isSvg ? (
                      <img
                        src={profileImageUrl}
                        alt={post.user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <Image
                        src={profileImageUrl}
                        alt={post.user.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                  </Link>
                  <Link href={`/profile/${post.user.clerk_id}`} onClick={() => onOpenChange(false)}>
                    <span className="font-semibold text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70">
                      {post.user.name}
                    </span>
                  </Link>
                </div>
              </header>

              {/* 댓글 목록 (스크롤 가능) */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* 캡션 */}
                {post.caption && (
                  <div className="flex gap-3">
                    <Link href={`/profile/${post.user.clerk_id}`} onClick={() => onOpenChange(false)}>
                      {isSvg ? (
                        <img
                          src={profileImageUrl}
                          alt={post.user.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <Image
                          src={profileImageUrl}
                          alt={post.user.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${post.user.clerk_id}`} onClick={() => onOpenChange(false)}>
                        <span className="font-semibold text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70 mr-2">
                          {post.user.name}
                        </span>
                      </Link>
                      {post.caption && (
                        <MentionText
                          text={post.caption}
                          mentions={post.mentions}
                          className="text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* 댓글 목록 */}
                {comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 group">
                        <Link href={`/profile/${comment.user.clerk_id || comment.user.id}`} onClick={() => onOpenChange(false)}>
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <Link href={`/profile/${comment.user.clerk_id || comment.user.id}`} onClick={() => onOpenChange(false)}>
                              <span className="font-semibold text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70">
                                {comment.user.name}
                              </span>
                            </Link>
                            <MentionText
                              text={comment.content}
                              mentions={comment.mentions}
                              className="text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                            />
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                            {currentUserId === comment.user_id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:text-[var(--instagram-like)] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
                      댓글이 없습니다.
                    </p>
                  </div>
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* 액션 버튼 및 좋아요 수 */}
              <div className="border-t border-[var(--instagram-border)] dark:border-[var(--border)] flex-shrink-0">
                <div className="h-[48px] flex items-center justify-between px-4">
                  <div className="flex items-center gap-4">
                    {isSignedIn ? (
                      <button
                        onClick={handleLikeToggle}
                        disabled={isToggling}
                        className={`
                transition-all duration-150 ease-out
                hover:scale-110 active:scale-95
                ${isAnimating ? "animate-like-pulse" : ""}
                ${isLiked ? "text-[var(--instagram-like)]" : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"}
                disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        aria-label={isLiked ? "좋아요 취소" : "좋아요"}
                      >
                        <Heart
                          className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`}
                        />
                      </button>
                    ) : (
                      <SignInButton mode="modal">
                        <button
                          className="text-[var(--instagram-text-primary)] transition-transform hover:scale-110"
                          aria-label="좋아요 (로그인 필요)"
                        >
                          <Heart className="w-6 h-6" />
                        </button>
                      </SignInButton>
                    )}
                    <button
                      className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] transition-transform hover:scale-110"
                      aria-label="댓글"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setIsShareDialogOpen(true)}
                      className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] transition-transform hover:scale-110"
                      aria-label="공유"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                  {isSignedIn ? (
                    <button
                      className={`transition-transform hover:scale-110 ${
                        isBookmarked
                          ? "text-[var(--instagram-blue)]"
                          : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                      }`}
                      aria-label={isBookmarked ? "저장 취소" : "게시물 저장"}
                      onClick={handleBookmarkToggle}
                      disabled={isBookmarking}
                    >
                      <Bookmark className={`w-6 h-6 ${isBookmarked ? "fill-current" : ""}`} />
                    </button>
                  ) : (
                    <SignInButton mode="modal">
                      <button
                        className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] transition-transform hover:scale-110"
                        aria-label="게시물 저장 (로그인 필요)"
                      >
                        <Bookmark className="w-6 h-6" />
                      </button>
                    </SignInButton>
                  )}
                </div>

                {/* 좋아요 수 */}
                {likesCount > 0 && (
                  <div className="px-4 pb-2">
                    <p className="text-sm font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                      좋아요 {likesCount.toLocaleString()}개
                    </p>
                  </div>
                )}

                {/* 시간 */}
                <div className="px-4 pb-2">
                  <p className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] uppercase">
                    {formatRelativeTime(post.created_at)}
                  </p>
                </div>

                {/* 댓글 작성 폼 */}
                <CommentForm postId={post.id} onSuccess={handleCommentSuccess} />
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {/* 공유 다이얼로그 */}
      {post && (
        <ShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/post/${post.id}`}
          title={`${post.user.name}님의 게시물`}
          text={post.caption || ""}
        />
      )}
    </Dialog>
  );
}

