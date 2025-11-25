"use client";

import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { handleError, HandledError } from "@/lib/errors/error-utils";

/**
 * 에러 핸들러 훅
 *
 * 역할: 전역 정책 / 리다이렉트 / 로깅 담당 (부작용 중심)
 * - 에러 코드별 처리 전략 적용 (리다이렉트, 로깅 등)
 * - UNAUTHORIZED 등 redirect 설정 시 자동 리다이렉트
 * - 개발 환경에서 로깅
 *
 * 참고: 화면에 표시할 메시지는 `getUserMessage()`를 사용하세요.
 *
 * @returns 에러를 처리하는 함수 (반환값은 선택적으로 사용 가능)
 */
export function useErrorHandler() {
  const router = useRouter();

  return (error: unknown): HandledError => {
    if (error instanceof ApiError) {
      const handled = handleError(error);

      // redirect가 설정되어 있으면 리다이렉트 실행
      if (handled.redirect) {
        router.push(handled.redirect);
      }

      // 로깅은 client.ts의 apiFetch에서 이미 처리됨 (중복 방지)

      // 사용자에게 메시지 표시 (toast 등)
      // toast.error(handled.message);

      return handled;
    }

    // 알 수 없는 에러 타입
    return {
      message: "예상치 못한 오류가 발생했습니다",
      retryable: false,
      logLevel: "error",
    };
  };
}
