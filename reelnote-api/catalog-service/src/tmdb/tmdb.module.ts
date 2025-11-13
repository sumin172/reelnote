import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TmdbClient } from "./tmdb.client.js";
import { TmdbService } from "./tmdb.service.js";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: Number(configService.get("TMDB_API_TIMEOUT") ?? 10000),
        maxRedirects: 5,
        baseURL: configService.get(
          "TMDB_API_BASE_URL",
          "https://api.themoviedb.org/3",
        ),
      }),
    }),
    ConfigModule,
  ],
  providers: [TmdbClient, TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
