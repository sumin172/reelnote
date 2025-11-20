import { plainToInstance } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUrl,
  IsEnum,
  Min,
  Max,
} from "class-validator";
import { validateSync } from "class-validator";

/**
 * 환경 변수 검증 DTO
 *
 * 애플리케이션 시작 시점에 모든 환경 변수를 검증하여
 * 잘못된 설정으로 인한 런타임 오류를 조기에 방지합니다.
 */
class EnvironmentVariables {
  // ========== Database ==========
  @IsString()
  @IsNotEmpty()
  CATALOG_DB_URL!: string;

  // ========== TMDB API ==========
  @IsString()
  @IsNotEmpty()
  TMDB_API_KEY!: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  TMDB_API_BASE_URL?: string;

  @IsNumber()
  @IsOptional()
  @Min(1000) // 최소 1초
  @Max(60000) // 최대 60초
  TMDB_API_TIMEOUT?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  TMDB_API_MAX_CONCURRENCY?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  TMDB_API_MAX_RETRY?: number;

  // Circuit Breaker 설정
  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(300000) // 최대 5분
  TMDB_BREAKER_TIMEOUT?: number;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(600000) // 최대 10분
  TMDB_BREAKER_RESET_TIMEOUT?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  TMDB_BREAKER_ERROR_PERCENTAGE?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  TMDB_BREAKER_VOLUME_THRESHOLD?: number;

  // ========== Cache (Redis) ==========
  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(86400) // 최대 24시간
  CACHE_TTL_SECONDS?: number;

  @IsString()
  @IsOptional()
  CACHE_NAMESPACE?: string;

  // ========== Application ==========
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsEnum(["development", "production", "test", "e2e"])
  @IsOptional()
  NODE_ENV?: "development" | "production" | "test" | "e2e";

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  // ========== Movie Settings ==========
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365) // 최대 1년
  MOVIE_STALE_THRESHOLD_DAYS?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(86400)
  MOVIE_CACHE_TTL_SECONDS?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  MOVIE_IMPORT_CONCURRENCY?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  MOVIE_IMPORT_QUEUE_THRESHOLD?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  MOVIE_IMPORT_CHUNK_SIZE?: number;

  // ========== Sync Settings ==========
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10000)
  WARM_POOL_SIZE?: number;
}

/**
 * 환경 변수 검증 함수
 *
 * ConfigModule.forRoot({ validate })에서 사용됩니다.
 * 검증 실패 시 애플리케이션 시작을 중단합니다.
 */
export function validate(config: Record<string, unknown>) {
  // 빈 문자열을 undefined로 변환 (REDIS_URL 등 선택적 설정)
  const normalizedConfig: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value === "" || value === null) {
      // 빈 문자열이나 null은 undefined로 변환 (선택적 속성)
      normalizedConfig[key] = undefined;
    } else {
      normalizedConfig[key] = value;
    }
  }

  // 커스텀 URL 검증 (postgresql, redis 프로토콜 지원)
  const customErrors: string[] = [];

  // CATALOG_DB_URL 검증
  const dbUrl = normalizedConfig.CATALOG_DB_URL as string | undefined;
  if (!dbUrl || dbUrl.trim() === "") {
    customErrors.push(
      "CATALOG_DB_URL: CATALOG_DB_URL must be a non-empty string",
    );
  } else {
    const urlPattern = /^(postgresql|postgres):\/\/.+/i;
    if (!urlPattern.test(dbUrl)) {
      customErrors.push(
        "CATALOG_DB_URL: CATALOG_DB_URL must be a valid PostgreSQL URL (postgresql://...)",
      );
    }
  }

  // REDIS_URL 검증 (값이 있을 때만)
  const redisUrl = normalizedConfig.REDIS_URL as string | undefined;
  if (redisUrl && redisUrl.trim() !== "") {
    const redisUrlPattern = /^(redis|rediss):\/\/.+/i;
    if (!redisUrlPattern.test(redisUrl)) {
      customErrors.push(
        "REDIS_URL: REDIS_URL must be a valid Redis URL (redis://...) or empty",
      );
    }
  }

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    normalizedConfig,
    {
      enableImplicitConversion: true, // 문자열을 숫자로 자동 변환
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true, // 선택적 속성은 값이 있을 때만 검증
    whitelist: true, // DTO에 정의되지 않은 속성 제거
    forbidNonWhitelisted: false, // 정의되지 않은 속성 허용 (호환성)
  });

  // 커스텀 에러와 class-validator 에러 결합
  const allErrorMessages: string[] = [];

  if (customErrors.length > 0) {
    allErrorMessages.push(...customErrors);
  }

  if (errors.length > 0) {
    const classValidatorMessages = errors.map((error) => {
      const constraints = Object.values(error.constraints || {}).join(", ");
      return `${error.property}: ${constraints}`;
    });
    allErrorMessages.push(...classValidatorMessages);
  }

  if (allErrorMessages.length > 0) {
    const errorMessages = allErrorMessages
      .map((msg) => `  - ${msg}`)
      .join("\n");
    throw new Error(
      `환경 변수 검증 실패:\n${errorMessages}\n\n`.concat(
        "필수 환경 변수를 확인하고 .env 파일을 업데이트하세요.",
      ),
    );
  }

  return validatedConfig;
}
