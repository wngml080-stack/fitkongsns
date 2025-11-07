"use client";

import { useEffect, useState } from "react";
import PostCard from "./PostCard";
import PostCardSkeleton from "./PostCardSkeleton";

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

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/posts?page=${page}&limit=10`);
      
      if (!response.ok) {
        // API에서 반환한 실제 오류 메시지 가져오기
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "게시물을 불러오는데 실패했습니다.";
        throw new Error(errorMessage);
      }

      const data: PostsResponse = await response.json();
      setPosts(data.posts);
      setHasMore(data.hasMore);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="text-center py-12">
        <p className="text-[var(--instagram-text-secondary)] mb-4">{error}</p>
        <button
          onClick={fetchPosts}
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
        <p className="text-[var(--instagram-text-secondary)]">
          아직 게시물이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

