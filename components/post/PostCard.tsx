"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-time";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { SignInButton } from "@clerk/nextjs";
import CommentForm from "@/components/comment/CommentForm";

/**
 * @file PostCard.tsx
 * @description Instagram 스타일의 게시물 카드 컴포넌트
 *
 * 주요 기능:
 * - 헤더: 프로필 이미지, 사용자명, 시간, 메뉴
 * - 이미지 영역: 1:1 정사각형
 * - 액션 버튼: 좋아요, 댓글, 공유, 북마크
 * - 컨텐츠: 좋아요 수, 캡션, 댓글 미리보기
 *
 * @dependencies
 * - next/image: 이미지 최적화
 * - lucide-react: 아이콘
 * - lib/utils/format-time: 상대 시간 포맷팅
 */

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id?: string; // 삭제 버튼 표시를 위해 추가
  user: {
    id: string;
    name: string;
  };
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
  user: PostUser;
  comments: Comment[];
  isLiked?: boolean; // 선택적: 초기 로드 시 좋아요 상태
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { isSignedIn, userId } = useAuth();
  const supabase = useClerkSupabaseClient();
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const lastTapRef = useRef<number>(0);
  const imageRef = useRef<HTMLDivElement>(null);

  // 초기 좋아요 상태 확인
  useEffect(() => {
    if (!isSignedIn || !userId) {
      setIsLiked(false);
      return;
    }

    const checkLikeStatus = async () => {
      try {
        // API를 통해 좋아요 상태 확인
        const response = await fetch(`/api/likes?post_id=${post.id}`);
        
        if (!response.ok) {
          // 에러는 무시 (좋아요가 없는 경우)
          return;
        }

        const data = await response.json();
        setIsLiked(data.isLiked || false);
      } catch (error) {
        // 에러 무시 (좋아요가 없는 경우)
        console.log("Like status check:", error);
      }
    };

    checkLikeStatus();
  }, [isSignedIn, userId, post.id]);

  // 좋아요 토글 함수
  const handleLikeToggle = async () => {
    if (!isSignedIn) {
      return; // SignInButton으로 감싸서 처리
    }

    if (isToggling) return; // 중복 클릭 방지

    setIsToggling(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // 낙관적 업데이트
    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);
    setIsAnimating(true);

    try {
      const url = "/api/likes";
      const method = previousLiked ? "DELETE" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post_id: post.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "좋아요 처리에 실패했습니다.");
      }

      // 성공 시 애니메이션 종료
      setTimeout(() => {
        setIsAnimating(false);
      }, 150);
    } catch (error) {
      // 에러 시 롤백
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      setIsAnimating(false);
      console.error("Like toggle error:", error);
      alert(error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.");
    } finally {
      setIsToggling(false);
    }
  };

  // 더블탭 좋아요 (모바일)
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // 더블탭 감지
      if (!isLiked && isSignedIn) {
        handleLikeToggle();
        setShowDoubleTapHeart(true);
        setTimeout(() => {
          setShowDoubleTapHeart(false);
        }, 1000);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // 현재 사용자의 Supabase user_id 가져오기
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUserId = async () => {
      if (!isSignedIn || !userId) {
        setCurrentUserId(null);
        return;
      }

      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();

        setCurrentUserId(userData?.id || null);
      } catch (error) {
        console.error("Error fetching current user ID:", error);
        setCurrentUserId(null);
      }
    };

    fetchCurrentUserId();
  }, [isSignedIn, userId, supabase]);

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "댓글 삭제에 실패했습니다.");
      }

      // 댓글 목록 새로고침
      await refreshComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert(error instanceof Error ? error.message : "댓글 삭제에 실패했습니다.");
    }
  };

  // 댓글 목록 새로고침
  const refreshComments = async () => {
    try {
      // 게시물의 댓글 최신 2개 가져오기
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("post_id", post.id)
        .order("created_at", { ascending: false })
        .limit(2);

      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
        return;
      }

      // 댓글 작성자 정보 가져오기
      const commentUserIds = [
        ...new Set((commentsData || []).map((c: any) => c.user_id)),
      ];
      const { data: commentUsersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", commentUserIds);

      // 댓글과 사용자 정보 조합
      const commentsWithUsers = (commentsData || []).map((comment: any) => {
        const user = commentUsersData?.find((u) => u.id === comment.user_id);
        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id, // 삭제 버튼 표시를 위해 추가
          user: {
            id: user?.id || comment.user_id,
            name: user?.name || "Unknown",
          },
        };
      });

      setComments(commentsWithUsers);

      // 댓글 수 업데이트
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);

      setCommentsCount(count || 0);
    } catch (error) {
      console.error("Error refreshing comments:", error);
    }
  };

  // 캡션이 2줄을 초과하는지 확인 (대략적인 계산)
  const captionLines = post.caption ? Math.ceil(post.caption.length / 50) : 0;
  const shouldTruncate = captionLines > 2;

  // 표시할 캡션
  const displayCaption = shouldTruncate && !showFullCaption
    ? post.caption?.substring(0, 100) + "..."
    : post.caption;

  // 프로필 이미지 URL (Clerk 또는 기본 아바타)
  const profileImageUrl = post.user.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.clerk_id}`;

  return (
    <article className="bg-white dark:bg-[var(--card)] border border-[var(--instagram-border)] dark:border-[var(--border)] rounded-sm mb-4">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--instagram-border)] dark:border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user.id}`}>
            <Image
              src={profileImageUrl}
              alt={post.user.name}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          </Link>
          <div className="flex flex-col">
            <Link
              href={`/profile/${post.user.id}`}
              className="font-semibold text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70"
            >
              {post.user.name}
            </Link>
            <span className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>
        <button
          className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70"
          aria-label="더보기 메뉴"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </header>

      {/* 이미지 영역 */}
      <div
        ref={imageRef}
        className="relative w-full aspect-square bg-gray-100 cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        <Image
          src={post.image_url}
          alt={post.caption || "게시물 이미지"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 630px"
          draggable={false}
        />
        {/* 더블탭 하트 애니메이션 */}
        {showDoubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart
              className="w-24 h-24 text-[var(--instagram-like)] fill-current"
              style={{
                animation: "doubleTapHeart 1s ease-out",
              }}
            />
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="h-[48px] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <button
              onClick={handleLikeToggle}
              disabled={isToggling}
              className={`
                transition-all duration-150
                hover:scale-110
                ${isAnimating ? "scale-[1.3]" : ""}
                ${isLiked ? "text-[var(--instagram-like)]" : "text-[var(--instagram-text-primary)]"}
                disabled:opacity-50
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
            className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] transition-transform hover:scale-110"
            aria-label="공유"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        <button
          className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] transition-transform hover:scale-110"
          aria-label="북마크"
        >
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="px-4 pb-4 space-y-2">
        {/* 좋아요 수 */}
        {likesCount > 0 && (
          <div className="font-semibold text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
            좋아요 {likesCount.toLocaleString()}개
          </div>
        )}

        {/* 캡션 */}
        {post.caption && (
          <div className="text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
            <Link
              href={`/profile/${post.user.id}`}
              className="font-semibold hover:opacity-70 mr-2"
            >
              {post.user.name}
            </Link>
            <span>{displayCaption}</span>
            {shouldTruncate && !showFullCaption && (
              <button
                onClick={() => setShowFullCaption(true)}
                className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:text-[var(--instagram-text-primary)] dark:hover:text-[var(--foreground)] ml-1"
              >
                더 보기
              </button>
            )}
          </div>
        )}

        {/* 댓글 미리보기 */}
        {commentsCount > 0 && (
          <div className="space-y-1">
            {commentsCount > 2 && (
              <button className="text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:text-[var(--instagram-text-primary)] dark:hover:text-[var(--foreground)]">
                댓글 {commentsCount}개 모두 보기
              </button>
            )}
            {comments.slice(0, 2).map((comment) => {
              const isOwnComment = currentUserId && comment.user_id === currentUserId;
              return (
                <div
                  key={comment.id}
                  className="flex items-start justify-between gap-2 group"
                >
                  <div className="flex-1 text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                    <Link
                      href={`/profile/${comment.user.id}`}
                      className="font-semibold hover:opacity-70 mr-2"
                    >
                      {comment.user.name}
                    </Link>
                    <span>{comment.content}</span>
                  </div>
                  {isOwnComment && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:text-[var(--instagram-like)]"
                      aria-label="댓글 삭제"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 댓글 작성 폼 */}
      <CommentForm postId={post.id} onSuccess={refreshComments} />
    </article>
  );
}

