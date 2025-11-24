import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app/app.module.js";
import { buildCorsOptions } from "./config/cors.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { MessageService } from "./i18n/message.service.js";
import { ApplicationConfig } from "./config/application.config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Application 설정 주입
  const appConfig = app.get(ApplicationConfig);

  // 글로벌 접두사
  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);

  // API 버전 관리
  const defaultVersion = "1";
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion,
  });

  // CORS 설정 (정책 해석기 사용)
  app.enableCors(buildCorsOptions(appConfig));

  // 글로벌 예외 필터 (표준 에러 스키마 적용)
  const messageService = app.get(MessageService);
  app.useGlobalFilters(new HttpExceptionFilter(messageService));

  // Validation 파이프
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle("Catalog Service API")
    .setDescription(
      `ReelNote Catalog Service - 영화 메타데이터 관리

## Error Codes

### 공통 에러 코드
- \`VALIDATION_ERROR\`: 입력 데이터 검증 실패
- \`NOT_FOUND\`: 리소스를 찾을 수 없음
- \`INTERNAL_ERROR\`: 내부 서버 오류
- \`UNKNOWN_ERROR\`: 알 수 없는 오류
- \`UNAUTHORIZED\`: 인증 필요
- \`FORBIDDEN\`: 접근 금지
- \`CONFLICT\`: 리소스 충돌
- \`EXTERNAL_API_ERROR\`: 외부 API 오류
- \`SERVICE_UNAVAILABLE\`: 서비스 사용 불가

### 도메인 에러 코드 (CATALOG_*)
- \`CATALOG_MOVIE_NOT_FOUND\`: 영화를 찾을 수 없음
- \`CATALOG_TMDB_API_FAILED\`: TMDB API 호출 실패
- \`CATALOG_JOB_NOT_FOUND\`: 작업을 찾을 수 없음
- \`CATALOG_JOB_IN_PROGRESS\`: 작업이 이미 진행 중

### TMDB API 관련 에러 코드
- \`CATALOG_TMDB_API_ERROR\`: TMDB API 오류 (상태 코드 포함)
- \`CATALOG_TMDB_NETWORK_ERROR\`: TMDB API 네트워크 오류
- \`CATALOG_TMDB_CIRCUIT_BREAKER_OPEN\`: TMDB API 서킷브레이커 OPEN
- \`CATALOG_TMDB_TIMEOUT\`: TMDB API 타임아웃
- \`CATALOG_TMDB_UNEXPECTED_ERROR\`: TMDB API 예상치 못한 오류`,
    )
    .setVersion("1.0")
    .addTag("movies", "영화 관리")
    .addTag("sync", "동기화")
    .addTag("search", "검색")
    .build();
  // ErrorDetailDto는 @ApiProperty 데코레이터로 자동 등록됨
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = appConfig.port;
  await app.listen(port);

  Logger.log(
    `🚀 Catalog Service is running on: http://localhost:${port}/${globalPrefix}/v${defaultVersion}`,
  );
  Logger.log(`📚 Swagger Docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap().catch((error) => {
  Logger.error("Failed to start application", error);
  process.exit(1);
});
