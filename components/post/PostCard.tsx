"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-time";
import { useState } from "react";

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
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLiked, setIsLiked] = useState(false); // 향후 좋아요 기능에서 실제 상태로 변경

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
    <article className="bg-white border border-[var(--instagram-border)] rounded-sm mb-4">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--instagram-border)]">
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
              className="font-semibold text-sm text-[var(--instagram-text-primary)] hover:opacity-70"
            >
              {post.user.name}
            </Link>
            <span className="text-xs text-[var(--instagram-text-secondary)]">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>
        <button
          className="text-[var(--instagram-text-primary)] hover:opacity-70"
          aria-label="더보기 메뉴"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </header>

      {/* 이미지 영역 */}
      <div className="relative w-full aspect-square bg-gray-100">
        <Image
          src={post.image_url}
          alt={post.caption || "게시물 이미지"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 630px"
        />
      </div>

      {/* 액션 버튼 */}
      <div className="h-[48px] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            className={`transition-transform hover:scale-110 ${
              isLiked ? "text-[var(--instagram-like)]" : "text-[var(--instagram-text-primary)]"
            }`}
            aria-label="좋아요"
          >
            <Heart
              className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`}
            />
          </button>
          <button
            className="text-[var(--instagram-text-primary)] transition-transform hover:scale-110"
            aria-label="댓글"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
          <button
            className="text-[var(--instagram-text-primary)] transition-transform hover:scale-110"
            aria-label="공유"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        <button
          className="text-[var(--instagram-text-primary)] transition-transform hover:scale-110"
          aria-label="북마크"
        >
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="px-4 pb-4 space-y-2">
        {/* 좋아요 수 */}
        {post.likes_count > 0 && (
          <div className="font-semibold text-sm text-[var(--instagram-text-primary)]">
            좋아요 {post.likes_count.toLocaleString()}개
          </div>
        )}

        {/* 캡션 */}
        {post.caption && (
          <div className="text-sm text-[var(--instagram-text-primary)]">
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
                className="text-[var(--instagram-text-secondary)] hover:text-[var(--instagram-text-primary)] ml-1"
              >
                더 보기
              </button>
            )}
          </div>
        )}

        {/* 댓글 미리보기 */}
        {post.comments_count > 0 && (
          <div className="space-y-1">
            {post.comments_count > 2 && (
              <button className="text-sm text-[var(--instagram-text-secondary)] hover:text-[var(--instagram-text-primary)]">
                댓글 {post.comments_count}개 모두 보기
              </button>
            )}
            {post.comments.slice(0, 2).map((comment) => (
              <div key={comment.id} className="text-sm text-[var(--instagram-text-primary)]">
                <Link
                  href={`/profile/${comment.user.id}`}
                  className="font-semibold hover:opacity-70 mr-2"
                >
                  {comment.user.name}
                </Link>
                <span>{comment.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

