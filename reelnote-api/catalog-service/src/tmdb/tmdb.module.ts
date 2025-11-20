import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TmdbClient } from "./tmdb.client.js";
import { TmdbService } from "./tmdb.service.js";
import { ConfigModule } from "@nestjs/config";
import { TmdbConfig } from "../config/tmdb.config.js";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [TmdbConfig],
      useFactory: (tmdbConfig: TmdbConfig) => ({
        timeout: tmdbConfig.timeout,
        maxRedirects: 5,
        baseURL: tmdbConfig.baseUrl,
      }),
      extraProviders: [TmdbConfig],
    }),
    ConfigModule,
  ],
  providers: [TmdbConfig, TmdbClient, TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
