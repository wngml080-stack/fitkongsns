import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "*.supabase.co" }, // Supabase Storage 이미지
      { hostname: "api.dicebear.com" }, // 기본 아바타 이미지
    ],
  },
};

export default nextConfig;
