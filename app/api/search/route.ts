import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * @file route.ts
 * @description 검색 API
 *
 * GET: 검색 쿼리에 따라 해시태그 또는 사용자 목록 반환
 * - q: 검색어 (필수)
 * - type: "hashtag" | "user" | "all" (기본값: all)
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get("q")?.trim() || "";
  const type = (searchParams.get("type") || "all").toLowerCase();

  if (!rawQuery) {
    return NextResponse.json({ hashtags: [], users: [] });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const normalizedHashtagQuery = rawQuery.replace(/^#+/, "").toLowerCase();
  const responsePayload: {
    hashtags: Array<{ id: string; tag: string; posts_count: number }>;
    users: Array<{ id: string; clerk_id: string; name: string }>;
  } = {
    hashtags: [],
    users: [],
  };

  const shouldSearchHashtags = type === "all" || type === "hashtag";
  const shouldSearchUsers = type === "all" || type === "user";

  if (shouldSearchHashtags && normalizedHashtagQuery.length > 0) {
    const { data: hashtagData, error: hashtagError } = await supabase
      .from("hashtags")
      .select("id, tag, post_hashtags(count)")
      .ilike("tag", `%${normalizedHashtagQuery}%`)
      .order("tag")
      .limit(10);

    if (!hashtagError && hashtagData) {
      responsePayload.hashtags = hashtagData.map((item) => ({
        id: item.id,
        tag: item.tag,
        posts_count: item.post_hashtags?.[0]?.count || 0,
      }));
    }
  }

  if (shouldSearchUsers) {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, clerk_id, name")
      .ilike("name", `%${rawQuery}%`)
      .order("name")
      .limit(10);

    if (!usersError && usersData) {
      responsePayload.users = usersData.map((user) => ({
        id: user.id,
        clerk_id: user.clerk_id,
        name: user.name,
      }));
    }
  }

  return NextResponse.json(responsePayload);
}
