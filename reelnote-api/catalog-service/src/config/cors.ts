/**
 * CORS 설정 빌더
 *
 * 정책:
 * - development: localhost:* 패턴 허용 (유연성)
 * - e2e: 환경 변수에서 지정한 origin만 허용 (엄격)
 * - production: 환경 변수에서 지정한 origin만 허용 (보안)
 */
export function buildCorsOptions() {
  const nodeEnv = process.env.NODE_ENV;
  const allowedOriginsEnv = process.env.CORS_ORIGINS ?? "";

  const allowedOrigins = allowedOriginsEnv
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // development: localhost 전체 허용
      if (nodeEnv === "development") {
        if (
          !origin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return callback(null, true);
        }
      }

      // prod / e2e: env 기반
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}
