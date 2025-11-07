/**
 * @file error-handler.ts
 * @description 에러 처리 유틸리티 함수
 *
 * 주요 기능:
 * - API 에러 메시지 추출 및 변환
 * - 네트워크 에러 감지
 * - 사용자 친화적 에러 메시지 생성
 */

/**
 * 네트워크 에러인지 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  if (error instanceof Error && error.message.includes("network")) {
    return true;
  }
  return false;
}

/**
 * API 응답에서 에러 메시지 추출
 */
export async function extractErrorMessage(
  response: Response
): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData.error || errorData.message || "알 수 없는 오류가 발생했습니다.";
  } catch {
    // JSON 파싱 실패 시 HTTP 상태 메시지 사용
    return response.statusText || "서버 오류가 발생했습니다.";
  }
}

/**
 * 사용자 친화적 에러 메시지 생성
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  // 네트워크 에러
  if (isNetworkError(error)) {
    return "인터넷 연결을 확인해주세요. 네트워크 문제로 요청을 처리할 수 없습니다.";
  }

  // Response 에러
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return "잘못된 요청입니다. 입력한 정보를 확인해주세요.";
      case 401:
        return "로그인이 필요합니다. 다시 로그인해주세요.";
      case 403:
        return "권한이 없습니다. 이 작업을 수행할 수 없습니다.";
      case 404:
        return "요청한 내용을 찾을 수 없습니다.";
      case 409:
        return "이미 처리된 요청입니다.";
      case 413:
        return "파일 크기가 너무 큽니다. 더 작은 파일을 선택해주세요.";
      case 429:
        return "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.";
      case 500:
        return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      case 503:
        return "서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.";
      default:
        return `오류가 발생했습니다. (${error.status})`;
    }
  }

  // Error 객체
  if (error instanceof Error) {
    // 이미 사용자 친화적인 메시지인 경우 그대로 반환
    if (
      error.message.includes("인터넷") ||
      error.message.includes("네트워크") ||
      error.message.includes("로그인") ||
      error.message.includes("권한") ||
      error.message.includes("확인") ||
      error.message.includes("시도")
    ) {
      return error.message;
    }

    // 기술적인 에러 메시지는 일반적인 메시지로 변환
    if (error.message.includes("fetch")) {
      return "인터넷 연결을 확인해주세요.";
    }
    if (error.message.includes("timeout")) {
      return "요청 시간이 초과되었습니다. 다시 시도해주세요.";
    }
    if (error.message.includes("Failed to fetch")) {
      return "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.";
    }

    return error.message;
  }

  // 알 수 없는 에러
  return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

/**
 * API 호출 래퍼 함수 (에러 처리 포함)
 */
export async function handleApiRequest<T>(
  request: () => Promise<Response>
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await request();

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      return { error: errorMessage };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    const errorMessage = getUserFriendlyErrorMessage(error);
    console.error("API request error:", error);
    return { error: errorMessage };
  }
}

