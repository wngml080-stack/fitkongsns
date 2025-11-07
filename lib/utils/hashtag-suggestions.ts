/**
 * @file hashtag-suggestions.ts
 * @description 해시태그 추천 유틸리티
 *
 * 주요 기능:
 * - 인기 해시태그 목록 제공
 * - 검색어에 맞는 해시태그 필터링
 */

// 인기 해시태그 목록 (실제로는 API에서 가져올 수 있음)
const POPULAR_HASHTAGS = [
  "#여행",
  "#맛집",
  "#데일리",
  "#일상",
  "#운동",
  "#건강",
  "#패션",
  "#스타일",
  "#맛스타그램",
  "#데일리룩",
  "#오늘의하루",
  "#좋아요반사",
  "#팔로우",
  "#좋아요",
  "#인스타그램",
  "#셀카",
  "#사진",
  "#예쁜사진",
  "#일상스타그램",
  "#데일리스타그램",
];

/**
 * 검색어에 맞는 해시태그 추천 목록 반환
 */
export function getHashtagSuggestions(query: string, limit = 10): string[] {
  if (!query || query.trim() === "") {
    return POPULAR_HASHTAGS.slice(0, limit);
  }

  const lowerQuery = query.toLowerCase();
  const filtered = POPULAR_HASHTAGS.filter((tag) =>
    tag.toLowerCase().includes(lowerQuery)
  );

  return filtered.slice(0, limit);
}

