import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * @file route.ts
 * @description 게시물 상세 조회 API
 *
 * GET: 단일 게시물 상세 정보 조회
 * - 게시물 정보
 * - 사용자 정보
 * - 좋아요 수, 댓글 수
 * - 전체 댓글 목록 (시간 역순)
 * - 현재 로그인한 사용자의 좋아요 상태
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "게시물 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 현재 로그인한 사용자 (선택적, 좋아요 상태 확인용)
    const { userId: currentClerkId } = await auth();

    // Supabase 클라이언트 (공개 데이터)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // post_stats 뷰에서 게시물 정보 가져오기
    let postData: any = null;
    let postError: any = null;

    // 먼저 post_stats 뷰를 시도
    const viewResult = await supabase
      .from("post_stats")
      .select("*")
      .eq("post_id", postId)
      .single();

    if (viewResult.error) {
      console.warn("post_stats 뷰 조회 실패, posts 테이블 직접 조회 시도:", viewResult.error);
      
      // 뷰가 없으면 posts 테이블을 직접 조회
      const postsResult = await supabase
        .from("posts")
        .select("id, user_id, image_url, caption, created_at")
        .eq("id", postId)
        .single();

      if (postsResult.error) {
        return NextResponse.json(
          { error: "게시물을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      // 좋아요 수와 댓글 수 계산
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("likes")
          .select("id")
          .eq("post_id", postId),
        supabase
          .from("comments")
          .select("id")
          .eq("post_id", postId),
      ]);

      postData = {
        post_id: postsResult.data.id,
        user_id: postsResult.data.user_id,
        image_url: postsResult.data.image_url,
        caption: postsResult.data.caption,
        created_at: postsResult.data.created_at,
        likes_count: (likesResult.data || []).length,
        comments_count: (commentsResult.data || []).length,
      };
    } else {
      postData = viewResult.data;
    }

    // 사용자 정보 가져오기
    // profile_image_url 컬럼이 없을 수 있으므로, 먼저 기본 컬럼만 조회 시도
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, clerk_id, name")
      .eq("id", postData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "사용자 정보를 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    // Clerk에서 사용자 프로필 이미지 가져오기 (선택적)
    // profile_image_url 컬럼이 없을 수 있으므로 안전하게 처리
    let userImageUrl: string | undefined = (userData as any).profile_image_url || undefined;
    if (!userImageUrl) {
      try {
        const clerkClientInstance = await clerkClient();
        const clerkUser = await clerkClientInstance.users.getUser(userData.clerk_id);
        userImageUrl = clerkUser.imageUrl || undefined;
      } catch (err) {
        // Clerk 사용자를 찾을 수 없는 경우 무시
        console.warn("Failed to fetch Clerk user image:", err);
      }
    }

    // 현재 로그인한 사용자의 좋아요/북마크 상태 확인
    let isLiked = false;
    let isBookmarked = false;
    if (currentClerkId) {
      try {
        const { data: currentUser } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", currentClerkId)
          .single();

        if (currentUser) {
          const { data: likeData } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", currentUser.id)
            .single();

          isLiked = !!likeData;

          const { data: bookmarkData } = await supabase
            .from("bookmarks")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", currentUser.id)
            .single();

          isBookmarked = !!bookmarkData;
        }
      } catch (err) {
        // 상태 확인 실패 시 무시
        console.warn("Failed to check like/bookmark status:", err);
      }
    }

    // 전체 댓글 목록 가져오기 (시간 역순)
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    // 댓글 작성자 정보 가져오기
    const commentUserIds = [
      ...new Set((commentsData || []).map((c: any) => c.user_id)),
    ];
    const { data: commentUsersData } = await supabase
      .from("users")
      .select("id, clerk_id, name")
      .in("id", commentUserIds);

    // 댓글과 사용자 정보 조합
    const commentIds = (commentsData || []).map((comment: any) => comment.id);

    const { data: commentMentionsData } = await supabase
      .from("mentions")
      .select("comment_id, display_text, mentioned_user:mentioned_user_id (id, clerk_id, name)")
      .in("comment_id", commentIds.length > 0 ? commentIds : ["00000000-0000-0000-0000-000000000000"])
      .is("post_id", null);

    const commentMentionsMap = new Map<string, Array<{
      display_text: string;
      user: { id: string; clerk_id: string; name: string };
    }>>();

    (commentMentionsData || []).forEach((mention: any) => {
      if (!mention.comment_id || !mention.mentioned_user) {
        return;
      }
      if (!commentMentionsMap.has(mention.comment_id)) {
        commentMentionsMap.set(mention.comment_id, []);
      }
      commentMentionsMap.get(mention.comment_id)!.push({
        display_text: mention.display_text,
        user: {
          id: mention.mentioned_user.id,
          clerk_id: mention.mentioned_user.clerk_id,
          name: mention.mentioned_user.name,
        },
      });
    });

    const comments = (commentsData || []).map((comment: any) => {
      const user = commentUsersData?.find((u) => u.id === comment.user_id);
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        user: {
          id: user?.id || comment.user_id,
          clerk_id: user?.clerk_id || "",
          name: user?.name || "Unknown",
        },
        mentions: commentMentionsMap.get(comment.id) || [],
      };
    });

    const { data: postMentionsData } = await supabase
      .from("mentions")
      .select("display_text, mentioned_user:mentioned_user_id (id, clerk_id, name)")
      .eq("post_id", postId)
      .is("comment_id", null);

    const postMentions = (postMentionsData || []).map((mention: any) => ({
      display_text: mention.display_text,
      user: {
        id: mention.mentioned_user.id,
        clerk_id: mention.mentioned_user.clerk_id,
        name: mention.mentioned_user.name,
      },
    }));

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      // 댓글이 없어도 계속 진행
    }

    return NextResponse.json({
      post: {
        id: postData.post_id,
        user_id: postData.user_id,
        image_url: postData.image_url,
        caption: postData.caption,
        created_at: postData.created_at,
        likes_count: postData.likes_count || 0,
        comments_count: postData.comments_count || 0,
        isLiked,
        isBookmarked,
        user: {
          id: userData.id,
          clerk_id: userData.clerk_id,
          name: userData.name,
          image_url: userImageUrl,
          profile_image_url: userImageUrl,
        },
        comments,
        mentions: postMentions,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/posts/[postId]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 게시물 삭제
 * - Clerk 인증 확인
 * - 본인 게시물만 삭제 가능
 * - Storage에서 이미지 파일 삭제
 * - posts 테이블에서 게시물 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Clerk 인증 확인
    const { userId: currentClerkId } = await auth();
    if (!currentClerkId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "게시물 ID가 필요합니다." },
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

    // 게시물 정보 조회 (소유권 확인 및 이미지 URL 가져오기)
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id, user_id, image_url")
      .eq("id", postId)
      .single();

    if (postError || !postData) {
      return NextResponse.json(
        { error: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 소유권 확인
    if (postData.user_id !== currentUser.id) {
      return NextResponse.json(
        { error: "본인의 게시물만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    // Storage에서 이미지 파일 삭제
    if (postData.image_url) {
      try {
        // 이미지 URL에서 파일 경로 추출
        // 예: https://xxx.supabase.co/storage/v1/object/public/uploads/user_id/filename.jpg
        const urlParts = postData.image_url.split("/");
        const fileNameIndex = urlParts.findIndex((part) => part === "uploads");
        if (fileNameIndex !== -1 && fileNameIndex < urlParts.length - 1) {
          const filePath = urlParts.slice(fileNameIndex + 1).join("/");
          const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";
          
          await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
        }
      } catch (storageError) {
        // Storage 삭제 실패해도 게시물은 삭제 진행 (이미지가 없을 수도 있음)
        console.warn("Failed to delete image from storage:", storageError);
      }
    }

    // 게시물 삭제 (CASCADE로 인해 관련된 likes, comments도 자동 삭제됨)
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      console.error("Error deleting post:", deleteError);
      return NextResponse.json(
        { error: "게시물 삭제에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "게시물이 성공적으로 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/posts/[postId]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

