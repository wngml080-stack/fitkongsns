"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";

interface PostSummary {
  id: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
}

export default function LikedPostGrid() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts(1);
  }, []);

  const fetchPosts = async (targetPage: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/posts/liked?page=${targetPage}`);

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (targetPage === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      }

      setHasMore(data.hasMore);
      setPage(data.page || targetPage);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Error fetching liked posts:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
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
          좋아요한 게시물이 없습니다.
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
              alt="좋아요한 게시물"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
              unoptimized={post.image_url?.includes("supabase.co/storage") || post.image_url?.includes("supabase.co/storage/v1/object/public")}
              onError={() => {
                console.error("[LikedPostGrid] Image load error:", post.image_url);
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
              <span className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5 fill-current" />
                <span className="font-semibold">{post.likes_count.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5 fill-current" />
                <span className="font-semibold">{post.comments_count.toLocaleString()}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

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
