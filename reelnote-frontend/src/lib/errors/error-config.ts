import {
  ErrorCode,
  CommonErrorCode,
  ReviewErrorCode,
  CatalogErrorCode,
} from "./error-codes";

/**
 * 에러 코드별 설정 (메시지 + 처리 전략 통합)
 */
export type ErrorConfig = {
  /** 프론트엔드에서 사용할 기본 메시지 (백엔드 message가 없을 때 fallback) */
  message?: string;
  /** 재시도 가능 여부 */
  retryable?: boolean;
  /** 특정 페이지로 리다이렉트 */
  redirect?: string;
  /** 로깅 레벨 */
  logLevel?: "error" | "warn" | "info";
};

/**
 * 에러 코드별 설정 매핑
 * Partial을 사용하여 일부 코드만 설정 가능
 */
export const errorConfig: Partial<Record<ErrorCode, ErrorConfig>> = {
  // 공통 에러
  [CommonErrorCode.VALIDATION_ERROR]: {
    message: "입력 데이터 검증에 실패했습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CommonErrorCode.UNAUTHORIZED]: {
    message: "인증이 필요합니다",
    retryable: false,
    redirect: "/login",
    logLevel: "warn",
  },
  [CommonErrorCode.FORBIDDEN]: {
    message: "권한이 없습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CommonErrorCode.NOT_FOUND]: {
    message: "리소스를 찾을 수 없습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CommonErrorCode.CONFLICT]: {
    message: "리소스 충돌이 발생했습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CommonErrorCode.UNPROCESSABLE_ENTITY]: {
    message: "요청을 처리할 수 없습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CommonErrorCode.INTERNAL_ERROR]: {
    message: "서버 내부 오류가 발생했습니다",
    retryable: true,
    logLevel: "error",
  },
  [CommonErrorCode.EXTERNAL_API_ERROR]: {
    message: "외부 API 호출에 실패했습니다",
    retryable: true,
    logLevel: "error",
  },
  [CommonErrorCode.SERVICE_UNAVAILABLE]: {
    message: "서비스를 일시적으로 사용할 수 없습니다",
    retryable: true,
    logLevel: "warn",
  },

  // Review 도메인 에러
  [ReviewErrorCode.REVIEW_NOT_FOUND]: {
    message: "리뷰를 찾을 수 없습니다",
    retryable: false,
    logLevel: "warn",
  },
  [ReviewErrorCode.REVIEW_ALREADY_EXISTS]: {
    message: "이미 해당 영화에 대한 리뷰가 존재합니다",
    retryable: false,
    logLevel: "warn",
  },
  [ReviewErrorCode.REVIEW_UNAUTHORIZED_UPDATE]: {
    message: "본인의 리뷰만 수정할 수 있습니다",
    retryable: false,
    logLevel: "warn",
  },
  [ReviewErrorCode.REVIEW_UNAUTHORIZED_DELETE]: {
    message: "본인의 리뷰만 삭제할 수 있습니다",
    retryable: false,
    logLevel: "warn",
  },

  // Catalog 도메인 에러
  [CatalogErrorCode.CATALOG_MOVIE_NOT_FOUND]: {
    message: "영화 정보를 찾을 수 없습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CatalogErrorCode.CATALOG_TMDB_API_FAILED]: {
    message: "TMDB API 호출에 실패했습니다",
    retryable: true,
    logLevel: "error",
  },
  [CatalogErrorCode.CATALOG_JOB_NOT_FOUND]: {
    message: "작업을 찾을 수 없습니다",
    retryable: false,
    logLevel: "warn",
  },
  [CatalogErrorCode.CATALOG_JOB_IN_PROGRESS]: {
    message: "작업이 이미 진행 중입니다",
    retryable: false,
    logLevel: "warn",
  },
  // TMDB API 상세 에러 코드 (백엔드에서 실제 사용 중)
  [CatalogErrorCode.CATALOG_TMDB_API_ERROR]: {
    message: "TMDB API 오류가 발생했습니다",
    retryable: true,
    logLevel: "error",
  },
  [CatalogErrorCode.CATALOG_TMDB_NETWORK_ERROR]: {
    message: "TMDB API 요청 중 네트워크 오류가 발생했습니다",
    retryable: true,
    logLevel: "error",
  },
  [CatalogErrorCode.CATALOG_TMDB_CIRCUIT_BREAKER_OPEN]: {
    message:
      "TMDB API 서킷브레이커가 OPEN 상태입니다. 잠시 후 다시 시도해주세요",
    retryable: true,
    logLevel: "warn",
  },
  [CatalogErrorCode.CATALOG_TMDB_TIMEOUT]: {
    message: "TMDB API 요청이 시간 제한을 초과했습니다",
    retryable: true,
    logLevel: "error",
  },
  [CatalogErrorCode.CATALOG_TMDB_UNEXPECTED_ERROR]: {
    message: "TMDB API 요청 중 예상치 못한 오류가 발생했습니다",
    retryable: true,
    logLevel: "error",
  },
};
