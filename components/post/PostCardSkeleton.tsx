/**
 * @file PostCardSkeleton.tsx
 * @description 게시물 카드 로딩 UI (Skeleton)
 *
 * 주요 기능:
 * - Skeleton UI (회색 박스 애니메이션)
 * - Shimmer 효과
 * - PostCard와 동일한 레이아웃 구조
 */

export default function PostCardSkeleton() {
  return (
    <article className="bg-white border border-[var(--instagram-border)] rounded-sm mb-4 animate-pulse">
      {/* 헤더 Skeleton */}
      <header className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--instagram-border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="w-5 h-5 bg-gray-200 rounded" />
      </header>

      {/* 이미지 영역 Skeleton */}
      <div className="relative w-full aspect-square bg-gray-200">
        {/* Shimmer 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>

      {/* 액션 버튼 Skeleton */}
      <div className="h-[48px] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="w-6 h-6 bg-gray-200 rounded" />
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded" />
      </div>

      {/* 컨텐츠 Skeleton */}
      <div className="px-4 pb-4 space-y-3">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-4/5 bg-gray-200 rounded" />
        </div>
      </div>
    </article>
  );
}

