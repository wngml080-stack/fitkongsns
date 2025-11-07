import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const DEFAULT_LIMIT = 12;

async function getCurrentUserId(supabase: ReturnType<typeof getServiceRoleClient>, clerkId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();

  if (error || !data) {
    throw new Error("사용자 정보를 찾을 수 없습니다.");
  }

  return data.id as string;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || String(1), 10);
    const limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const offset = (page - 1) * limit;

    const supabase = getServiceRoleClient();
    const userUuid = await getCurrentUserId(supabase, userId);

    const { data: likeRows, error: likeError } = await supabase
      .from("likes")
      .select("post_id, created_at")
      .eq("user_id", userUuid)
      .order("created_at", { ascending: false });

    if (likeError) {
      console.error("Error fetching liked posts:", likeError);
      return NextResponse.json(
        { error: "좋아요한 게시물을 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    const allPostIds = (likeRows || []).map((row) => row.post_id);

    if (allPostIds.length === 0) {
      return NextResponse.json({ posts: [], hasMore: false, page: 1 });
    }

    const pagedPostIds = allPostIds.slice(offset, offset + limit);

    if (pagedPostIds.length === 0) {
      return NextResponse.json({
        posts: [],
        hasMore: offset + limit < allPostIds.length,
        page,
      });
    }

    const { data: postsData, error: postsError } = await supabase
      .from("post_stats")
      .select("post_id, image_url, likes_count, comments_count, created_at")
      .in("post_id", pagedPostIds)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching liked posts data:", postsError);
      return NextResponse.json(
        { error: "게시물을 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    const posts = (postsData || []).map((post) => ({
      id: post.post_id,
      image_url: post.image_url,
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
    }));

    return NextResponse.json({
      posts,
      hasMore: offset + limit < allPostIds.length,
      page,
    });
  } catch (error) {
    console.error("Error in GET /api/posts/liked:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
