import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 글로벌 접두사
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // API 버전 관리
  const defaultVersion = '1';
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion,
  });

  // CORS 설정
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

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
    .setTitle('Catalog Service API')
    .setDescription('ReelNote Catalog Service - 영화 메타데이터 관리')
    .setVersion('1.0')
    .addTag('movies', '영화 관리')
    .addTag('sync', '동기화')
    .addTag('search', '검색')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(`🚀 Catalog Service is running on: http://localhost:${port}/${globalPrefix}/v${defaultVersion}`);
  Logger.log(`📚 Swagger Docs: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
