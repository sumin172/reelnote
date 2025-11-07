import { Injectable, Logger, HttpException, HttpStatus, OnModuleDestroy } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from 'axios-retry';
import CircuitBreaker, { Options as CircuitBreakerOptions } from 'opossum';
import { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method, isAxiosError } from 'axios';

type LimitExecutor = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * TMDB API 클라이언트
 * - 레이트리밋: p-limit 기반 동시성 제어
 * - 리트라이: axios-retry 지수 백오프
 * - 서킷브레이커: opossum 활용
 */
@Injectable()
export class TmdbClient implements OnModuleDestroy {
  private readonly logger = new Logger(TmdbClient.name);
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly axios: AxiosInstance;
  private readonly requestLimiter: Promise<LimitExecutor>;
  private readonly circuitBreaker: CircuitBreaker<AxiosResponse>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('TMDB_API_KEY') || '';
    const timeoutConfig = this.configService.get<string>('TMDB_API_TIMEOUT');
    this.timeout = Number(timeoutConfig ?? 10000);

    if (Number.isNaN(this.timeout) || this.timeout <= 0) {
      this.logger.warn(`TMDB_API_TIMEOUT 설정이 유효하지 않아 기본값 10000ms를 사용합니다. (입력값: ${timeoutConfig})`);
      this.timeout = 10000;
    }

    if (!this.apiKey) {
      this.logger.warn('TMDB_API_KEY가 설정되지 않았습니다.');
    }

    const maxConcurrencyConfig = this.configService.get<string>('TMDB_API_MAX_CONCURRENCY');
    const parsedConcurrency = Number(maxConcurrencyConfig);
    const resolvedConcurrency = Number.isFinite(parsedConcurrency) && parsedConcurrency > 0 ? Math.floor(parsedConcurrency) : 10;
    this.requestLimiter = this.loadLimiter(resolvedConcurrency);

    this.axios = this.httpService.axiosRef;
    const parsedRetries = Number(this.configService.get<string>('TMDB_API_MAX_RETRY'));
    const resolvedRetries = Number.isFinite(parsedRetries) && parsedRetries >= 0 ? Math.floor(parsedRetries) : 3;
    axiosRetry(this.axios, {
      retries: resolvedRetries,
      retryDelay: exponentialDelay,
      retryCondition: error =>
        isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429 ||
        (error.response?.status ?? 0) >= 500,
      onRetry: (retryCount, error, requestConfig) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        this.logger.warn(`TMDB API 재시도 ${retryCount}/${resolvedRetries} - status=${status ?? 'unknown'} url=${requestConfig?.url}`);
      },
    });

    const circuitBreakerOptions: CircuitBreakerOptions = {
      timeout: Number(this.configService.get<string>('TMDB_BREAKER_TIMEOUT')) || this.timeout + 1000,
      resetTimeout: Number(this.configService.get<string>('TMDB_BREAKER_RESET_TIMEOUT')) || 60000,
      errorThresholdPercentage: Number(this.configService.get<string>('TMDB_BREAKER_ERROR_PERCENTAGE')) || 50,
      volumeThreshold: Number(this.configService.get<string>('TMDB_BREAKER_VOLUME_THRESHOLD')) || 10,
    };

    this.circuitBreaker = new CircuitBreaker<AxiosResponse>(config => this.dispatchRequest(config as AxiosRequestConfig), circuitBreakerOptions);
    this.registerCircuitBreakerEvents();

    this.logger.debug(
      `TMDB API 클라이언트 초기화: timeout=${this.timeout}ms, concurrency=${resolvedConcurrency}, retries=${resolvedRetries}, keyLength=${this.apiKey.length}, keyPreview=${this.maskToken(
        this.apiKey,
      )}`,
    );
  }

  private maskToken(token: string): string {
    if (!token) {
      return 'empty';
    }
    if (token.length <= 10) {
      return `${token.slice(0, 2)}***`;
    }
    return `${token.slice(0, 6)}***${token.slice(-4)}`;
  }

  private registerCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => this.logger.warn('TMDB Circuit breaker가 OPEN 상태로 전환되었습니다.'));
    this.circuitBreaker.on('halfOpen', () => this.logger.log('TMDB Circuit breaker가 HALF_OPEN 상태입니다. 상태 확인 중.'));
    this.circuitBreaker.on('close', () => this.logger.log('TMDB Circuit breaker가 CLOSED 상태로 복구되었습니다.'));
    this.circuitBreaker.on('timeout', () => this.logger.warn('TMDB 요청이 회로 차단기 제한 시간 내에 완료되지 않았습니다.'));
    this.circuitBreaker.on('reject', () => this.logger.warn('TMDB Circuit breaker가 OPEN 상태라 요청이 거절되었습니다.'));
  }

  private async dispatchRequest(config: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.axios.request(config);
  }

  private async loadLimiter(concurrency: number): Promise<LimitExecutor> {
    try {
      const module = await import('p-limit');
      const createLimit = (module as { default?: unknown }).default;
      if (typeof createLimit === 'function') {
        return (createLimit as (limit: number) => LimitExecutor)(concurrency);
      }

      this.logger.warn('p-limit 모듈에서 기본 함수를 찾을 수 없어 기본 구현으로 대체합니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`p-limit 모듈을 불러오지 못했습니다. 기본 구현을 사용합니다. 사유: ${message}`);
    }

    return this.createFallbackLimiter(concurrency);
  }

  private createFallbackLimiter(concurrency: number): LimitExecutor {
    const effectiveConcurrency = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 1;
    let activeCount = 0;
    const queue: Array<() => void> = [];

    const next = () => {
      if (queue.length === 0 || activeCount >= effectiveConcurrency) {
        return;
      }
      const run = queue.shift();
      if (run) {
        run();
      }
    };

    return async <T>(fn: () => Promise<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const execute = () => {
          activeCount++;
          Promise.resolve()
            .then(fn)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              activeCount--;
              next();
            });
        };

        if (activeCount < effectiveConcurrency) {
          execute();
        } else {
          queue.push(execute);
        }
      });
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.circuitBreaker.shutdown();
  }

  /**
   * TMDB API 요청
   */
  async request<T>(method: Method, endpoint: string, params?: Record<string, any>): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      method,
      url: endpoint,
      params,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
      timeout: this.timeout,
    };

    this.logger.debug(
      `TMDB API 요청: ${method} ${endpoint} params=${JSON.stringify(params ?? {})} headers=${JSON.stringify({
        Authorization: `Bearer ${this.maskToken(this.apiKey)}`,
        Accept: 'application/json',
      })}`,
    );

    try {
      const limit = await this.requestLimiter;
      const response = await limit(() => this.circuitBreaker.fire(requestConfig));
      return response.data as T;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private transformError(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (isAxiosError(error)) {
      this.logger.error(`TMDB API 요청 실패: ${error.message}`, error.stack);
      this.logger.error(
        `TMDB API 오류 상세: status=${error.response?.status}, statusText=${error.response?.statusText}, code=${error.code}, responseData=${
          error.response?.data ? JSON.stringify(error.response.data) : 'N/A'
        }`,
      );

      if (error.response) {
        return new HttpException(
          `TMDB API 오류: ${error.response.status} ${error.response.statusText}`,
          error.response.status,
        );
      }

      return new HttpException('TMDB API 요청 중 네트워크 오류가 발생했습니다.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    const errorCode = (error as { code?: string }).code;

    if (errorCode === 'EOPENBREAKER') {
      this.logger.warn('TMDB Circuit breaker가 OPEN 상태여서 요청이 거절되었습니다.');
      return new HttpException(
        'TMDB API 서킷브레이커가 OPEN 상태입니다. 잠시 후 다시 시도해주세요.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (errorCode === 'ETIMEDOUT') {
      this.logger.warn('TMDB Circuit breaker가 요청 시간 초과로 실패했습니다.');
      return new HttpException('TMDB API 요청이 시간 제한을 초과했습니다.', HttpStatus.GATEWAY_TIMEOUT);
    }

    this.logger.error('TMDB API 요청 중 처리되지 않은 예외가 발생했습니다.', error instanceof Error ? error.stack : undefined);
    return new HttpException(`TMDB API 요청 중 예상치 못한 오류가 발생했습니다: ${errorMessage}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * 영화 검색
   */
  async searchMovies(query: string, page: number = 1, language: string = 'ko-KR') {
    return this.request('GET', '/search/movie', {
      query,
      page,
      language,
    });
  }

  /**
   * 영화 상세 조회
   */
  async getMovieDetail(tmdbId: number, language: string = 'ko-KR') {
    return this.request('GET', `/movie/${tmdbId}`, {
      language,
    });
  }

  /**
   * 인기 영화 목록
   */
  async getPopularMovies(page: number = 1, language: string = 'ko-KR') {
    return this.request('GET', '/movie/popular', {
      page,
      language,
    });
  }

  /**
   * 트렌딩 영화 목록
   */
  async getTrendingMovies(timeWindow: 'day' | 'week' = 'day', page: number = 1) {
    return this.request('GET', `/trending/movie/${timeWindow}`, {
      page,
    });
  }
}

