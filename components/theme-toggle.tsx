"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

/**
 * @file theme-toggle.tsx
 * @description 다크모드 토글 버튼 컴포넌트
 *
 * 주요 기능:
 * - 라이트/다크 모드 전환 버튼
 * - 아이콘으로 현재 모드 표시
 *
 * @dependencies
 * - components/providers/theme-provider: useTheme 훅
 * - lucide-react: 아이콘
 */

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        flex items-center justify-center
        w-9 h-9 rounded-lg
        text-[var(--instagram-text-primary)]
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
      "
      aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}

