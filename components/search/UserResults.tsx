import Link from "next/link";

interface UserResult {
  id: string;
  clerk_id: string;
  name: string;
}

interface UserResultsProps {
  users: UserResult[];
}

export default function UserResults({ users }: UserResultsProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/profile/${user.clerk_id}`}
          className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--instagram-border)] dark:border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
              {user.name}
            </span>
            <span className="text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              @{user.clerk_id}
            </span>
          </div>
          <span className="text-sm text-[var(--instagram-blue)]">프로필 보기</span>
        </Link>
      ))}
    </div>
  );
}
