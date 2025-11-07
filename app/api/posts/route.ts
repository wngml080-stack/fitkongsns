import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * @file route.ts
 * @description 게시물 목록 GET API
 *
 * 주요 기능:
 * - 페이지네이션 (10개씩)
 * - 시간 역순 정렬
 * - 사용자 정보 포함
 * - 좋아요 수, 댓글 수 포함 (post_stats 뷰 활용)
 * - 댓글 미리보기 2개 포함 (최신순)
 * - Clerk 인증 확인 (선택적, 공개 데이터도 허용)
 */

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10);
    const limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const offset = (page - 1) * limit;

    // 게시물 목록은 공개 데이터이므로 공개 클라이언트 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // post_stats 뷰에서 게시물 목록 가져오기 (시간 역순)
    // 뷰가 없을 경우를 대비해 posts 테이블을 직접 조회
    let postsData: any[] | null = null;
    let postsError: any = null;

    // 먼저 post_stats 뷰를 시도
    const viewResult = await supabase
      .from("post_stats")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (viewResult.error) {
      console.warn("post_stats 뷰 조회 실패, posts 테이블 직접 조회 시도:", viewResult.error);
      
      // 뷰가 없으면 posts 테이블을 직접 조회
      const postsResult = await supabase
        .from("posts")
        .select("id, user_id, image_url, caption, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsResult.error) {
        console.error("Error fetching posts:", postsResult.error);
        return NextResponse.json(
          { 
            error: "게시물을 불러오는데 실패했습니다.",
            details: postsResult.error.message || String(postsResult.error)
          },
          { status: 500 }
        );
      }

      // posts 테이블 데이터를 post_stats 형식으로 변환
      const postIds = (postsResult.data || []).map((p) => p.id);
      
      // 좋아요 수와 댓글 수 계산
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from("likes")
          .select("post_id")
          .in("post_id", postIds),
        supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds),
      ]);

      // post_id별로 카운트 계산
      const likesCountMap = new Map<string, number>();
      const commentsCountMap = new Map<string, number>();

      (likesResult.data || []).forEach((like: any) => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
      });

      (commentsResult.data || []).forEach((comment: any) => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
      });

      postsData = (postsResult.data || []).map((post) => ({
        post_id: post.id,
        user_id: post.user_id,
        image_url: post.image_url,
        caption: post.caption,
        created_at: post.created_at,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
      }));
    } else {
      postsData = viewResult.data;
    }

    if (!postsData || postsData.length === 0) {
      return NextResponse.json({
        posts: [],
        hasMore: false,
        page,
      });
    }

    // 사용자 정보 가져오기
    const userIds = [...new Set(postsData.map((post) => post.user_id))];
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, clerk_id, name")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "사용자 정보를 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    // Clerk에서 사용자 프로필 이미지 가져오기 (선택적, 에러가 나도 계속 진행)
    const userImageMap = new Map<string, string>();

    try {
      const clerkClientInstance = await clerkClient();
      await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            const clerkUser = await clerkClientInstance.users.getUser(user.clerk_id);
            if (clerkUser.imageUrl) {
              userImageMap.set(user.id, clerkUser.imageUrl);
            }
          } catch (err) {
            // Clerk 사용자를 찾을 수 없는 경우 무시 (로그인하지 않은 사용자도 게시물을 볼 수 있어야 함)
            // console.warn(`Failed to fetch Clerk user for ${user.clerk_id}:`, err);
          }
        })
      );
    } catch (err) {
      // Clerk 클라이언트 초기화 실패 시 무시 (공개 데이터이므로)
      // console.warn("Failed to fetch some Clerk user images:", err);
    }

    // 각 게시물에 대해 댓글 최신 2개 가져오기
    const postIds = postsData.map((post) => post.post_id);
    const { data: allCommentsData, error: commentsError } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, user_id")
      .in("post_id", postIds)
      .order("created_at", { ascending: false });

    // 댓글 작성자 정보 가져오기
    const commentUserIds = [
      ...new Set((allCommentsData || []).map((c: any) => c.user_id)),
    ];
    const { data: commentUsersData } = await supabase
      .from("users")
      .select("id, name")
      .in("id", commentUserIds);

    // 댓글과 사용자 정보 조합
    const commentsData = (allCommentsData || []).map((comment: any) => {
      const user = commentUsersData?.find((u) => u.id === comment.user_id);
      return {
        ...comment,
        user: {
          id: user?.id || comment.user_id,
          name: user?.name || "Unknown",
        },
      };
    });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      // 댓글이 없어도 계속 진행
    }

    // 댓글을 post_id별로 그룹화하고 최신 2개만 선택
    const commentsByPostId = new Map<string, Array<{
      id: string;
      content: string;
      created_at: string;
      user: { id: string; name: string };
    }>>();
    
    (commentsData || []).forEach((comment: any) => {
      if (!commentsByPostId.has(comment.post_id)) {
        commentsByPostId.set(comment.post_id, []);
      }
      const postComments = commentsByPostId.get(comment.post_id)!;
      if (postComments.length < 2) {
        postComments.push({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user: comment.user,
        });
      }
    });

    // 데이터 조합
    const posts = postsData.map((post) => {
      const user = usersData?.find((u) => u.id === post.user_id);
      const comments = commentsByPostId.get(post.post_id) || [];

      return {
        id: post.post_id,
        user_id: post.user_id,
        image_url: post.image_url,
        caption: post.caption,
        created_at: post.created_at,
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        user: {
          id: user?.id || post.user_id,
          clerk_id: user?.clerk_id || "",
          name: user?.name || "Unknown",
          image_url: userImageMap.get(user?.id || ""),
        },
        comments: comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user: {
            id: comment.user.id,
            name: comment.user.name,
          },
        })),
      };
    });

    // 다음 페이지가 있는지 확인
    const { count } = await supabase
      .from("post_stats")
      .select("*", { count: "exact", head: true });

    const hasMore = count ? offset + limit < count : false;

    return NextResponse.json({
      posts,
      hasMore,
      page,
    });
  } catch (error) {
    console.error("Error in GET /api/posts:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

