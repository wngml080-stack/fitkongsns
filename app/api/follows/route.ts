import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * @file route.ts
 * @description 팔로우 API
 *
 * POST: 팔로우 추가
 * - Clerk 인증 확인
 * - 자기 자신 팔로우 방지
 * - 중복 팔로우 방지 (UNIQUE 제약)
 *
 * DELETE: 팔로우 제거
 * - Clerk 인증 확인
 * - 본인만 자신의 팔로우 제거 가능
 *
 * 요청 본문: { following_id: string } (Clerk ID)
 */

export async function POST(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId: currentClerkId } = await auth();
    if (!currentClerkId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { following_id: targetClerkId } = body;

    if (!targetClerkId) {
      return NextResponse.json(
        { error: "팔로우할 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 자기 자신 팔로우 방지
    if (currentClerkId === targetClerkId) {
      return NextResponse.json(
        { error: "자기 자신을 팔로우할 수 없습니다." },
        { status: 400 }
      );
    }

    // Supabase Service Role 클라이언트 사용
    const supabase = getServiceRoleClient();

    // 현재 사용자의 Supabase user_id 조회
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", currentClerkId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 팔로우할 사용자의 Supabase user_id 조회
    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", targetClerkId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: "팔로우할 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 팔로우 추가
    const { data: followData, error: followError } = await supabase
      .from("follows")
      .insert({
        follower_id: currentUser.id,
        following_id: targetUser.id,
      })
      .select()
      .single();

    if (followError) {
      // 중복 팔로우 오류 처리
      if (followError.code === "23505") {
        return NextResponse.json(
          { error: "이미 팔로우 중입니다." },
          { status: 409 }
        );
      }

      console.error("Error creating follow:", followError);
      return NextResponse.json(
        { error: "팔로우에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "팔로우가 완료되었습니다.",
        follow: followData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/follows:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId: currentClerkId } = await auth();
    if (!currentClerkId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { following_id: targetClerkId } = body;

    if (!targetClerkId) {
      return NextResponse.json(
        { error: "언팔로우할 사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase Service Role 클라이언트 사용
    const supabase = getServiceRoleClient();

    // 현재 사용자의 Supabase user_id 조회
    const { data: currentUser, error: currentUserError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", currentClerkId)
      .single();

    if (currentUserError || !currentUser) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 언팔로우할 사용자의 Supabase user_id 조회
    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", targetClerkId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: "언팔로우할 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 팔로우 제거
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUser.id)
      .eq("following_id", targetUser.id);

    if (deleteError) {
      console.error("Error deleting follow:", deleteError);
      return NextResponse.json(
        { error: "언팔로우에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "언팔로우가 완료되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/follows:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

