import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { AppModule } from "../app/app.module.js";

async function generateCatalogOpenApi() {
  const app = await NestFactory.create(AppModule);
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
