import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * @file route.ts
 * @description 좋아요 추가/제거/조회 API
 *
 * 주요 기능:
 * - GET: 좋아요 상태 확인
 * - POST: 좋아요 추가
 * - DELETE: 좋아요 제거
 * - Clerk 인증 확인
 * - 중복 좋아요 방지 (UNIQUE 제약)
 */

export async function GET(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const post_id = searchParams.get("post_id");

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createClerkSupabaseClient();

    // Clerk 사용자 ID로 Supabase users 테이블에서 user_id 찾기
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 좋아요 상태 확인
    const { data: likeData, error: likeError } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", post_id)
      .eq("user_id", userData.id)
      .single();

    if (likeError && likeError.code !== "PGRST116") {
      // PGRST116은 "no rows returned" 에러 (좋아요가 없는 경우)
      console.error("Like check error:", likeError);
      return NextResponse.json(
        { error: "좋아요 상태 확인에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isLiked: !!likeData,
    });
  } catch (error) {
    console.error("GET /api/likes error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문에서 post_id 가져오기
    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createClerkSupabaseClient();

    // Clerk 사용자 ID로 Supabase users 테이블에서 user_id 찾기
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      console.error("User lookup error:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 좋아요 추가
    const { data, error } = await supabase
      .from("likes")
      .insert({
        post_id,
        user_id: userData.id,
      })
      .select()
      .single();

    if (error) {
      // 중복 좋아요 에러 처리 (UNIQUE 제약)
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 좋아요를 누른 게시물입니다." },
          { status: 409 }
        );
      }

      console.error("Like insert error:", error);
      return NextResponse.json(
        { error: "좋아요 추가에 실패했습니다.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      like: data,
    });
  } catch (error) {
    console.error("POST /api/likes error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문에서 post_id 가져오기
    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json(
        { error: "post_id가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createClerkSupabaseClient();

    // Clerk 사용자 ID로 Supabase users 테이블에서 user_id 찾기
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      console.error("User lookup error:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 좋아요 제거
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", post_id)
      .eq("user_id", userData.id);

    if (error) {
      console.error("Like delete error:", error);
      return NextResponse.json(
        { error: "좋아요 제거에 실패했습니다.", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE /api/likes error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

