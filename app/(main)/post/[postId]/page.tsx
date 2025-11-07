"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PostModal from "@/components/post/PostModal";
import { Loader2 } from "lucide-react";

/**
 * @file page.tsx
 * @description 게시물 상세 페이지
 *
 * URL 파라미터에서 postId를 가져와서 PostModal을 표시합니다.
 * 모달이 아닌 전체 페이지로 표시됩니다.
 */

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = (params.postId as string) || null;
  const [isLoading, setIsLoading] = useState(true);
  const [postData, setPostData] = useState<{
    likesCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
  } | null>(null);

  // 게시물 기본 정보 가져오기
  useEffect(() => {
    if (!postId) {
      router.push("/");
      return;
    }

    const fetchPostData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts/${postId}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push("/");
            return;
          }
          throw new Error("게시물을 불러올 수 없습니다.");
        }

        const data = await response.json();
        setPostData({
          likesCount: data.post.likes_count || 0,
          isLiked: data.post.isLiked || false,
          isBookmarked: data.post.isBookmarked || false,
        });
      } catch (error) {
        console.error("Error fetching post:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostData();
  }, [postId, router]);

  if (isLoading || !postId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--instagram-text-secondary)]" />
      </div>
    );
  }

  if (!postData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <PostModal
        postId={postId}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            router.push("/");
          }
        }}
        initialLikesCount={postData.likesCount}
        initialIsLiked={postData.isLiked}
        initialIsBookmarked={postData.isBookmarked}
      />
    </div>
  );
}

