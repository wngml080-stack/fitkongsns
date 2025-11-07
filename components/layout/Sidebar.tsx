"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Heart, Bookmark, User } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import ThemeToggle from "@/components/theme-toggle";
import CreatePostModal from "@/components/post/CreatePostModal";

/**
 * @file Sidebar.tsx
 * @description Instagram 스타일의 반응형 사이드바 컴포넌트
 *
 * 주요 기능:
 * - Desktop (≥1024px): 244px 너비, 아이콘 + 텍스트 메뉴
 * - Tablet (768px~1023px): 72px 너비, 아이콘만 표시
 * - Mobile (<768px): 숨김
 * - Hover 효과 및 Active 상태 스타일
 *
 * @dependencies
 * - next/navigation: usePathname
 * - lucide-react: 아이콘
 * - @clerk/nextjs: 인증 상태 및 UserButton
 */

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAuth?: boolean;
}

const menuItems: MenuItem[] = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/search", icon: Search, label: "검색" },
  { href: "/create", icon: Plus, label: "만들기", requiresAuth: true },
  { href: "/activity", icon: Heart, label: "좋아요", requiresAuth: true },
  { href: "/saved", icon: Bookmark, label: "저장됨", requiresAuth: true },
  { href: "/profile", icon: User, label: "프로필", requiresAuth: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const getProfileHref = () => {
    if (user?.id) {
      return `/profile/${user.id}`;
    }
    return "/profile";
  };

  return (
    <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen bg-white dark:bg-[var(--card)] border-r border-[var(--instagram-border)] dark:border-[var(--border)] z-40">
      {/* Desktop: 244px 너비, Tablet: 72px 너비 */}
      <div className="w-[244px] md:w-[72px] lg:w-[244px] h-full flex flex-col">
        {/* 로고 영역 */}
        <div className="h-[60px] flex items-center px-4 md:px-3 lg:px-4 border-b border-[var(--instagram-border)] dark:border-[var(--border)]">
          <Link
            href="/"
            className="text-xl font-bold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] whitespace-nowrap overflow-hidden"
          >
            <span className="md:hidden lg:inline">Moment</span>
            <span className="hidden md:inline lg:hidden">M</span>
          </Link>
        </div>

        {/* 메뉴 영역 */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const href = item.href === "/profile" ? getProfileHref() : item.href;
            const active = isActive(href);

            // "만들기" 버튼은 모달 트리거로 처리
            if (item.href === "/create") {
              if (!isSignedIn) {
                return (
                  <SignInButton key={item.href} mode="modal">
                    <button
                      className={`
                        flex items-center gap-4 px-3 py-2 rounded-lg transition-colors w-full text-left
                        ${
                          active
                            ? "font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                            : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-gray-800"
                        }
                      `}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          active ? "stroke-[2.5]" : "stroke-2"
                        }`}
                      />
                      <span className="md:hidden lg:inline text-base">
                        {item.label}
                      </span>
                    </button>
                  </SignInButton>
                );
              }

              return (
                <button
                  key={item.href}
                  onClick={() => setIsCreateModalOpen(true)}
                  className={`
                    flex items-center gap-4 px-3 py-2 rounded-lg transition-colors w-full text-left
                    ${
                      active
                        ? "font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                        : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  <Icon
                    className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-2"}`}
                  />
                  <span className="md:hidden lg:inline text-base">
                    {item.label}
                  </span>
                </button>
              );
            }

            // 인증이 필요한 메뉴는 로그인하지 않은 경우 SignInButton으로 감싸기
            if (item.requiresAuth && !isSignedIn) {
              return (
                <SignInButton key={item.href} mode="modal">
                  <button
                    className={`
                      flex items-center gap-4 px-3 py-2 rounded-lg transition-colors w-full text-left
                      ${
                        active
                          ? "font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                          : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-gray-800"
                      }
                    `}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        active ? "stroke-[2.5]" : "stroke-2"
                      }`}
                    />
                    <span className="md:hidden lg:inline text-base">
                      {item.label}
                    </span>
                  </button>
                </SignInButton>
              );
            }

            return (
              <Link
                key={item.href}
                href={href}
                className={`
                  flex items-center gap-4 px-3 py-2 rounded-lg transition-colors
                  ${
                    active
                      ? "font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]"
                      : "text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-gray-800"
                  }
                `}
              >
                <Icon
                  className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-2"}`}
                />
                <span className="md:hidden lg:inline text-base">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 프로필 영역 */}
        <div className="px-3 py-4 border-t border-[var(--instagram-border)] dark:border-[var(--border)] space-y-2">
          {/* 다크모드 토글 버튼 */}
          <div className="px-3">
            <ThemeToggle />
          </div>

          <SignedIn>
            <div className="flex items-center gap-4 px-3 py-2">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-6 h-6",
                  },
                }}
              />
              <span className="md:hidden lg:inline text-base font-medium text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                프로필
              </span>
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-4 px-3 py-2 w-full text-left text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <User className="w-6 h-6 stroke-2" />
                <span className="md:hidden lg:inline text-base">로그인</span>
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      {/* 게시물 작성 모달 */}
      <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </aside>
  );
}

