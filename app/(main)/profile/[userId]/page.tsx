import ProfileHeader from "@/components/profile/ProfileHeader";
import PostGrid from "@/components/profile/PostGrid";

/**
 * @file page.tsx
 * @description 프로필 페이지
 *
 * 주요 기능:
 * - 사용자 프로필 정보 표시
 * - 사용자 게시물 그리드 표시
 * - URL 파라미터: userId (Clerk ID)
 *
 * @dependencies
 * - components/profile/ProfileHeader: 프로필 헤더 컴포넌트
 * - components/profile/PostGrid: 게시물 그리드 컴포넌트
 */

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;

  return (
    <div className="min-h-screen bg-[var(--instagram-background)] dark:bg-[var(--background)]">
      <div className="max-w-4xl mx-auto">
        <ProfileHeader userId={userId} />
        <div className="px-4 py-8">
          <PostGrid userId={userId} />
        </div>
      </div>
    </div>
  );
}

