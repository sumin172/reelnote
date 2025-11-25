/**
 * 공통 에러 코드 (서비스 간 공유)
 * docs/specs/error-handling.md와 일치해야 함
 */
export enum CommonErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  UNPROCESSABLE_ENTITY = "UNPROCESSABLE_ENTITY",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

/**
 * Review Service 도메인 에러 코드
 */
export enum ReviewErrorCode {
  REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND",
  REVIEW_ALREADY_EXISTS = "REVIEW_ALREADY_EXISTS",
  REVIEW_UNAUTHORIZED_UPDATE = "REVIEW_UNAUTHORIZED_UPDATE",
  REVIEW_UNAUTHORIZED_DELETE = "REVIEW_UNAUTHORIZED_DELETE",
}

/**
 * Catalog Service 도메인 에러 코드
 */
export enum CatalogErrorCode {
  CATALOG_MOVIE_NOT_FOUND = "CATALOG_MOVIE_NOT_FOUND",
  CATALOG_TMDB_API_FAILED = "CATALOG_TMDB_API_FAILED",
  CATALOG_JOB_NOT_FOUND = "CATALOG_JOB_NOT_FOUND",
  CATALOG_JOB_IN_PROGRESS = "CATALOG_JOB_IN_PROGRESS",
  CATALOG_TMDB_API_ERROR = "CATALOG_TMDB_API_ERROR",
  CATALOG_TMDB_NETWORK_ERROR = "CATALOG_TMDB_NETWORK_ERROR",
  CATALOG_TMDB_CIRCUIT_BREAKER_OPEN = "CATALOG_TMDB_CIRCUIT_BREAKER_OPEN",
  CATALOG_TMDB_TIMEOUT = "CATALOG_TMDB_TIMEOUT",
  CATALOG_TMDB_UNEXPECTED_ERROR = "CATALOG_TMDB_UNEXPECTED_ERROR",
}

/**
 * 모든 에러 코드의 유니온 타입
 */
export type ErrorCode = CommonErrorCode | ReviewErrorCode | CatalogErrorCode;

/**
 * 알 수 없는 에러 코드를 나타내는 리터럴 타입
 */
export type UnknownErrorCode = "UNKNOWN_ERROR";

/**
 * 정규화된 에러 코드 타입 (알려진 코드 또는 UNKNOWN_ERROR)
 */
export type NormalizedErrorCode = ErrorCode | UnknownErrorCode;

/**
 * 모든 에러 코드를 포함하는 Set (캐시)
 * isErrorCode 함수의 성능 최적화를 위해 한 번만 빌드
 */
const ALL_ERROR_CODES = new Set<ErrorCode>([
  ...Object.values(CommonErrorCode),
  ...Object.values(ReviewErrorCode),
  ...Object.values(CatalogErrorCode),
]);

/**
 * 문자열이 유효한 에러 코드인지 검증
 * Set을 사용하여 O(1) 시간 복잡도로 검증
 */
export function isErrorCode(code: string): code is ErrorCode {
  return ALL_ERROR_CODES.has(code as ErrorCode);
}
