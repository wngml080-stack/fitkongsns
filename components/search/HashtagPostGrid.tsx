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

  useEffect(() => {
    if (!hashtag) {
      setPosts([]);
      setHasMore(false);
      return;
    }
    fetchPosts(1, hashtag);
  }, [hashtag]);

  const fetchPosts = async (targetPage: number, targetHashtag: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/posts?hashtag=${encodeURIComponent(targetHashtag)}&page=${targetPage}&limit=12`
      );

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (targetPage === 1) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }

      setHasMore(data.hasMore);
      setPage(data.page || targetPage);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Error fetching hashtag posts:", err);
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
            <Image
              src={post.image_url}
              alt={post.caption || "게시물"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
            />
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
