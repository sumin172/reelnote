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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate, // 환경 변수 검증 활성화
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
