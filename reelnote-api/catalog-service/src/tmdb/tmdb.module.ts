import { Module } from "@nestjs/common";
import { HttpModule, HttpService } from "@nestjs/axios";
import { TmdbClient } from "./tmdb.client.js";
import { TmdbService } from "./tmdb.service.js";
import { TmdbConfig } from "../config/tmdb.config.js";
import { TmdbConfigModule } from "../config/tmdb-config.module.js";
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
    TmdbConfigModule,
    // HttpModule.registerAsync를 사용하여 동적으로 HttpModule 등록
    HttpModule.registerAsync({
      imports: [TmdbConfigModule],
      inject: [TmdbConfig],
      useFactory: (tmdbConfig: TmdbConfig) => {
        return {
          timeout: tmdbConfig.timeout,
          maxRedirects: 5,
          baseURL: tmdbConfig.baseUrl,
        };
      },
    }),
  ],
  providers: [
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
