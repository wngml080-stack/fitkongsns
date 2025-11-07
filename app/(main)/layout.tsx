import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

/**
 * @file layout.tsx
 * @description (main) Route Group 레이아웃
 *
 * 주요 기능:
 * - Sidebar, Header, BottomNav 통합
 * - 반응형 레이아웃 적용
 * - 배경색: #FAFAFA (Instagram 스타일)
 *
 * 레이아웃 구조:
 * - Desktop: Sidebar (244px) + Main Content
 * - Tablet: Sidebar (72px) + Main Content
 * - Mobile: Header (60px) + Main Content + BottomNav (50px)
 */

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--instagram-background)] dark:bg-[var(--background)]">
      {/* Sidebar - Desktop/Tablet 전용 */}
      <Sidebar />

      {/* Header - Mobile 전용 */}
      <Header />

      {/* Main Content */}
      <main
        className={`
          min-h-screen
          md:ml-[72px] lg:ml-[244px]
          pt-[60px] md:pt-0
          pb-[50px] md:pb-0
        `}
      >
        {children}
      </main>

      {/* BottomNav - Mobile 전용 */}
      <BottomNav />
    </div>
  );
}

