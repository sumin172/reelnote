import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TmdbConfig } from "./tmdb.config.js";

/**
 * TMDB 설정 모듈
 *
 * TmdbConfig를 단일 인스턴스로 제공하여
 * HttpModule.registerAsync와 다른 providers에서 동일한 인스턴스를 사용하도록 보장합니다.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: TmdbConfig,
      useFactory: (configService: ConfigService) => {
        return new TmdbConfig(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [TmdbConfig],
})
export class TmdbConfigModule {}
