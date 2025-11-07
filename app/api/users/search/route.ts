import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ users: [] });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_id, name")
    .or(`name.ilike.%${query}%,clerk_id.ilike.%${query}%`)
    .order("name")
    .limit(10);

  if (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "사용자 검색에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ users: data || [] });
}
