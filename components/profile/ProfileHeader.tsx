"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getUserFriendlyErrorMessage, extractErrorMessage } from "@/lib/utils/error-handler";

/**
 * @file ProfileHeader.tsx
 * @description 프로필 페이지 헤더 컴포넌트
 *
 * 주요 기능:
 * - 프로필 이미지 (Desktop 150px / Mobile 90px)
 * - 사용자명
 * - 통계 (게시물 수, 팔로워 수, 팔로잉 수)
 * - 팔로우/언팔로우 버튼
 * - 본인 프로필 판단
 *
 * @dependencies
 * - next/image: 프로필 이미지
 * - components/ui/button: 버튼 컴포넌트
 * - @clerk/nextjs: 인증 상태 확인
 */

interface ProfileHeaderProps {
  userId: string; // Clerk ID
}

interface UserData {
  id: string; // Supabase UUID
  clerk_id: string;
  name: string;
  image_url: string | null;
  posts_count: number;
  followers_count: number;
  following_count: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
}

export default function ProfileHeader({ userId }: ProfileHeaderProps) {
  const { userId: currentClerkId } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const [hoverUnfollow, setHoverUnfollow] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`);
      
      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setUserData(data.user);
      setIsFollowing(data.user.isFollowing);
      setFollowersCount(data.user.followers_count);
    } catch (err) {
      const errorMessage = getUserFriendlyErrorMessage(err);
      setError(errorMessage);
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentClerkId || !userData || userData.isOwnProfile || isToggling) {
      return;
    }

    setIsToggling(true);
    const previousFollowing = isFollowing;
    const previousCount = followersCount;

    // 낙관적 업데이트
    setIsFollowing(!previousFollowing);
    setFollowersCount(previousFollowing ? previousCount - 1 : previousCount + 1);

    try {
      const url = "/api/follows";
      const method = previousFollowing ? "DELETE" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          following_id: userData.clerk_id, // Clerk ID 전달
        }),
      });

      if (!response.ok) {
        const errorMessage = await extractErrorMessage(response);
        throw new Error(errorMessage);
      }

      // 성공 시 데이터 새로고침 (정확한 통계를 위해)
      await fetchUserData();
    } catch (error) {
      // 에러 시 롤백
      setIsFollowing(previousFollowing);
      setFollowersCount(previousCount);
      console.error("Follow toggle error:", error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      alert(errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-6 md:gap-12">
            {/* 프로필 이미지 Skeleton */}
            <div className="w-[90px] h-[90px] md:w-[150px] md:h-[150px] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mx-auto md:mx-0" />
            {/* 정보 Skeleton */}
            <div className="flex-1 space-y-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex gap-6">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="w-full py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] mb-4">
            {error || "사용자 정보를 불러올 수 없습니다."}
          </p>
          <Button onClick={fetchUserData} variant="outline" size="sm">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // 프로필 이미지 URL (Clerk 또는 기본 아바타)
  const profileImageUrl = userData.image_url || 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.clerk_id}`;

  // SVG 이미지는 unoptimized 옵션 사용
  const isSvg = profileImageUrl.includes("dicebear") || profileImageUrl.endsWith(".svg");

  return (
    <div className="w-full py-8 px-4 border-b border-[var(--instagram-border)] dark:border-[var(--border)]">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 md:gap-12">
          {/* 프로필 이미지 */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {isSvg ? (
              <img
                src={profileImageUrl}
                alt={userData.name}
                className="w-[90px] h-[90px] md:w-[150px] md:h-[150px] rounded-full object-cover"
              />
            ) : (
              <Image
                src={profileImageUrl}
                alt={userData.name}
                width={150}
                height={150}
                className="w-[90px] h-[90px] md:w-[150px] md:h-[150px] rounded-full object-cover"
              />
            )}
          </div>

          {/* 사용자 정보 */}
          <div className="flex-1 space-y-4">
            {/* 사용자명 및 팔로우 버튼 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-light text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                {userData.name}
              </h1>
              
              {!userData.isOwnProfile && (
                currentClerkId ? (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={isToggling}
                    className={`
                      ${isFollowing
                        ? hoverUnfollow
                          ? "bg-transparent border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          : "bg-gray-200 dark:bg-gray-700 text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-300 dark:hover:bg-gray-600"
                        : "bg-[var(--instagram-blue)] hover:bg-[var(--instagram-blue)]/90 text-white"
                      }
                      font-semibold px-6
                      disabled:opacity-50
                    `}
                    onMouseEnter={() => {
                      if (isFollowing) {
                        setHoverUnfollow(true);
                      }
                    }}
                    onMouseLeave={() => setHoverUnfollow(false)}
                  >
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <>
                        {isFollowing
                          ? hoverUnfollow
                            ? "언팔로우"
                            : "팔로잉"
                          : "팔로우"
                        }
                      </>
                    )}
                  </Button>
                ) : (
                  <SignInButton mode="modal">
                    <Button
                      className="bg-[var(--instagram-blue)] hover:bg-[var(--instagram-blue)]/90 text-white font-semibold px-6"
                    >
                      팔로우
                    </Button>
                  </SignInButton>
                )
              )}
            </div>

            {/* 통계 */}
            <div className="flex gap-6 md:gap-10">
              <div className="text-center md:text-left">
                <span className="font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                  {userData.posts_count.toLocaleString()}
                </span>
                <span className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] ml-1">
                  게시물
                </span>
              </div>
              <button className="text-center md:text-left hover:opacity-70 transition-opacity">
                <span className="font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                  {followersCount.toLocaleString()}
                </span>
                <span className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] ml-1">
                  팔로워
                </span>
              </button>
              <button className="text-center md:text-left hover:opacity-70 transition-opacity">
                <span className="font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                  {userData.following_count.toLocaleString()}
                </span>
                <span className="text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] ml-1">
                  팔로잉
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

