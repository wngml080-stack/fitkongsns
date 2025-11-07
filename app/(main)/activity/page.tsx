import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LikedPostGrid from "@/components/activity/LikedPostGrid";

export default async function ActivityPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/activity");
  }

  return (
    <div className="min-h-screen bg-[var(--instagram-background)] dark:bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
          좋아요한 게시물
        </h1>
        <LikedPostGrid />
      </div>
    </div>
  );
}
