"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, Heart, Bookmark, User } from "lucide-react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

/**
 * @file BottomNav.tsx
 * @description Mobile 전용 하단 네비게이션 컴포넌트
 *
 * 주요 기능:
 * - Mobile (<768px)에서만 표시
 * - 높이: 50px
 * - 5개 아이콘: 홈, 검색, 만들기, 좋아요, 프로필
 * - 하단 고정 (fixed)
 *
 * @dependencies
 * - next/navigation: usePathname
 * - lucide-react: 아이콘
 * - @clerk/nextjs: 인증 상태
 */

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/search", icon: Search, label: "검색" },
  { href: "/create", icon: Plus, label: "만들기", requiresAuth: true },
  { href: "/activity", icon: Heart, label: "좋아요", requiresAuth: true },
  { href: "/saved", icon: Bookmark, label: "저장됨", requiresAuth: true },
  { href: "/profile", icon: User, label: "프로필", requiresAuth: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isSignedIn } = useAuth();

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[50px] bg-white border-t border-[var(--instagram-border)] z-50 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const href = item.href === "/profile" ? getProfileHref() : item.href;
        const active = isActive(item.href === "/profile" ? getProfileHref() : item.href);

        // 인증이 필요한 메뉴는 로그인하지 않은 경우 SignInButton으로 감싸기
        if (item.requiresAuth && !isSignedIn) {
          return (
            <SignInButton key={item.href} mode="modal">
              <button
                className={`
                  flex flex-col items-center justify-center flex-1 h-full
                  ${active ? "text-[var(--instagram-text-primary)]" : "text-[var(--instagram-text-secondary)]"}
                  hover:text-[var(--instagram-text-primary)] transition-colors
                `}
                aria-label={item.label}
              >
                <Icon
                  className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-2"}`}
                />
              </button>
            </SignInButton>
          );
        }

        return (
          <Link
            key={item.href}
            href={href}
            className={`
              flex flex-col items-center justify-center flex-1 h-full
              ${active ? "text-[var(--instagram-text-primary)]" : "text-[var(--instagram-text-secondary)]"}
              hover:text-[var(--instagram-text-primary)] transition-colors
            `}
            aria-label={item.label}
          >
            <Icon
              className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-2"}`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

