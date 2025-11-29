import { Module, Global, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { CacheService } from "./cache.service.js";
import { IoredisStore } from "./ioredis-store.js";
import { CacheConfig } from "../config/cache.config.js";
import { CacheConfigModule } from "../config/cache-config.module.js";

@Global()
@Module({
  imports: [
    CacheConfigModule,
    NestCacheModule.registerAsync({
      imports: [CacheConfigModule],
      inject: [CacheConfig, ModuleRef],
      useFactory: async (cacheConfig: CacheConfig, moduleRef: ModuleRef) => {
        const logger = new Logger("CacheModule");

        const ttl = cacheConfig.ttlMs;

        // IoredisStore를 optional로 가져오기 (provider가 null을 반환할 수 있음)
        let redisStore: IoredisStore | null = null;
        try {
          redisStore = moduleRef.get(IoredisStore, { strict: false });
        } catch {
          // provider가 없거나 null인 경우 무시
        }

        if (redisStore) {
          try {
            // Redis 연결 확인 (ioredis는 생성 시 자동 연결, ping으로 확인)
            await redisStore.ping();

            logger.log("Redis 캐시 연결 확인 완료");
            return {
              store: redisStore,
              ttl,
            };
          } catch (error) {
            logger.warn(
              "Redis 연결 실패, 인메모리 캐시 사용으로 전환합니다.",
              error,
            );
          }
        } else {
          logger.log("Redis URL이 설정되지 않았습니다. 인메모리 캐시 사용");
        }

        // 인메모리 캐시 (기본값)
        return {
          ttl,
        };
      },
    }),
  ],
  providers: [
    CacheService,
    {
      provide: IoredisStore,
      inject: [CacheConfig],
      useFactory: (cacheConfig: CacheConfig): IoredisStore | null => {
        const redisUrl = cacheConfig.redisUrl;

        if (!redisUrl) {
          return null;
        }

        return new IoredisStore(redisUrl, cacheConfig.namespace);
      },
    },
  ],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
