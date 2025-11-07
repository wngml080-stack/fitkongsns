"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";

/**
 * @file PostGrid.tsx
 * @description 프로필 페이지 게시물 그리드 컴포넌트
 *
 * 주요 기능:
 * - 3열 그리드 레이아웃 (반응형)
 * - 1:1 정사각형 이미지
 * - Hover 시 좋아요/댓글 수 표시
 * - 클릭 시 게시물 상세 (향후 모달/페이지)
 *
 * @dependencies
 * - next/image: 이미지 최적화
 * - next/link: 게시물 상세 링크
 * - lucide-react: 아이콘
 */

interface Post {
  id: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
}

interface PostGridProps {
  userId: string; // Clerk ID
}

export default function PostGrid({ userId }: PostGridProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const fetchPosts = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/posts?userId=${userId}&page=${targetPage}&limit=12`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "게시물을 불러오는데 실패했습니다.");
      }

      const data = await response.json();
      
      if (targetPage === 1) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      
      setHasMore(data.hasMore);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] mb-4">
          {error}
        </p>
        <button
          onClick={() => fetchPosts(1)}
          className="text-[var(--instagram-blue)] hover:opacity-70 font-semibold"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
          게시물이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 게시물 그리드 */}
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="group relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer"
          >
            <Image
              src={post.image_url}
              alt="게시물"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
            />
            {/* Hover 오버레이 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5 fill-current" />
                <span className="font-semibold">{post.likes_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5 fill-current" />
                <span className="font-semibold">{post.comments_count.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 더 보기 버튼 (게시물이 많을 경우) */}
      {hasMore && (
        <div className="text-center py-8">
          <button
            onClick={() => fetchPosts(page + 1)}
            className="text-[var(--instagram-blue)] hover:opacity-70 font-semibold"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}

