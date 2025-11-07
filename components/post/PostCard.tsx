"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-time";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";
import { SignInButton } from "@clerk/nextjs";
import CommentForm from "@/components/comment/CommentForm";
import PostModal from "./PostModal";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";
import ShareDialog from "./ShareDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MentionText, { MentionItem } from "@/components/ui/MentionText";

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
  user: PostUser;
  comments: Comment[];
  isLiked?: boolean; // 선택적: 초기 로드 시 좋아요 상태
  isBookmarked?: boolean;
  mentions?: MentionItem[];
}

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void; // 삭제 후 콜백
}

export default function PostCard({ post, onDelete }: PostCardProps) {
  const { isSignedIn, userId } = useAuth();
  const supabase = useClerkSupabaseClient();
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || post.isLiked === undefined);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const lastTapRef = useRef<number>(0);
  const imageRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false);

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

  useEffect(() => {
    setIsBookmarked(post.isBookmarked ?? false);
  }, [post.isBookmarked]);

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
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
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
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!isSignedIn) {
      return;
    }

    if (isBookmarking) {
      return;
    }

    setIsBookmarking(true);

    try {
      const method = isBookmarked ? "DELETE" : "POST";
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

      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    } finally {
      setIsBookmarking(false);
    }
  };

  // 더블탭 좋아요 (모바일)
  const handleDoubleTap = () => {
    if (!isSignedIn || !userId) {
      return; // 로그인하지 않은 사용자는 좋아요 불가
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // 더블탭 감지
      // 싱글탭으로 인한 모달 열기 취소
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (!isLiked) {
        handleLikeToggle();
      }
        setShowDoubleTapHeart(true);
        setTimeout(() => {
          setShowDoubleTapHeart(false);
        }, 1000);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // 이미지 싱글탭 핸들러
  const handleImageClick = () => {
    // 더블탭 체크를 위해 약간의 지연
    clickTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      // 더블탭이 아닌 경우에만 모달 열기 (300ms 이상 지난 경우)
      if (timeSinceLastTap > 300 || lastTapRef.current === 0) {
        setIsModalOpen(true);
      }
    }, 300);
  };

  // 게시물 삭제 핸들러
  const handleDelete = async () => {
    if (!isOwnPost || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 삭제 성공
      setIsDeleteDialogOpen(false);
      
      // 콜백 호출 (피드에서 게시물 제거)
      if (onDelete) {
        onDelete(post.id);
      } else {
        // 콜백이 없으면 페이지 새로고침
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // 현재 사용자의 Supabase user_id 가져오기 및 본인 게시물 확인
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnPost, setIsOwnPost] = useState(false);

  useEffect(() => {
    const fetchCurrentUserIdAndCheckOwnership = async () => {
      if (!isSignedIn || !userId) {
        setCurrentUserId(null);
        setIsOwnPost(false);
        return;
      }

      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();

        if (userData) {
          setCurrentUserId(userData.id);
          setIsOwnPost(userData.id === post.user_id);
        } else {
          setCurrentUserId(null);
          setIsOwnPost(false);
        }
      } catch (error) {
        console.error("Error fetching current user ID:", error);
        setCurrentUserId(null);
        setIsOwnPost(false);
      }
    };

    fetchCurrentUserIdAndCheckOwnership();
  }, [isSignedIn, userId, post.user_id, supabase]);

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
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 댓글 목록 새로고침
      await refreshComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    }
  };

  // 댓글 목록 새로고침
  const refreshComments = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`);

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const latestPost = data.post;

      setComments((latestPost.comments || []).slice(0, 2));
      setCommentsCount(latestPost.comments_count || 0);

      if (typeof latestPost.isBookmarked === "boolean") {
        setIsBookmarked(latestPost.isBookmarked);
      }
    } catch (error) {
      console.error("Error refreshing comments:", error);
    }
  };

  // 캡션이 2줄을 초과하는지 확인 (대략적인 계산)
  const captionLines = post.caption ? Math.ceil(post.caption.length / 50) : 0;
  const shouldTruncate = captionLines > 2;

  const isCaptionTruncated = shouldTruncate && !showFullCaption;
  const displayCaption = isCaptionTruncated
    ? post.caption?.substring(0, 100) + "..."
    : post.caption;
  const captionMentions = (post.mentions || []).filter((mention) =>
    displayCaption?.toLowerCase().includes(`@${mention.display_text.toLowerCase()}`)
  );

  // 프로필 이미지 URL (Clerk 또는 기본 아바타)
  const profileImageUrl = post.user.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.clerk_id}`;
  const isSvg = profileImageUrl.includes("dicebear") || profileImageUrl.endsWith(".svg");

  return (
    <article className="card-3d bg-white dark:bg-[var(--card)] border-x-0 md:border-x border-t border-b border-[var(--instagram-border)] dark:border-[var(--border)] rounded-none md:rounded-sm mb-0 md:mb-4">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--instagram-border)] dark:border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.user.clerk_id || post.user.id}`}>
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
                className="rounded-full object-cover"
                unoptimized={profileImageUrl.includes("supabase.co/storage")}
              />
            )}
          </Link>
          <div className="flex flex-col">
            <Link
              href={`/profile/${post.user.clerk_id || post.user.id}`}
              className="font-semibold text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70"
            >
              {post.user.name}
            </Link>
            <span className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>
        {isOwnPost ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
        <button
          className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70"
          aria-label="더보기 메뉴"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            className="text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:opacity-70 opacity-0"
            aria-label="더보기 메뉴"
            disabled
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* 이미지 영역 */}
      <div
        ref={imageRef}
        className="relative w-full aspect-square bg-gray-100 cursor-pointer select-none image-3d"
        onDoubleClick={handleDoubleTap}
        onClick={handleImageClick}
      >
        <Image
          src={post.image_url}
          alt={post.caption || "게시물 이미지"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 630px"
          draggable={false}
          onError={(e) => {
            console.error("[PostCard] Image load error:", post.image_url);
            // 이미지 로드 실패 시 기본 이미지로 대체하거나 에러 처리
          }}
          unoptimized={post.image_url.includes("supabase.co/storage")}
        />
        {/* 더블탭 하트 애니메이션 */}
        {showDoubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <Heart
              className="w-20 h-20 md:w-24 md:h-24 text-[var(--instagram-like)] fill-current drop-shadow-lg"
              style={{
                animation: "doubleTapHeart 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
                button-3d transition-all duration-150 ease-out
                hover:scale-110 active:scale-95
                ${isAnimating ? "animate-like-pulse" : ""}
                ${isLiked ? "text-[var(--instagram-like)] glow-3d" : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"}
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
            onClick={() => setIsModalOpen(true)}
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
            onClick={handleBookmarkToggle}
            disabled={isBookmarking}
            className={`transition-transform hover:scale-110 ${
              isBookmarked
                ? "text-[var(--instagram-blue)]"
                : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
            }`}
            aria-label={isBookmarked ? "저장 취소" : "게시물 저장"}
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
          <div className="px-4 pb-2 space-y-2">
            <MentionText
              text={displayCaption || ""}
              mentions={isCaptionTruncated ? captionMentions : post.mentions}
              className="text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] break-words"
            />
            {shouldTruncate && !showFullCaption && (
              <button
                type="button"
                onClick={() => setShowFullCaption(true)}
                className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:underline"
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
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:text-[var(--instagram-text-primary)] dark:hover:text-[var(--foreground)]"
              >
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
                  <div className="flex-1">
                    <Link
                      href={`/profile/${comment.user.clerk_id || comment.user.id}`}
                      className="font-semibold hover:opacity-70 mr-2"
                    >
                      {comment.user.name}
                    </Link>
                    <MentionText
                      text={comment.content}
                      mentions={comment.mentions}
                      className="text-sm text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                    />
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

      {/* 게시물 상세 모달 */}
      <PostModal
        postId={post.id}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialLikesCount={likesCount}
        initialIsLiked={isLiked}
        onLikeChange={(liked, updatedLikesCount) => {
          setIsLiked(liked);
          setLikesCount(updatedLikesCount);
        }}
        initialIsBookmarked={isBookmarked}
        onBookmarkChange={(bookmarked) => {
          setIsBookmarked(bookmarked);
        }}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>게시물 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공유 다이얼로그 */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/post/${post.id}`}
        title={`${post.user.name}님의 게시물`}
        text={post.caption || ""}
      />
    </article>
  );
}

