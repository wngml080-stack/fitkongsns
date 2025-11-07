import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

/**
 * @file route.ts
 * @description 사용자 정보 조회 API
 *
 * GET: 사용자 정보 및 통계 조회
 * - URL 파라미터: userId (Clerk ID)
 * - user_stats 뷰에서 통계 정보 조회
 * - 현재 로그인한 사용자의 팔로우 상태 확인
 * - Clerk에서 프로필 이미지 가져오기
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetClerkId } = await params;

    if (!targetClerkId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 현재 로그인한 사용자 (선택적, 팔로우 상태 확인용)
    const { userId: currentClerkId } = await auth();

    // Supabase 클라이언트 (공개 데이터)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // user_stats 뷰에서 사용자 정보 및 통계 조회
    const { data: userStats, error: userStatsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("clerk_id", targetClerkId)
      .single();

    if (userStatsError || !userStats) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Clerk에서 프로필 이미지 가져오기 (선택적)
    let profileImageUrl: string | null = null;
    try {
      const clerkClientInstance = await clerkClient();
      const clerkUser = await clerkClientInstance.users.getUser(targetClerkId);
      profileImageUrl = clerkUser.imageUrl || null;
    } catch (err) {
      // Clerk 사용자를 찾을 수 없는 경우 무시
      console.warn("Failed to fetch Clerk user image:", err);
    }

    // 현재 로그인한 사용자가 이 사용자를 팔로우하는지 확인
    let isFollowing = false;
    if (currentClerkId && currentClerkId !== targetClerkId) {
      try {
        // 현재 사용자의 Supabase user_id 조회
        const { data: currentUser } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", currentClerkId)
          .single();

        if (currentUser) {
          // 팔로우 상태 확인
          const { data: followData } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUser.id)
            .eq("following_id", userStats.user_id)
            .single();

          isFollowing = !!followData;
        }
      } catch (err) {
        // 팔로우 상태 확인 실패 시 무시 (로그인하지 않은 사용자도 프로필을 볼 수 있어야 함)
        console.warn("Failed to check follow status:", err);
      }
    }

    return NextResponse.json({
      user: {
        id: userStats.user_id,
        clerk_id: userStats.clerk_id,
        name: userStats.name,
        image_url: profileImageUrl,
        posts_count: userStats.posts_count || 0,
        followers_count: userStats.followers_count || 0,
        following_count: userStats.following_count || 0,
        isFollowing,
        isOwnProfile: currentClerkId === targetClerkId,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/users/[userId]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

