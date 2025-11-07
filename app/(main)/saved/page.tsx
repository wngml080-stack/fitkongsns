import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SavedPostGrid from "@/components/saved/SavedPostGrid";

export default async function SavedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/saved");
  }

  return (
    <div className="min-h-screen bg-[var(--instagram-background)] dark:bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
            저장한 게시물
          </h1>
        </div>
        <SavedPostGrid />
      </div>
    </div>
  );
}
