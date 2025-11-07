/**
 * @file share.ts
 * @description 공유 기능 유틸리티
 *
 * 주요 기능:
 * - URL 복사
 * - Web Share API 사용
 * - 공유 다이얼로그 표시
 */

/**
 * URL을 클립보드에 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    // Fallback: 구식 방법
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error("Fallback copy failed:", fallbackErr);
      return false;
    }
  }
}

/**
 * Web Share API를 사용하여 공유
 */
export async function shareViaWebAPI(
  url: string,
  title?: string,
  text?: string
): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: title || "게시물 공유",
      text: text || "",
      url: url,
    });
    return true;
  } catch (err) {
    // 사용자가 공유를 취소한 경우
    if ((err as Error).name === "AbortError") {
      return false;
    }
    console.error("Share failed:", err);
    return false;
  }
}

/**
 * 공유 기능 (Web Share API 우선, 실패 시 클립보드 복사)
 */
export async function shareContent(
  url: string,
  title?: string,
  text?: string
): Promise<{ success: boolean; method: "web" | "clipboard" | "none" }> {
  // Web Share API 시도
  const webShareSuccess = await shareViaWebAPI(url, title, text);
  if (webShareSuccess) {
    return { success: true, method: "web" };
  }

  // 클립보드 복사 시도
  const clipboardSuccess = await copyToClipboard(url);
  if (clipboardSuccess) {
    return { success: true, method: "clipboard" };
  }

  return { success: false, method: "none" };
}

