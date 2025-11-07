import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * @file route.ts
 * @description 해시태그 검색 테스트 API
 * 
 * 이 API는 해시태그 검색이 제대로 작동하는지 테스트하기 위한 간단한 엔드포인트입니다.
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hashtag = searchParams.get("hashtag")?.trim().replace(/^#+/, "").toLowerCase();

    if (!hashtag) {
      return NextResponse.json({ error: "해시태그가 필요합니다." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 해시태그 조회
    const { data: hashtagRecord, error: hashtagError } = await supabase
      .from("hashtags")
      .select("id, tag")
      .eq("tag", hashtag)
      .maybeSingle();

    if (hashtagError) {
      return NextResponse.json({
        step: "hashtag_lookup",
        error: hashtagError,
        message: "해시태그 조회 실패",
      }, { status: 500 });
    }

    if (!hashtagRecord) {
      return NextResponse.json({
        step: "hashtag_not_found",
        hashtag,
        message: "해시태그를 찾을 수 없습니다.",
      }, { status: 200 });
    }

    // 2. post_hashtags 조회
    const { data: postHashtags, error: postHashtagsError } = await supabase
      .from("post_hashtags")
      .select("post_id")
      .eq("hashtag_id", hashtagRecord.id);

    if (postHashtagsError) {
      return NextResponse.json({
        step: "post_hashtags_lookup",
        error: postHashtagsError,
        message: "post_hashtags 조회 실패",
      }, { status: 500 });
    }

    // 3. posts 조회
    const postIds = (postHashtags || []).map((row) => row.post_id).filter(Boolean);
    
    if (postIds.length === 0) {
      return NextResponse.json({
        step: "no_posts",
        hashtag: hashtagRecord.tag,
        hashtagId: hashtagRecord.id,
        message: "이 해시태그로 등록된 게시물이 없습니다.",
      }, { status: 200 });
    }

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, user_id, image_url, caption, created_at")
      .in("id", postIds.slice(0, 5)) // 처음 5개만 테스트
      .order("created_at", { ascending: false });

    if (postsError) {
      return NextResponse.json({
        step: "posts_lookup",
        error: postsError,
        message: "게시물 조회 실패",
      }, { status: 500 });
    }

    return NextResponse.json({
      step: "success",
      hashtag: hashtagRecord.tag,
      hashtagId: hashtagRecord.id,
      totalPostIds: postIds.length,
      postsFound: posts?.length || 0,
      posts: posts || [],
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      step: "unexpected_error",
      error: error instanceof Error ? error.message : String(error),
      message: "예상치 못한 오류가 발생했습니다.",
    }, { status: 500 });
  }
}

