import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/client";
import { handleError, getUserMessage } from "../error-utils";
import {
  CommonErrorCode,
  ReviewErrorCode,
  CatalogErrorCode,
} from "../error-codes";

describe("handleError", () => {
  describe("알려진 에러 코드 처리", () => {
    it("should return retryable=true for INTERNAL_ERROR", () => {
      const error = new ApiError(
        "서버 오류",
        500,
        CommonErrorCode.INTERNAL_ERROR,
        undefined,
        "test-trace-id",
      );

      const result = handleError(error);

      expect(result.retryable).toBe(true);
      expect(result.logLevel).toBe("error");
      expect(result.traceId).toBe("test-trace-id");
      expect(result.errorCode).toBe(CommonErrorCode.INTERNAL_ERROR);
    });

    it("should return retryable=true for EXTERNAL_API_ERROR", () => {
      const error = new ApiError(
        "외부 API 오류",
        502,
        CommonErrorCode.EXTERNAL_API_ERROR,
      );

      const result = handleError(error);

      expect(result.retryable).toBe(true);
      expect(result.logLevel).toBe("error");
    });

    it("should return retryable=true for SERVICE_UNAVAILABLE", () => {
      const error = new ApiError(
        "서비스 불가",
        503,
        CommonErrorCode.SERVICE_UNAVAILABLE,
      );

      const result = handleError(error);

      expect(result.retryable).toBe(true);
      expect(result.logLevel).toBe("warn");
    });

    it("should return retryable=false for VALIDATION_ERROR", () => {
      const error = new ApiError(
        "검증 실패",
        400,
        CommonErrorCode.VALIDATION_ERROR,
      );

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("warn");
    });

    it("should return retryable=false for UNAUTHORIZED", () => {
      const error = new ApiError(
        "인증 필요",
        401,
        CommonErrorCode.UNAUTHORIZED,
      );

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("warn");
      expect(result.redirect).toBe("/login");
    });

    it("should return retryable=false for FORBIDDEN", () => {
      const error = new ApiError("권한 없음", 403, CommonErrorCode.FORBIDDEN);

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("warn");
    });

    it("should return retryable=false for NOT_FOUND", () => {
      const error = new ApiError("리소스 없음", 404, CommonErrorCode.NOT_FOUND);

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("warn");
    });

    it("should return retryable=true for CATALOG_TMDB_API_FAILED", () => {
      const error = new ApiError(
        "TMDB API 실패",
        502,
        CatalogErrorCode.CATALOG_TMDB_API_FAILED,
      );

      const result = handleError(error);

      expect(result.retryable).toBe(true);
      expect(result.logLevel).toBe("error");
    });

    it("should return retryable=false for REVIEW_NOT_FOUND", () => {
      const error = new ApiError(
        "리뷰 없음",
        404,
        ReviewErrorCode.REVIEW_NOT_FOUND,
      );

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("warn");
    });
  });

  describe("알 수 없는 에러 코드 처리", () => {
    it("should handle UNKNOWN_ERROR code", () => {
      const error = new ApiError("알 수 없는 오류", 500, "UNKNOWN_ERROR");

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("error");
      expect(result.errorCode).toBe("UNKNOWN_ERROR");
      expect(result.message).toBe("알 수 없는 오류");
    });

    it("should handle completely unknown error codes", () => {
      const error = new ApiError("알 수 없는 오류", 500, "SOME_UNKNOWN_CODE");

      const result = handleError(error);

      expect(result.retryable).toBe(false);
      expect(result.logLevel).toBe("error");
      expect(result.errorCode).toBe("UNKNOWN_ERROR");
      expect(result.message).toBe("알 수 없는 오류");
    });

    it("should use error message when config message is not available", () => {
      const error = new ApiError("커스텀 메시지", 500, "UNKNOWN_ERROR");

      const result = handleError(error);

      expect(result.message).toBe("커스텀 메시지");
    });

    it("should use default message when error message is empty", () => {
      const error = new ApiError("", 500, "UNKNOWN_ERROR");

      const result = handleError(error);

      expect(result.message).toBe("알 수 없는 오류가 발생했습니다");
    });
  });

  describe("메시지 우선순위", () => {
    it("should use config message over error message", () => {
      const error = new ApiError(
        "백엔드 메시지",
        400,
        CommonErrorCode.VALIDATION_ERROR,
      );

      const result = handleError(error);

      // error-config.ts의 메시지가 우선
      expect(result.message).toBe("입력 데이터 검증에 실패했습니다");
    });

    it("should fallback to error message when config message is not available", () => {
      // error-config에 없는 에러 코드 (UNKNOWN_ERROR)
      const error = new ApiError("백엔드 메시지", 500, "UNKNOWN_ERROR");

      const result = handleError(error);

      expect(result.message).toBe("백엔드 메시지");
    });
  });

  describe("TraceId 전파", () => {
    it("should include traceId in result", () => {
      const traceId = "test-trace-id-123";
      const error = new ApiError(
        "오류",
        500,
        CommonErrorCode.INTERNAL_ERROR,
        undefined,
        traceId,
      );

      const result = handleError(error);

      expect(result.traceId).toBe(traceId);
    });

    it("should handle missing traceId", () => {
      const error = new ApiError("오류", 500, CommonErrorCode.INTERNAL_ERROR);

      const result = handleError(error);

      expect(result.traceId).toBeUndefined();
    });
  });

  describe("리다이렉트 처리", () => {
    it("should include redirect for UNAUTHORIZED", () => {
      const error = new ApiError(
        "인증 필요",
        401,
        CommonErrorCode.UNAUTHORIZED,
      );

      const result = handleError(error);

      expect(result.redirect).toBe("/login");
    });

    it("should not include redirect for other errors", () => {
      const error = new ApiError("오류", 500, CommonErrorCode.INTERNAL_ERROR);

      const result = handleError(error);

      expect(result.redirect).toBeUndefined();
    });
  });
});

describe("getUserMessage", () => {
  describe("ApiError 처리", () => {
    it("should return config message for known error codes", () => {
      const error = new ApiError(
        "백엔드 메시지",
        400,
        CommonErrorCode.VALIDATION_ERROR,
      );

      const message = getUserMessage(error);

      expect(message).toBe("입력 데이터 검증에 실패했습니다");
    });

    it("should return error message for unknown error codes", () => {
      const error = new ApiError("백엔드 메시지", 500, "UNKNOWN_ERROR");

      const message = getUserMessage(error);

      expect(message).toBe("백엔드 메시지");
    });

    it("should return default message when error message is empty", () => {
      const error = new ApiError("", 500, "UNKNOWN_ERROR");

      const message = getUserMessage(error);

      expect(message).toBe("알 수 없는 오류가 발생했습니다");
    });

    it("should handle error without message", () => {
      const error = new ApiError(
        undefined as unknown as string,
        500,
        CommonErrorCode.INTERNAL_ERROR,
      );

      const message = getUserMessage(error);

      // error-config.ts의 메시지 사용
      expect(message).toBe("서버 내부 오류가 발생했습니다");
    });
  });

  describe("일반 Error 처리", () => {
    it("should return error.message for generic Error", () => {
      const error = new Error("일반 에러 메시지");

      const message = getUserMessage(error);

      expect(message).toBe("일반 에러 메시지");
    });

    it("should handle Error without message", () => {
      const error = new Error();

      const message = getUserMessage(error);

      expect(message).toBe("");
    });
  });

  describe("알 수 없는 타입 처리", () => {
    it("should return default message for unknown error types", () => {
      const error = "string error";

      const message = getUserMessage(error);

      expect(message).toBe("알 수 없는 오류가 발생했습니다");
    });

    it("should return default message for null", () => {
      const message = getUserMessage(null);

      expect(message).toBe("알 수 없는 오류가 발생했습니다");
    });

    it("should return default message for undefined", () => {
      const message = getUserMessage(undefined);

      expect(message).toBe("알 수 없는 오류가 발생했습니다");
    });

    it("should return default message for number", () => {
      const message = getUserMessage(500);

      expect(message).toBe("알 수 없는 오류가 발생했습니다");
    });
  });
});
