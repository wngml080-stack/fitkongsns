import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * @file route.ts
 * @description 댓글 API
 *
 * POST: 댓글 작성
 * - Clerk 인증 확인
 * - comments 테이블에 저장
 * - 사용자 정보 포함하여 응답
 */

export async function POST(request: NextRequest) {
  try {
    // Clerk 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { post_id, content, mentions: rawMentions } = body;

    // 입력 검증
    if (!post_id) {
      return NextResponse.json(
        { error: "게시물 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "댓글 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // Supabase Service Role 클라이언트 사용
    const supabase = getServiceRoleClient();

    // Clerk user_id로 Supabase users 테이블에서 user_id 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, name")
      .eq("clerk_id", userId)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user:", userError);
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 게시물 존재 확인
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (postError || !postData) {
      return NextResponse.json(
        { error: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const mentionPayload: Array<{ mentioned_user_id: string; display_text: string }> = Array.isArray(rawMentions)
      ? rawMentions.filter(
          (item: any) =>
            item && typeof item.mentioned_user_id === "string" && typeof item.display_text === "string"
        )
      : [];

    // 댓글 저장
    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .insert({
        post_id,
        user_id: userData.id,
        content: content.trim(),
      })
      .select("id, post_id, content, created_at, user_id")
      .single();

    if (commentError) {
      console.error("Error creating comment:", commentError);
      return NextResponse.json(
        { error: "댓글 작성에 실패했습니다." },
        { status: 500 }
      );
    }

    const normalizedContent = content.toLowerCase();
    if (mentionPayload.length > 0) {
      const seen = new Set<string>();
      const validMentions = mentionPayload.filter((mention) => {
        const key = `@${mention.display_text.toLowerCase()}`;
        const uniqueKey = `${mention.mentioned_user_id}-${key}`;
        if (!normalizedContent.includes(key) || seen.has(uniqueKey)) {
          return false;
        }
        seen.add(uniqueKey);
        return true;
      });

      if (validMentions.length > 0) {
        try {
          await supabase.from("mentions").insert(
            validMentions.map((mention) => ({
              post_id: null,
              comment_id: commentData.id,
              mentioned_user_id: mention.mentioned_user_id,
              mentioner_user_id: userData.id,
              display_text: mention.display_text,
            })),
            { returning: "minimal" }
          );
        } catch (err) {
          console.error("Error inserting comment mentions:", err);
        }
      }
    }

    // 응답에 사용자 정보 포함
    return NextResponse.json(
      {
        message: "댓글이 성공적으로 작성되었습니다.",
        comment: {
          id: commentData.id,
          post_id: commentData.post_id,
          content: commentData.content,
          created_at: commentData.created_at,
          user: {
            id: userData.id,
            name: userData.name,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/comments:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

