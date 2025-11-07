import Link from "next/link";
import { cn } from "@/lib/utils";

interface MentionUser {
  id: string;
  clerk_id: string;
  name: string;
}

export interface MentionItem {
  display_text: string;
  user: MentionUser;
}

interface MentionTextProps {
  text: string;
  mentions?: MentionItem[];
  className?: string;
}

export default function MentionText({ text, mentions = [], className }: MentionTextProps) {
  if (!mentions.length) {
    return <span className={className}>{text}</span>;
  }

  const mentionMap = new Map<string, MentionItem[]>(
    mentions.reduce((acc, mention) => {
      const key = mention.display_text.toLowerCase();
      const list = acc.get(key) || [];
      list.push(mention);
      acc.set(key, list);
      return acc;
    }, new Map<string, MentionItem[]>())
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const mentionRegex = /@([^\s@]+)/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = mentionRegex.exec(text)) !== null) {
    const start = match.index;
    const end = mentionRegex.lastIndex;
    const display = match[1];
    const key = display.toLowerCase();
    const mentionList = mentionMap.get(key);

    if (start > lastIndex) {
      parts.push(<span key={`text-${index}-${start}`}>{text.slice(lastIndex, start)}</span>);
    }

    if (mentionList && mentionList.length > 0) {
      const mention = mentionList.shift()!;
      parts.push(
        <Link
          key={`mention-${index}-${start}`}
          href={`/profile/${mention.user.clerk_id}`}
          className="text-[var(--instagram-blue)] hover:underline"
        >
          @{display}
        </Link>
      );
    } else {
      parts.push(<span key={`text-mention-${index}-${start}`}>@{display}</span>);
    }

    lastIndex = end;
    index += 1;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-tail`}>{text.slice(lastIndex)}</span>);
  }

  return <span className={cn("whitespace-pre-wrap", className)}>{parts}</span>;
}
