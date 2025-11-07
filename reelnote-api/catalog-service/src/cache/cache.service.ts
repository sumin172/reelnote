import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache GET 오류: ${key}`, error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const ttlMs = typeof ttl === 'number' && Number.isFinite(ttl) ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl ?? 'default'} seconds)`);
    } catch (error) {
      this.logger.error(`Cache SET 오류: ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL 오류: ${key}`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.log('Cache RESET 완료');
    } catch (error) {
      this.logger.error('Cache RESET 오류', error);
    }
  }
}

