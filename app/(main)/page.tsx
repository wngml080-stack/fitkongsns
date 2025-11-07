import PostFeed from "@/components/post/PostFeed";

/**
 * @file page.tsx
 * @description 홈 피드 페이지
 *
 * 주요 기능:
 * - 게시물 목록 표시
 * - 배경색: #FAFAFA
 * - PostCard 최대 너비 630px, 중앙 정렬
 *
 * @dependencies
 * - components/post/PostFeed: 게시물 피드 컴포넌트
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--instagram-background)] via-purple-50 to-violet-50 dark:from-[var(--background)] dark:via-purple-950/20 dark:to-violet-950/20 py-4 md:py-8">
      <div className="max-w-[630px] mx-auto px-0 md:px-4">
        <PostFeed />
      </div>
    </div>
  );
}

