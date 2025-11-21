import { Module, Global, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { CacheService } from "./cache.service.js";
import { IoredisStore } from "./ioredis-store.js";
import { CacheConfig } from "../config/cache.config.js";

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService, ModuleRef],
      useFactory: async (
        configService: ConfigService,
        moduleRef: ModuleRef,
      ) => {
        const logger = new Logger("CacheModule");

        // Redis가 설정되어 있으면 사용 시도, 아니면 인메모리 캐시
        const ttlSeconds =
          configService.get<number>("CACHE_TTL_SECONDS", { infer: true }) ??
          3600;
        const ttl = ttlSeconds > 0 ? ttlSeconds * 1000 : undefined;

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
    CacheConfig,
    CacheService,
    {
      provide: IoredisStore,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IoredisStore | null => {
        const redisUrlEnv = configService.get<string>("REDIS_URL", {
          infer: true,
        });
        const redisUrl =
          redisUrlEnv && redisUrlEnv.trim() !== "" ? redisUrlEnv : undefined;

        if (!redisUrl) {
          return null;
        }

        const namespace =
          configService.get<string>("CACHE_NAMESPACE", { infer: true }) ??
          "catalog-cache";
        return new IoredisStore(redisUrl, namespace);
      },
    },
  ],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
