import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Application 설정 Provider
 *
 * 환경 변수 검증이 완료된 ConfigService를 기반으로
 * 타입 안전한 Application 설정을 제공합니다.
 */
@Injectable()
export class ApplicationConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 서버 포트
   * 기본값: 3001
   */
  get port(): number {
    return this.configService.get<number>("PORT", { infer: true }) ?? 3001;
  }

  /**
   * Node 환경
   * 기본값: development
   */
  get nodeEnv(): "development" | "production" | "test" | "e2e" {
    return (
      (this.configService.get<"development" | "production" | "test" | "e2e">(
        "NODE_ENV",
        { infer: true },
      ) as "development" | "production" | "test" | "e2e") ?? "development"
    );
  }

  /**
   * CORS 허용 Origin 목록
   * 쉼표로 구분된 문자열
   */
  get corsOrigins(): string[] {
    const originsEnv =
      this.configService.get<string>("CORS_ORIGINS", { infer: true }) ?? "";
    return originsEnv
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  /**
   * Development 환경 여부
   */
  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  /**
   * Production 환경 여부
   */
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }
}
