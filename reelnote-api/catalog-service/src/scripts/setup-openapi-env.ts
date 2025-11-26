/**
 * OpenAPI 스키마 생성용 더미 환경 변수.
 * 실제 외부 API 호출/DB 연결은 isSchemaGeneration()으로 막고 있으므로,
 * 여기 값들은 유효한 값일 필요는 없다. 단, validation 스키마를 통과해야 한다.
 */
// OpenAPI 생성 시 환경 변수 검증 비활성화
// 이 파일은 generate-openapi.ts에서 먼저 import되어야 합니다.
process.env.SKIP_ENV_VALIDATION = "true";

// OpenAPI 생성에 필요한 최소 환경 변수 설정 (더미 값)
// 실제 값이 없을 때만 더미 값으로 설정
// ConfigService가 이 값들을 읽을 수 있도록 미리 설정
process.env.TMDB_API_KEY =
  process.env.TMDB_API_KEY || "dummy-key-for-openapi-generation";
process.env.TMDB_API_BASE_URL =
  process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3";
process.env.TMDB_API_TIMEOUT = process.env.TMDB_API_TIMEOUT || "10000";
process.env.CATALOG_DB_URL =
  process.env.CATALOG_DB_URL || "postgresql://dummy:dummy@localhost:5432/dummy";
process.env.REDIS_URL = process.env.REDIS_URL || "";
process.env.CACHE_NAMESPACE = process.env.CACHE_NAMESPACE || "catalog-cache";
process.env.CACHE_TTL_SECONDS = process.env.CACHE_TTL_SECONDS || "3600";
process.env.PORT = process.env.PORT || "4000";
process.env.MOVIE_STALE_THRESHOLD_DAYS =
  process.env.MOVIE_STALE_THRESHOLD_DAYS || "30";
process.env.WARM_POOL_SIZE = process.env.WARM_POOL_SIZE || "100";
process.env.NODE_ENV = process.env.NODE_ENV || "development";
