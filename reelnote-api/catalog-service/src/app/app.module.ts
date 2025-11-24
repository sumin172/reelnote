import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../database/database.module.js";
import { CacheModule } from "../cache/cache.module.js";
import { TmdbModule } from "../tmdb/tmdb.module.js";
import { MoviesModule } from "../movies/movies.module.js";
import { SyncModule } from "../sync/sync.module.js";
import { SearchModule } from "../search/search.module.js";
import { HealthModule } from "../health/health.module.js";
import { MessageModule } from "../i18n/message.module.js";
import { validate } from "../config/env.validation.js";
import { ApplicationConfig } from "../config/application.config.js";
import { isSchemaGeneration } from "../config/schema-generation.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      // OpenAPI 생성 시에는 환경 변수 검증을 비활성화
      validate: isSchemaGeneration() ? undefined : validate,
    }),
    MessageModule,
    DatabaseModule,
    CacheModule,
    TmdbModule,
    MoviesModule,
    SyncModule,
    SearchModule,
    HealthModule,
  ],
  controllers: [],
  providers: [ApplicationConfig],
})
export class AppModule {}
