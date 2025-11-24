// OpenAPI 생성 시 환경 변수 검증 비활성화 (먼저 import)
import "./setup-openapi-env.js";

import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateCatalogOpenApi() {
  // AppModule을 동적으로 import하여 ESM hoisting 문제 방지
  const { AppModule } = await import("../app/app.module.js");

  const app = await NestFactory.create(AppModule, {
    logger: false, // 로그를 줄이기 위해 비활성화
  });
  await app.init();

  const config = new DocumentBuilder()
    .setTitle("Catalog Service API")
    .setDescription("ReelNote Catalog Service - 영화 메타데이터 관리")
    .setVersion("1.0")
    .addTag("movies", "영화 관리")
    .addTag("sync", "동기화")
    .addTag("search", "검색")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(
    __dirname,
    "../../../../packages/api-schema/generated/catalog-service-openapi.json",
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  await app.close();
}

generateCatalogOpenApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
