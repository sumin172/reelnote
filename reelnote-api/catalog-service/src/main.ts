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
    .setDescription("ReelNote Catalog Service - 영화 메타데이터 관리")
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
