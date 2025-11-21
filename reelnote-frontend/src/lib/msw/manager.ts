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
    return;
  }

  const worker = setupWorker(...handlers);

  await worker.start({
    onUnhandledRequest: "bypass", // 처리되지 않은 요청은 그대로 통과
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });

  console.log("✅ MSW 시작됨 - API 요청이 mock 데이터로 처리됩니다");
}
