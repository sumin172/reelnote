import {
  CommonErrorCode,
  ReviewErrorCode,
  CatalogErrorCode,
} from "../error-codes";
import { errorConfig } from "../error-config";

describe("Error Config", () => {
  /**
   * 선택적 테스트: 주요 에러 코드에 설정이 있는지 확인
   *
   * 주의: 모든 에러 코드에 설정이 있어야 한다는 강한 계약이 아니라,
   *       중요한 에러 코드들이 누락되지 않았는지 확인하는 수준
   */
  it("should have config for important error codes", () => {
    const importantCodes = [
      CommonErrorCode.VALIDATION_ERROR,
      CommonErrorCode.UNAUTHORIZED,
      CommonErrorCode.FORBIDDEN,
      CommonErrorCode.NOT_FOUND,
      CommonErrorCode.INTERNAL_ERROR,
      ReviewErrorCode.REVIEW_NOT_FOUND,
      CatalogErrorCode.CATALOG_MOVIE_NOT_FOUND,
    ];

    importantCodes.forEach((code) => {
      expect(errorConfig).toHaveProperty(code);
      expect(errorConfig[code]).toBeDefined();
    });
  });

  /**
   * 설정이 있는 에러 코드의 구조 검증
   *
   * 의식적 선택: errorConfig에 뭔가 넣을 거면 최소한 message, retryable, logLevel은 채워야 한다는 룰을 강제
   * 나중에 "로그만 남기고 싶은 에러" 같은 케이스가 생기면 이 테스트를 조정할 수 있음
   */
  it("should have valid structure for configured error codes", () => {
    Object.values(errorConfig).forEach((config) => {
      // undefined 스킵
      if (!config) return;

      expect(config).toHaveProperty("message");
      expect(config).toHaveProperty("retryable");
      expect(config).toHaveProperty("logLevel");

      if (config.retryable === true) {
        // 재시도 가능한 에러는 error 또는 warn 레벨이어야 함
        expect(["error", "warn"]).toContain(config.logLevel);
      }
    });
  });
});
