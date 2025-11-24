import { Module } from "@nestjs/common";
import { HttpModule, HttpService } from "@nestjs/axios";
import { TmdbClient } from "./tmdb.client.js";
import { TmdbService } from "./tmdb.service.js";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TmdbConfig } from "../config/tmdb.config.js";
import { MessageService } from "../i18n/message.service.js";

/**
 * TMDB API 모듈
 *
 * TMDB API 클라이언트와 서비스를 제공합니다.
 * Factory 패턴을 사용하여 의존성 주입 순서를 보장합니다.
 *
 * 참고: OpenAPI 스키마 생성 시에도 이 모듈이 정상적으로 로드됩니다.
 * 만약 의존성 주입 문제가 발생한다면, OpenAPI 전용 모듈에서 mock provider를 사용할 수 있습니다.
 */
@Module({
  imports: [
    // ConfigModule을 import하여 ConfigService를 사용 가능하게 함
    ConfigModule,
    // HttpModule.registerAsync를 사용하여 동적으로 HttpModule 등록
    // ConfigService를 직접 inject하여 사용
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const timeout =
          configService.get<number>("TMDB_API_TIMEOUT", { infer: true }) ??
          10000;
        const baseUrl =
          configService.get<string>("TMDB_API_BASE_URL", { infer: true }) ??
          "https://api.themoviedb.org/3";
        return {
          timeout,
          maxRedirects: 5,
          baseURL: baseUrl,
        };
      },
    }),
  ],
  providers: [
    // TmdbConfig를 factory로 등록하여 ConfigService 의존성 주입 보장
    // ConfigModule이 isGlobal이므로 ConfigService는 자동으로 주입 가능
    {
      provide: TmdbConfig,
      useFactory: (configService: ConfigService) => {
        return new TmdbConfig(configService);
      },
      inject: [ConfigService],
    },
    // TmdbClient를 factory로 등록하여 HttpService와 TmdbConfig가 준비된 후에 생성되도록 보장
    {
      provide: TmdbClient,
      useFactory: (
        httpService: HttpService,
        tmdbConfig: TmdbConfig,
        messageService: MessageService,
      ) => {
        return new TmdbClient(httpService, tmdbConfig, messageService);
      },
      inject: [HttpService, TmdbConfig, MessageService],
    },
    TmdbService,
  ],
  exports: [TmdbService],
})
export class TmdbModule {}
