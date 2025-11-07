"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import HashtagPostGrid from "@/components/search/HashtagPostGrid";
import UserResults from "@/components/search/UserResults";
import { Search } from "lucide-react";

interface HashtagSuggestion {
  id: string;
  tag: string;
  posts_count: number;
}

interface UserSuggestion {
  id: string;
  clerk_id: string;
  name: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestion[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setHashtagSuggestions([]);
      setUserSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        setSuggestionError(null);

        const type = query.trim().startsWith("#") ? "hashtag" : "all";
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&type=${type}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("검색 결과를 불러오는 데 실패했습니다.");
        }

        const data = await response.json();
        setHashtagSuggestions(data.hashtags || []);
        setUserSuggestions(data.users || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching search suggestions:", error);
          setSuggestionError("검색 결과를 불러오는데 실패했습니다.");
        }
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounceTimeout = setTimeout(fetchSuggestions, 250);
    return () => {
      controller.abort();
      clearTimeout(debounceTimeout);
    };
  }, [query]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerHashtagSearch(query.trim());
  };

  const triggerHashtagSearch = (rawValue: string) => {
    if (!rawValue) {
      return;
    }
    if (!rawValue.startsWith("#")) {
      return;
    }
    const normalized = rawValue.replace(/^#+/, "").toLowerCase();
    if (!normalized) {
      return;
    }
    setSelectedHashtag(normalized);
  };

  const handleHashtagClick = (tag: string) => {
    setQuery(`#${tag}`);
    setSelectedHashtag(tag.toLowerCase());
  };

  const showUserResults = query.trim().length > 0 && !query.trim().startsWith("#");

  return (
    <div className="min-h-screen bg-[var(--instagram-background)] dark:bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
            검색
          </h1>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--instagram-text-secondary)]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="#해시태그 또는 사용자명을 입력하세요"
                className="pl-10"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[var(--instagram-blue)] text-white font-semibold hover:bg-[var(--instagram-blue)]/90"
            >
              검색
            </button>
          </form>
          {suggestionError && (
            <p className="text-sm text-[var(--instagram-like)]">{suggestionError}</p>
          )}
          {loadingSuggestions && query && (
            <p className="text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
              검색 중...
            </p>
          )}
        </div>

        {hashtagSuggestions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
              해시태그
            </h2>
            <div className="flex flex-wrap gap-2">
              {hashtagSuggestions.map((hashtag) => (
                <button
                  type="button"
                  key={hashtag.id}
                  onClick={() => handleHashtagClick(hashtag.tag)}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${
                    selectedHashtag === hashtag.tag
                      ? "bg-[var(--instagram-blue)] text-white border-[var(--instagram-blue)]"
                      : "border-[var(--instagram-border)] dark:border-[var(--border)] text-[var(--instagram-text-primary)] dark:text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  #{hashtag.tag}
                  <span className="ml-2 text-xs text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
                    {hashtag.posts_count.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showUserResults && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
              사용자
            </h2>
            <UserResults users={userSuggestions} />
          </div>
        )}

        {selectedHashtag ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--instagram-text-primary)] dark:text-[var(--foreground)]">
                #{selectedHashtag} 게시물
              </h2>
              <button
                type="button"
                onClick={() => setSelectedHashtag(null)}
                className="text-sm text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)] hover:underline"
              >
                선택 해제
              </button>
            </div>
            <HashtagPostGrid hashtag={selectedHashtag} />
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--instagram-text-secondary)] dark:text-[var(--muted-foreground)]">
            <p>검색어를 입력하거나 해시태그를 선택하면 게시물이 표시됩니다.</p>
            <p className="mt-2 text-sm">예: #여행, #맛집</p>
          </div>
        )}
      </div>
    </div>
  );
}
