import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * @file route.ts
 * @description 사용자 정보 조회 및 업데이트 API
 *
 * GET: 사용자 정보 및 통계 조회
 * PUT: 프로필 정보 업데이트 (프로필 사진, 이름)
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "uploads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetClerkId } = await params;

    if (!targetClerkId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 현재 로그인한 사용자 (선택적, 팔로우 상태 확인용)
    const { userId: currentClerkId } = await auth();

    // Supabase 클라이언트 (공개 데이터)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // user_stats 뷰에서 사용자 정보 및 통계 조회
    const { data: userStats, error: userStatsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("clerk_id", targetClerkId)
      .single();

    if (userStatsError || !userStats) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Supabase users 테이블에서 프로필 이미지 URL 가져오기 (최우선)
    let profileImageUrl: string | null = null;
    let bio: string | null = null;
    let website: string | null = null;
    try {
      const { data: userRecord } = await supabase
        .from("users")
        .select("profile_image_url, bio, website")
        .eq("clerk_id", targetClerkId)
        .single();

      if (userRecord?.profile_image_url) {
        profileImageUrl = userRecord.profile_image_url;
      }
      bio = userRecord?.bio || null;
      website = userRecord?.website || null;
    } catch (err) {
      console.warn("Failed to fetch user profile image from Supabase:", err);
    }

    // Supabase에 저장된 이미지가 없는 경우 Clerk 이미지 사용
    if (!profileImageUrl) {
      try {
        const clerkClientInstance = await clerkClient();
        const clerkUser = await clerkClientInstance.users.getUser(targetClerkId);
        profileImageUrl = clerkUser.imageUrl || null;
      } catch (err) {
        // Clerk 사용자를 찾을 수 없는 경우 무시
        console.warn("Failed to fetch Clerk user image:", err);
      }
    }

    // 현재 로그인한 사용자가 이 사용자를 팔로우하는지 확인
    let isFollowing = false;
    if (currentClerkId && currentClerkId !== targetClerkId) {
      try {
        // 현재 사용자의 Supabase user_id 조회
        const { data: currentUser } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", currentClerkId)
          .single();

        if (currentUser) {
          // 팔로우 상태 확인
          const { data: followData } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUser.id)
            .eq("following_id", userStats.user_id)
            .single();

          isFollowing = !!followData;
        }
      } catch (err) {
        // 팔로우 상태 확인 실패 시 무시 (로그인하지 않은 사용자도 프로필을 볼 수 있어야 함)
        console.warn("Failed to check follow status:", err);
      }
    }

    return NextResponse.json({
      user: {
        id: userStats.user_id,
        clerk_id: userStats.clerk_id,
        name: userStats.name,
        image_url: profileImageUrl,
        posts_count: userStats.posts_count || 0,
        followers_count: userStats.followers_count || 0,
        following_count: userStats.following_count || 0,
        isFollowing,
        isOwnProfile: currentClerkId === targetClerkId,
        bio,
        website,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/users/[userId]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetClerkId } = await params;
    const { userId: currentClerkId } = await auth();

    if (!currentClerkId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (currentClerkId !== targetClerkId) {
      return NextResponse.json(
        { error: "본인의 프로필만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const supabase = getServiceRoleClient();
    const formData = await request.formData();
    const name = formData.get("name") as string | null;
    const imageFile = formData.get("image") as File | null;
    const bioInput = formData.get("bio") as string | null;
    const websiteInput = formData.get("website") as string | null;

    // 이름 검증
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: "이름은 비어있을 수 없습니다." },
        { status: 400 }
      );
    }

    if (name && name.length > 50) {
      return NextResponse.json(
        { error: "이름은 50자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 이미지 파일 검증
    if (imageFile) {
      if (!imageFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "이미지 파일만 업로드할 수 있습니다." },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "파일 크기는 5MB를 초과할 수 없습니다." },
          { status: 400 }
        );
      }
    }

    // Supabase users 테이블에서 user_id 조회
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", currentClerkId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    let imageUrl: string | null = null;

    // 프로필 이미지 업로드
    if (imageFile) {
      const timestamp = Date.now();
      const fileExtension = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${currentClerkId}/profile-${timestamp}.${fileExtension}`;

      const fileBuffer = await imageFile.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, fileBuffer, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading profile image:", uploadError);
        return NextResponse.json(
          { error: "프로필 이미지 업로드에 실패했습니다." },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        imageUrl = urlData.publicUrl;
      }
    }

    // Clerk 사용자 정보 업데이트
    try {
      const clerkClientInstance = await clerkClient();
      const updateData: { firstName?: string; imageUrl?: string } = {};
      
      if (name) {
        updateData.firstName = name;
      }
      
      if (imageUrl) {
        updateData.imageUrl = imageUrl;
      }

      if (Object.keys(updateData).length > 0) {
        await clerkClientInstance.users.updateUser(currentClerkId, updateData);
      }
    } catch (err) {
      console.error("Error updating Clerk user:", err);
      // Clerk 업데이트 실패해도 계속 진행 (Supabase는 업데이트)
    }

    // Supabase users 테이블 업데이트
    const updateData: {
      name?: string;
      profile_image_url?: string | null;
      bio?: string | null;
      website?: string | null;
    } = {};
    if (name) {
      updateData.name = name;
    }

    if (imageUrl) {
      updateData.profile_image_url = imageUrl;
    }

    let trimmedBio: string | null = null;
    if (bioInput !== null) {
      const candidate = bioInput.trim();
      if (candidate.length > 150) {
        return NextResponse.json(
          { error: "소개글은 150자를 초과할 수 없습니다." },
          { status: 400 }
        );
      }
      trimmedBio = candidate.length > 0 ? candidate : null;
      updateData.bio = trimmedBio;
    }

    let normalizedWebsite: string | null = null;
    if (websiteInput !== null) {
      const candidateRaw = websiteInput.trim();
      if (candidateRaw.length > 0) {
        let candidate = candidateRaw;
        if (!/^https?:\/\//i.test(candidate)) {
          candidate = `https://${candidate}`;
        }
        try {
          const url = new URL(candidate);
          normalizedWebsite = url.toString();
        } catch (err) {
          return NextResponse.json(
            { error: "유효한 웹사이트 URL을 입력해주세요." },
            { status: 400 }
          );
        }
      }
      updateData.website = normalizedWebsite;
    }
 
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userData.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json(
          { error: "프로필 업데이트에 실패했습니다." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: "프로필이 성공적으로 업데이트되었습니다.",
        image_url: imageUrl,
        bio: trimmedBio,
        website: normalizedWebsite,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/users/[userId]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
