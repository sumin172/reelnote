import type { ApplicationConfig } from "./application.config.js";

/**
 * CORS 설정 빌더
 *
 * 정책:
 * - development: localhost:* 패턴 허용 (유연성)
 * - production: 환경 변수에서 지정한 origin만 허용 (보안)
 */
export function buildCorsOptions(appConfig: ApplicationConfig) {
  const allowedOrigins = appConfig.corsOrigins;

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // development: localhost 전체 허용
      if (appConfig.isDevelopment) {
        if (
          !origin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return callback(null, true);
        }
      }

      // production: env 기반 (엄격)
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}
