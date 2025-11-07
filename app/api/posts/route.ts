import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * @file route.ts
 * @description 게시물 API
 *
 * GET: 게시물 목록 조회
 * - 페이지네이션 (10개씩)
 * - 시간 역순 정렬
 * - 사용자 정보 포함
 * - 좋아요 수, 댓글 수 포함 (post_stats 뷰 활용)
 * - 댓글 미리보기 2개 포함 (최신순)
 * - Clerk 인증 확인 (선택적, 공개 데이터도 허용)
 *
 * POST: 게시물 작성
 * - 이미지 파일 업로드 (최대 5MB)
 * - Supabase Storage에 저장
 * - posts 테이블에 데이터 저장
 * - Clerk 인증 필수
 */

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const HASHTAG_REGEX = /#([\p{L}\p{N}_]+)/gu;

function extractHashtags(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }
  const tags = new Set<string>();
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const tag = match[1]?.toLowerCase();
    if (tag) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/posts] Request received");
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10);
    const limit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const offset = (page - 1) * limit;
    const userIdParam = searchParams.get("userId"); // Clerk ID (선택적)
    const hashtagParamRaw = searchParams.get("hashtag");
    const normalizedHashtag = hashtagParamRaw
      ? hashtagParamRaw.trim().replace(/^#+/, "").toLowerCase()
      : null;

    // 게시물 목록은 공개 데이터이므로 공개 클라이언트 사용
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId: currentClerkId } = await auth();
    let currentUserUuid: string | null = null;
    if (currentClerkId) {
      try {
        const { data: currentUserRecord } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", currentClerkId)
          .single();
        if (currentUserRecord?.id) {
          currentUserUuid = currentUserRecord.id;
        }
      } catch (err) {
        console.warn("Failed to fetch current user for bookmarks:", err);
      }
    }

    // userId 파라미터가 있으면 Supabase user_id로 변환
    let targetUserId: string | null = null;
    if (userIdParam) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userIdParam)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: "사용자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      targetUserId = userData.id;
    }

    // post_stats 뷰에서 게시물 목록 가져오기 (시간 역순)
    // 뷰가 없을 경우를 대비해 posts 테이블을 직접 조회
    let postsData: any[] | null = null;
    let totalCount: number | null = null;

    if (normalizedHashtag) {
      try {
        console.log("[GET /api/posts] Searching for hashtag:", normalizedHashtag);
        
        // 해시태그 조회 (에러 처리 개선)
        const { data: hashtagRecord, error: hashtagError } = await supabase
          .from("hashtags")
          .select("id")
          .eq("tag", normalizedHashtag)
          .maybeSingle(); // single() 대신 maybeSingle() 사용 (에러 대신 null 반환)

        if (hashtagError) {
          console.error("[GET /api/posts] Error fetching hashtag:", {
            error: hashtagError,
            code: hashtagError.code,
            message: hashtagError.message,
            details: hashtagError.details,
            hint: hashtagError.hint,
            hashtag: normalizedHashtag,
          });
          return NextResponse.json(
            { 
              error: "해시태그 정보를 불러오는데 실패했습니다.",
              details: process.env.NODE_ENV === "development" ? hashtagError.message : undefined
            },
            { status: 500 }
          );
        }

        if (!hashtagRecord || !hashtagRecord.id) {
          console.log("[GET /api/posts] Hashtag not found:", normalizedHashtag);
          return NextResponse.json({ posts: [], hasMore: false, page });
        }

        console.log("[GET /api/posts] Found hashtag:", hashtagRecord.id);

        // post_hashtags에서 post_id 조회
        const { data: hashtagPosts, error: hashtagPostsError } = await supabase
          .from("post_hashtags")
          .select("post_id")
          .eq("hashtag_id", hashtagRecord.id);

        if (hashtagPostsError) {
          console.error("[GET /api/posts] Error fetching post_hashtags:", {
            error: hashtagPostsError,
            code: hashtagPostsError.code,
            message: hashtagPostsError.message,
          });
          return NextResponse.json(
            { error: "해시태그 게시물을 불러오는데 실패했습니다." },
            { status: 500 }
          );
        }

        const allPostIds = (hashtagPosts || []).map((row) => row.post_id).filter(Boolean);
        totalCount = allPostIds.length;
        
        console.log("[GET /api/posts] Found", totalCount, "posts for hashtag");

        if (allPostIds.length === 0) {
          return NextResponse.json({ posts: [], hasMore: false, page });
        }

        // 페이지네이션
        const pagedPostIds = allPostIds.slice(offset, offset + limit);
        if (pagedPostIds.length === 0) {
          return NextResponse.json({ posts: [], hasMore: offset + limit < totalCount, page });
        }

        // posts 테이블에서 직접 조회
        const { data: hashtagPostsData, error: hashtagPostsDataError } = await supabase
          .from("posts")
          .select("id, user_id, image_url, caption, created_at")
          .in("id", pagedPostIds)
          .order("created_at", { ascending: false });

        if (hashtagPostsDataError) {
          console.error("[GET /api/posts] Error fetching posts:", {
            error: hashtagPostsDataError,
            code: hashtagPostsDataError.code,
            message: hashtagPostsDataError.message,
          });
          return NextResponse.json(
            { error: "게시물을 불러오는데 실패했습니다." },
            { status: 500 }
          );
        }

        if (!hashtagPostsData || hashtagPostsData.length === 0) {
          postsData = [];
        } else {
          // 좋아요 수와 댓글 수 계산 (에러 처리 추가)
          const postIds = hashtagPostsData.map((p) => p.id);
          let likesResult: any = { data: [] };
          let commentsResult: any = { data: [] };
          
          try {
            const [likesResponse, commentsResponse] = await Promise.all([
              supabase.from("likes").select("post_id").in("post_id", postIds),
              supabase.from("comments").select("post_id").in("post_id", postIds),
            ]);
            
            likesResult = likesResponse;
            commentsResult = commentsResponse;
            
            // 에러가 발생해도 계속 진행 (좋아요/댓글 수는 0으로 처리)
            if (likesResult.error) {
              console.warn("[GET /api/posts] Error fetching likes count:", likesResult.error);
              likesResult.data = [];
            }
            if (commentsResult.error) {
              console.warn("[GET /api/posts] Error fetching comments count:", commentsResult.error);
              commentsResult.data = [];
            }
          } catch (err) {
            console.error("[GET /api/posts] Error calculating likes/comments:", err);
            // 에러가 발생해도 게시물은 반환 (좋아요/댓글 수는 0으로 처리)
            likesResult.data = [];
            commentsResult.data = [];
          }

          const likesCountMap = new Map<string, number>();
          const commentsCountMap = new Map<string, number>();

          (likesResult.data || []).forEach((like: any) => {
            likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
          });

          (commentsResult.data || []).forEach((comment: any) => {
            commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
          });

          postsData = hashtagPostsData.map((post) => ({
            post_id: post.id,
            user_id: post.user_id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at,
            likes_count: likesCountMap.get(post.id) || 0,
            comments_count: commentsCountMap.get(post.id) || 0,
          }));
        }
      } catch (err) {
        console.error("[GET /api/posts] Unexpected error:", {
          error: err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        return NextResponse.json(
          { error: "해시태그 검색 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }
    }

    if (!postsData) {
      // 먼저 post_stats 뷰를 시도
      let viewQuery = supabase
        .from("post_stats")
        .select("*")
        .order("created_at", { ascending: false });

      // userId 필터 적용
      if (targetUserId) {
        viewQuery = viewQuery.eq("user_id", targetUserId);
      }

      if (normalizedHashtag) {
        // 해시태그가 있지만 post_stats에서 필터링할 수 없으므로 위에서 처리
      }

      const viewResult = await viewQuery.range(offset, offset + limit - 1);

      if (viewResult.error) {
        console.warn("post_stats 뷰 조회 실패, posts 테이블 직접 조회 시도:", viewResult.error);
        
        // 뷰가 없으면 posts 테이블을 직접 조회
        let postsQuery = supabase
          .from("posts")
          .select("id, user_id, image_url, caption, created_at")
          .order("created_at", { ascending: false });

        // userId 필터 적용
        if (targetUserId) {
          postsQuery = postsQuery.eq("user_id", targetUserId);
        }

        const postsResult = await postsQuery.range(offset, offset + limit - 1);

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
    }

    if (totalCount === null) {
      totalCount = null; // will be computed later via count query
    }

    if (!postsData || postsData.length === 0) {
      return NextResponse.json({
        posts: [],
        hasMore: false,
        page,
      });
    }

    // 사용자 정보 가져오기
    const userIds = [...new Set(postsData.map((post) => post.user_id).filter((id): id is string => !!id))];
    
    console.log("[DEBUG] userIds to fetch:", userIds);
    
    let usersData: any[] | null = null;
    if (userIds.length > 0) {
      // profile_image_url 컬럼 포함하여 조회
      const { data, error: usersError } = await supabase
        .from("users")
        .select("id, clerk_id, name, profile_image_url")
        .in("id", userIds);

      if (usersError) {
        console.error("[ERROR] Error fetching users:", {
          error: usersError,
          code: usersError.code,
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint,
          userIds: userIds,
        });
        return NextResponse.json(
          { 
            error: "사용자 정보를 불러오는데 실패했습니다.",
            details: usersError.message || String(usersError)
          },
          { status: 500 }
        );
      }
      usersData = data;
      console.log("[DEBUG] Fetched users count:", usersData?.length || 0);
    } else {
      console.log("[DEBUG] No userIds to fetch, using empty array");
      usersData = [];
    }

    // Clerk에서 사용자 프로필 이미지 가져오기 (선택적, 에러가 나도 계속 진행)
    const userImageMap = new Map<string, string>();

    // Supabase의 profile_image_url을 최우선으로 사용
    (usersData || []).forEach((user) => {
      if (user.profile_image_url) {
        userImageMap.set(user.id, user.profile_image_url);
      }
    });

    try {
      const clerkClientInstance = await clerkClient();
      await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            const clerkUser = await clerkClientInstance.users.getUser(user.clerk_id);
            if (clerkUser.imageUrl && !userImageMap.has(user.id)) {
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
    const postIds = postsData.map((post) => post.post_id).filter((id): id is string => !!id);

    let bookmarkedPostIds = new Set<string>();
    if (currentUserUuid && postIds.length > 0) {
      try {
        const { data: bookmarkData } = await supabase
          .from("bookmarks")
          .select("post_id")
          .eq("user_id", currentUserUuid)
          .in("post_id", postIds);

        if (bookmarkData) {
          bookmarkedPostIds = new Set(bookmarkData.map((row) => row.post_id));
        }
      } catch (err) {
        console.warn("Failed to fetch bookmark statuses:", err);
      }
    }

    let commentsData: any[] | null = null;
    if (postIds.length > 0) {
      const { data } = await supabase
        .from("comments")
        .select(
          "id, post_id, user_id, content, created_at, user:user_id (id, clerk_id, name)"
        )
        .in("post_id", postIds)
        .order("created_at", { ascending: false });
      commentsData = data;
    } else {
      commentsData = [];
    }

    // 댓글 멘션 데이터 가져오기
    const commentIds = (commentsData || []).map((comment: any) => comment.id);
    let commentMentionsData: any[] = [];
    if (commentIds.length > 0) {
      const { data } = await supabase
        .from("mentions")
        .select(
          "comment_id, display_text, mentioned_user:mentioned_user_id (id, clerk_id, name)"
        )
        .in("comment_id", commentIds)
        .is("post_id", null);

      commentMentionsData = data || [];
    }

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

    let postMentionsData: any[] = [];
    if (postIds.length > 0) {
      const { data } = await supabase
        .from("mentions")
        .select(
          "post_id, display_text, mentioned_user:mentioned_user_id (id, clerk_id, name)"
        )
        .in("post_id", postIds)
        .is("comment_id", null);

      postMentionsData = data || [];
    }

    const postMentionsByPostId = new Map<string, Array<{
      display_text: string;
      user: { id: string; clerk_id: string; name: string };
    }>>();

    (postMentionsData || []).forEach((mention: any) => {
      if (!postMentionsByPostId.has(mention.post_id)) {
        postMentionsByPostId.set(mention.post_id, []);
      }
      const list = postMentionsByPostId.get(mention.post_id)!;
      if (mention.mentioned_user) {
        list.push({
          display_text: mention.display_text,
          user: {
            id: mention.mentioned_user.id,
            clerk_id: mention.mentioned_user.clerk_id,
            name: mention.mentioned_user.name,
          },
        });
      }
    });

    const commentsByPostId = new Map<string, Array<{
      id: string;
      content: string;
      created_at: string;
      user: { id: string; name: string; clerk_id: string };
      mentions: Array<{
        display_text: string;
        user: { id: string; clerk_id: string; name: string };
      }>;
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
          mentions: commentMentionsMap.get(comment.id) || [],
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
          profile_image_url: userImageMap.get(user?.id || ""),
        },
        comments: comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user: {
            id: comment.user.id,
            clerk_id: comment.user.clerk_id,
            name: comment.user.name,
          },
          mentions: comment.mentions,
        })),
        mentions: postMentionsByPostId.get(post.post_id) || [],
        isBookmarked: bookmarkedPostIds.has(post.post_id),
      };
    });

    // 다음 페이지가 있는지 확인
    let hasMore = false;

    if (totalCount !== null) {
      hasMore = offset + limit < totalCount;
    } else {
      let countQuery = supabase
        .from("post_stats")
        .select("post_id", { count: "exact", head: true });

      if (targetUserId) {
        countQuery = countQuery.eq("user_id", targetUserId);
      }

      const { count } = await countQuery;
      hasMore = count ? offset + limit < count : false;
    }

    return NextResponse.json({
      posts,
      hasMore,
      page,
    });
  } catch (error) {
    console.error("[GET /api/posts] Unexpected error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";

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

    // FormData 파싱
    const supabase = getServiceRoleClient();
    const formData = await request.formData();
    const caption = formData.get("caption") as string | null;
    const imageFile = formData.get("image") as File | null;
    const rawMentions = formData.get("mentions") as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    let mentionPayload: Array<{ mentioned_user_id: string; display_text: string }> = [];
    if (rawMentions) {
      try {
        const parsed = JSON.parse(rawMentions);
        if (Array.isArray(parsed)) {
          mentionPayload = parsed.filter(
            (item: any) =>
              item && typeof item.mentioned_user_id === "string" && typeof item.display_text === "string"
          );
        }
      } catch (error) {
        console.warn("Failed to parse mentions payload:", error);
      }
    }

    // 이미지 파일 검증
    if (!imageFile) {
      return NextResponse.json(
        { error: "이미지 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // Clerk user_id로 Supabase users 테이블에서 user_id 조회
    console.log("[POST /api/posts] Looking up user for clerk_id:", userId);
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    let userData = userResult.data;
    const userError = userResult.error;

    if (userError || !userData) {
      console.error("[POST /api/posts] Error fetching user:", {
        error: userError,
        code: userError?.code,
        message: userError?.message,
        details: userError?.details,
        hint: userError?.hint,
        clerkId: userId,
      });
      
      // 사용자가 없으면 생성 시도
      if (userError?.code === "PGRST116") {
        console.log("[POST /api/posts] User not found, attempting to create user");
        try {
          const clerkClientInstance = await clerkClient();
          const clerkUser = await clerkClientInstance.users.getUser(userId);
          
          const userName = clerkUser.fullName || 
                          clerkUser.username || 
                          clerkUser.emailAddresses[0]?.emailAddress || 
                          "Unknown";
          
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              clerk_id: userId,
              name: userName,
            })
            .select("id")
            .single();
          
          if (createError || !newUser) {
            console.error("[POST /api/posts] Error creating user:", createError);
            return NextResponse.json(
              { 
                error: "사용자 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.",
                details: createError?.message || String(createError)
              },
              { status: 500 }
            );
          }
          
          console.log("[POST /api/posts] User created successfully:", newUser.id);
          // 새로 생성된 사용자 정보 사용
          userData = newUser;
        } catch (createErr) {
          console.error("[POST /api/posts] Error in user creation process:", createErr);
          return NextResponse.json(
            { 
              error: "사용자 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.",
              details: createErr instanceof Error ? createErr.message : String(createErr)
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { 
            error: "사용자 정보를 찾을 수 없습니다.",
            details: userError?.message || String(userError)
          },
          { status: 404 }
        );
      }
    }

    if (!userData) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 파일명 생성: {clerk_user_id}/{timestamp}-{filename}
    const timestamp = Date.now();
    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    // Supabase Storage에 업로드
    const fileBuffer = await imageFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json(
        { error: "파일 업로드에 실패했습니다." },
        { status: 500 }
      );
    }

    // 업로드된 파일의 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "파일 URL을 가져오는데 실패했습니다." },
        { status: 500 }
      );
    }

    // posts 테이블에 데이터 저장
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: userData.id,
        image_url: urlData.publicUrl,
        caption: caption || null,
      })
      .select("id, user_id, image_url, caption, created_at")
      .single();

    if (postError) {
      console.error("Error creating post:", postError);
      // 업로드된 파일 삭제 시도 (실패해도 계속 진행)
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      return NextResponse.json(
        { error: "게시물 저장에 실패했습니다." },
        { status: 500 }
      );
    }

    // 해시태그 저장
    const hashtags = extractHashtags(caption || null);
    if (hashtags.length > 0) {
      try {
        const { data: upsertedTags } = await supabase
          .from("hashtags")
          .upsert(
            hashtags.map((tag) => ({ tag })),
            { onConflict: "tag" }
          )
          .select("id, tag");

        let tagRecords = upsertedTags || [];

        if (tagRecords.length < hashtags.length) {
          const { data: fetchedTags } = await supabase
            .from("hashtags")
            .select("id, tag")
            .in("tag", hashtags);
          tagRecords = fetchedTags || tagRecords;
        }

        if (tagRecords.length > 0) {
          const postHashtagRows = tagRecords.map((tag) => ({
            post_id: postData.id,
            hashtag_id: tag.id,
          }));

          const { error: linkError } = await supabase
            .from("post_hashtags")
            .upsert(postHashtagRows, { onConflict: "post_id,hashtag_id" });

          if (linkError) {
            console.error("Error linking post hashtags:", linkError);
          }
        }
      } catch (err) {
        console.error("Error processing hashtags:", err);
      }
    }

    const normalizedCaption = (caption || "").toLowerCase();
    if (mentionPayload.length > 0) {
      const seen = new Set<string>();
      const validMentions = mentionPayload.filter((mention) => {
        const key = `@${mention.display_text.toLowerCase()}`;
        const uniqueKey = `${mention.mentioned_user_id}-${key}`;
        if (!normalizedCaption.includes(key) || seen.has(uniqueKey)) {
          return false;
        }
        seen.add(uniqueKey);
        return true;
      });

      if (validMentions.length > 0) {
        try {
          await supabase.from("mentions").insert(
            validMentions.map((mention) => ({
              post_id: postData.id,
              comment_id: null,
              mentioned_user_id: mention.mentioned_user_id,
              mentioner_user_id: userData.id,
              display_text: mention.display_text,
            }))
          );
        } catch (err) {
          console.error("Error inserting mentions:", err);
        }
      }
    }

    return NextResponse.json(
      {
        message: "게시물이 성공적으로 업로드되었습니다.",
        post: postData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/posts:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

