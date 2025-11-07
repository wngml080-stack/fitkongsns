import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * @file route.ts
 * @description 댓글 삭제 API
 *
 * DELETE: 댓글 삭제
 * - Clerk 인증 확인
 * - 본인 댓글만 삭제 가능 (user_id 검증)
 * - 에러 처리
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    // Clerk 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // URL 파라미터에서 commentId 추출
    const { commentId } = await params;
    if (!commentId) {
      return NextResponse.json(
        { error: "댓글 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase Service Role 클라이언트 사용
    const supabase = getServiceRoleClient();

    // Clerk user_id로 Supabase users 테이블에서 user_id 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 댓글 존재 및 소유권 확인
    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .select("id, user_id")
      .eq("id", commentId)
      .single();

    if (commentError || !commentData) {
      return NextResponse.json(
        { error: "댓글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 본인 댓글인지 확인
    if (commentData.user_id !== userData.id) {
      return NextResponse.json(
        { error: "본인의 댓글만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // 댓글 삭제
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError);
      return NextResponse.json(
        { error: "댓글 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "댓글이 성공적으로 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/comments/[commentId]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

