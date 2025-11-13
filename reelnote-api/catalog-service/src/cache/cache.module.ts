import { Module, Global, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { CacheService } from "./cache.service.js";
import { IoredisStore } from "./ioredis-store.js";

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("CacheModule");
        const redisUrl = configService.get<string>("REDIS_URL");

        // Redis가 설정되어 있으면 사용 시도, 아니면 인메모리 캐시
        const ttlSeconds = Number(
          configService.get<string>("CACHE_TTL_SECONDS") ?? "3600",
        );
        const ttl =
          Number.isFinite(ttlSeconds) && ttlSeconds > 0
            ? Math.floor(ttlSeconds) * 1000
            : undefined;

        if (redisUrl) {
          try {
            const namespace =
              configService.get("CACHE_NAMESPACE") || "catalog-cache";
            const store = new IoredisStore(redisUrl, namespace);

            // Redis 연결 확인 (ioredis는 생성 시 자동 연결, ping으로 확인)
            await store.ping();

            logger.log(
              `Redis 캐시 연결: ${redisUrl} (namespace: ${namespace})`,
            );
            return {
              store,
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
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
