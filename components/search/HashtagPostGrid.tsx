"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface HashtagPostGridProps {
  hashtag: string; // 소문자, '#' 제외된 태그
}

export default function HashtagPostGrid({ hashtag }: HashtagPostGridProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hashtag) {
      setPosts([]);
      setHasMore(false);
      return;
    }
    fetchPosts(1, hashtag);
  }, [hashtag]);

  const fetchPosts = async (targetPage: number, targetHashtag: string, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1초

    try {
      setLoading(true);
      setError(null);

      const url = `/api/posts?hashtag=${encodeURIComponent(targetHashtag)}&page=${targetPage}&limit=12`;
      console.log("[HashtagPostGrid] Fetching posts:", { url, targetHashtag, targetPage, retryCount });

      // 타임아웃 설정 (10초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("[HashtagPostGrid] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[HashtagPostGrid] API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        const errorMessage = errorData.error || await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("[HashtagPostGrid] Received data:", {
        postsCount: data.posts?.length || 0,
        hasMore: data.hasMore,
        page: data.page,
      });

      if (targetPage === 1) {
        setPosts(data.posts || []);
        setImageErrors(new Set()); // 새 페이지 로드 시 이미지 에러 상태 초기화
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.hasMore || false);
      setPage(data.page || targetPage);
    } catch (err) {
      // 타임아웃 에러 처리
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError = new Error("요청 시간이 초과되었습니다. 다시 시도해주세요.");
        if (retryCount < MAX_RETRIES) {
          console.log(`[HashtagPostGrid] Timeout, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return fetchPosts(targetPage, targetHashtag, retryCount + 1);
        }
        setError(getUserFriendlyErrorMessage(timeoutError));
        return;
      }

      // 네트워크 에러이고 재시도 횟수가 남아있으면 재시도
      if (
        (err instanceof TypeError && err.message.includes("fetch")) ||
        (err instanceof Error && err.message.includes("Failed to fetch")) ||
        (err instanceof Error && err.message.includes("network"))
      ) {
        if (retryCount < MAX_RETRIES) {
          console.log(`[HashtagPostGrid] Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          return fetchPosts(targetPage, targetHashtag, retryCount + 1);
        }
      }

      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("[HashtagPostGrid] Error fetching hashtag posts:", {
        error: err,
        hashtag: targetHashtag,
        page: targetPage,
        retryCount,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hashtag) {
    return null;
  }

  if (loading && posts.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
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
          onClick={() => fetchPosts(1, hashtag)}
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
          해당 해시태그로 등록된 게시물이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="group relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden"
          >
            {imageErrors.has(post.id) ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <span className="text-gray-400 text-sm">이미지를 불러올 수 없습니다</span>
              </div>
            ) : (
              <Image
                src={post.image_url}
                alt={post.caption || "게시물"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 200px"
                unoptimized={post.image_url?.includes("supabase.co/storage") || post.image_url?.includes("supabase.co/storage/v1/object/public")}
                onError={() => {
                  console.error("[HashtagPostGrid] Image load error:", {
                    imageUrl: post.image_url,
                    postId: post.id,
                  });
                  setImageErrors((prev) => new Set(prev).add(post.id));
                }}
              />
            )}
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

      {hasMore && (
        <div className="text-center py-8">
          <button
            onClick={() => fetchPosts(page + 1, hashtag)}
            className="text-[var(--instagram-blue)] hover:opacity-70 font-semibold"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
