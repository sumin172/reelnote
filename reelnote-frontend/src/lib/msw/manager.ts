import { setupWorker } from "msw/browser";
import type { RequestHandler } from "msw";
import { isMSWEnabled } from "../env";

/**
 * MSW 초기화 함수
 *
 * 개발 환경에서만 동작하며, API 요청을 가로채서 mock 데이터를 반환합니다.
 */
export async function initializeMSW(handlers: RequestHandler[]): Promise<void> {
  if (!isMSWEnabled) {
    console.log("🚫 MSW 비활성화됨 (개발 환경이 아니거나 MSW가 비활성화됨)");
    return;
  }

  try {
    const worker = setupWorker(...handlers);

    await worker.start({
      onUnhandledRequest: "bypass", // 처리되지 않은 요청은 그대로 통과
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    });

    console.log("✅ MSW 시작됨 - API 요청이 mock 데이터로 처리됩니다");
    console.log(`📡 등록된 핸들러: ${handlers.length}개`);
  } catch (error) {
    console.error("❌ MSW 시작 실패:", error);
    console.error("💡 해결 방법:");
    console.error("   1. public/mockServiceWorker.js 파일이 존재하는지 확인");
    console.error("   2. 브라우저 개발자 도구에서 Service Worker 탭 확인");
    console.error("   3. 브라우저 캐시 클리어 후 재시도");
    throw error;
  }
}
