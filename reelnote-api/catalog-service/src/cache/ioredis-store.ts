import { Redis } from "ioredis";
import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";

/**
 * cache-manager용 ioredis store 구현
 * cache-manager v7에서는 Store 타입이 제거되었으므로 직접 인터페이스를 구현합니다.
 */
@Injectable()
export class IoredisStore implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private readonly logger = new Logger(IoredisStore.name);

  constructor(redisUrl: string, keyPrefix = "") {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false, // 자동 연결
    });
    this.keyPrefix = keyPrefix;
  }

  private getKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(this.getKey(key));
      if (value === null) {
        return undefined;
      }
      return JSON.parse(value) as T;
    } catch {
      // JSON 파싱 실패 시 원본 문자열 반환 시도
      const value = await this.client.get(this.getKey(key));
      return (value ?? undefined) as T | undefined;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value ?? null);
    const prefixedKey = this.getKey(key);

    if (ttl && ttl > 0) {
      // TTL이 밀리초 단위로 전달되므로 초 단위로 변환
      const ttlSeconds = Math.ceil(ttl / 1000);
      await this.client.setex(prefixedKey, ttlSeconds, serialized);
    } else {
      await this.client.set(prefixedKey, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(this.getKey(key));
  }

  async reset(): Promise<void> {
    if (this.keyPrefix) {
      // 네임스페이스가 있으면 해당 네임스페이스의 키만 삭제
      const keys = await this.keys(`${this.keyPrefix}:*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } else {
      // 네임스페이스가 없으면 전체 flush (주의!)
      await this.client.flushdb();
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    const searchPattern = pattern
      ? this.getKey(pattern.replace("*", ""))
      : this.keyPrefix
        ? `${this.keyPrefix}:*`
        : "*";
    return this.client.keys(searchPattern);
  }

  /**
   * Redis 연결 확인 (ping)
   */
  async ping(): Promise<string> {
    return this.client.ping();
  }

  /**
   * Redis 연결 종료
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  /**
   * NestJS 모듈 종료 시 Redis 연결 정리
   * PrismaService와 동일한 패턴으로 구현
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.log("Redis 연결이 정상적으로 종료되었습니다");
    } catch (error) {
      this.logger.warn("Redis 연결 종료 중 오류 발생", error);
    }
  }
}
