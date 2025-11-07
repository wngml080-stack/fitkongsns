"use client";

import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

/**
 * @file Header.tsx
 * @description Mobile 전용 헤더 컴포넌트
 *
 * 주요 기능:
 * - Mobile (<768px)에서만 표시
 * - 높이: 60px
 * - 로고(좌측) + 알림/DM/프로필 아이콘(우측)
 *
 * @dependencies
 * - @clerk/nextjs: UserButton, 인증 상태
 * - lucide-react: Bell, MessageCircle 아이콘
 */

export default function Header() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-[var(--instagram-border)] z-50 flex items-center justify-between px-4">
      {/* 로고 */}
      <Link
        href="/"
        className="text-xl font-bold text-[var(--instagram-text-primary)]"
      >
        SNS
      </Link>

      {/* 우측 아이콘들 */}
      <div className="flex items-center gap-4">
        <SignedIn>
          {/* 알림 아이콘 */}
          <button
            className="text-[var(--instagram-text-primary)] hover:opacity-70 transition-opacity"
            aria-label="알림"
          >
            <Bell className="w-6 h-6 stroke-2" />
          </button>

          {/* DM 아이콘 */}
          <button
            className="text-[var(--instagram-text-primary)] hover:opacity-70 transition-opacity"
            aria-label="메시지"
          >
            <MessageCircle className="w-6 h-6 stroke-2" />
          </button>

          {/* 프로필 */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-6 h-6",
              },
            }}
          />
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm font-semibold text-[var(--instagram-blue)] hover:opacity-70 transition-opacity">
              로그인
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}

