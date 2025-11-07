"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";

/**
 * @file PostFeed.tsx
 * @description 게시물 목록 피드 컴포넌트
 *
 * 주요 기능:
 * - 게시물 목록 표시
 * - 시간 역순 정렬 (API에서 처리)
 * - 로딩 상태: PostCardSkeleton 표시
 * - 빈 상태 처리
 *
 * @dependencies
 * - components/post/PostCard: 게시물 카드 컴포넌트
 * - components/post/PostCardSkeleton: 로딩 UI
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
  isLiked?: boolean; // 선택적: 초기 로드 시 좋아요 상태
}

interface PostsResponse {
  posts: Post[];
  hasMore: boolean;
  page: number;
}

export default function PostFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 초기 로드
  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  // 게시물 작성 후 피드 새로고침
  useEffect(() => {
    const handlePostCreated = () => {
      fetchPosts(1, true);
    };

    window.addEventListener("postCreated", handlePostCreated);
    return () => {
      window.removeEventListener("postCreated", handlePostCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 무한 스크롤을 위한 Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  const fetchPosts = async (targetPage: number, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await fetch(`/api/posts?page=${targetPage}&limit=10`);
      
      if (!response.ok) {
        // 사용자 친화적 에러 메시지 추출
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data: PostsResponse = await response.json();
      
      if (isInitial) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      
      setHasMore(data.hasMore);
      setPage(data.page);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMorePosts = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(page + 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, isLoadingMore]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] mb-4">
          {error}
        </p>
        <button
          onClick={() => fetchPosts(1, true)}
          className="text-[var(--instagram-blue)] hover:opacity-70 font-semibold px-4 py-2 rounded-md bg-[var(--instagram-blue)]/10 hover:bg-[var(--instagram-blue)]/20 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
          아직 게시물이 없습니다.
        </p>
      </div>
    );
  }

  // 게시물 삭제 핸들러
  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDelete={handlePostDelete} />
      ))}
      
      {/* 무한 스크롤 감지용 요소 */}
      {hasMore && (
        <div ref={observerTarget} className="h-4" />
      )}
      
      {/* 추가 로딩 중 표시 */}
      {isLoadingMore && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <PostCardSkeleton key={`loading-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}

