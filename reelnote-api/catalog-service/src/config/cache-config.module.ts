import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheConfig } from "./cache.config.js";

/**
 * Cache 설정 모듈
 *
 * CacheConfig를 단일 인스턴스로 제공하여
 * NestCacheModule.registerAsync와 다른 providers에서 동일한 인스턴스를 사용하도록 보장합니다.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CacheConfig,
      useFactory: (configService: ConfigService) => {
        return new CacheConfig(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheConfig],
})
export class CacheConfigModule {}
