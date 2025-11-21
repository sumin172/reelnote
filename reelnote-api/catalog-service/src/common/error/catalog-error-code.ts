/**
 * Catalog Service 에러 코드
 *
 * 도메인별, 검증별, 범용 에러 코드를 포함합니다.
 * 향후 다른 서비스와 공통으로 사용되는 코드는 CommonErrorCode로 분리 가능합니다.
 */
export enum CatalogErrorCode {
  // ============================================
  // 도메인 에러 (CATALOG_ prefix)
  // ============================================
  /** 영화를 찾을 수 없음 */
  MOVIE_NOT_FOUND = "CATALOG_MOVIE_NOT_FOUND",

  /** TMDB API 호출 실패 */
  TMDB_API_FAILED = "CATALOG_TMDB_API_FAILED",

  /** 작업(Job)을 찾을 수 없음 */
  JOB_NOT_FOUND = "CATALOG_JOB_NOT_FOUND",

  /** 작업이 이미 진행 중 */
  JOB_IN_PROGRESS = "CATALOG_JOB_IN_PROGRESS",

  // ============================================
  // 검증 에러 (VALIDATION_ prefix, 서비스 공통 가능)
  // ============================================
  /** 검증 에러 (범용, ValidationPipe 등에서 사용) */
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // ============================================
  // 범용 에러 (서비스 공통 가능)
  // ============================================
  /** 내부 서버 오류 */
  INTERNAL_ERROR = "INTERNAL_ERROR",

  /** 알 수 없는 오류 */
  UNKNOWN_ERROR = "UNKNOWN_ERROR",

  // ============================================
  // HTTP 상태 코드 기반 범용 코드
  // ============================================
  /** 인증 필요 */
  UNAUTHORIZED = "UNAUTHORIZED",

  /** 접근 금지 */
  FORBIDDEN = "FORBIDDEN",

  /** 리소스를 찾을 수 없음 (범용) */
  NOT_FOUND = "NOT_FOUND",

  /** 충돌 (범용) */
  CONFLICT = "CONFLICT",

  /** 외부 API 오류 (범용) */
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",

  /** 서비스 사용 불가 (Circuit Breaker 등, 범용) */
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // ============================================
  // TMDB API 관련 에러 코드
  // ============================================
  /** TMDB API 오류 (상태 코드 포함) */
  CATALOG_TMDB_API_ERROR = "CATALOG_TMDB_API_ERROR",

  /** TMDB API 네트워크 오류 */
  CATALOG_TMDB_NETWORK_ERROR = "CATALOG_TMDB_NETWORK_ERROR",

  /** TMDB API 서킷브레이커 OPEN */
  CATALOG_TMDB_CIRCUIT_BREAKER_OPEN = "CATALOG_TMDB_CIRCUIT_BREAKER_OPEN",

  /** TMDB API 타임아웃 */
  CATALOG_TMDB_TIMEOUT = "CATALOG_TMDB_TIMEOUT",

  /** TMDB API 예상치 못한 오류 */
  CATALOG_TMDB_UNEXPECTED_ERROR = "CATALOG_TMDB_UNEXPECTED_ERROR",
}
