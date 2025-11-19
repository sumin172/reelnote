import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
} from "@nestjs/common";
import axiosRetry, {
  exponentialDelay,
  isNetworkOrIdempotentRequestError,
} from "axios-retry";
import {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  Method,
  isAxiosError,
} from "axios";
import CircuitBreaker, { Options as CircuitBreakerOptions } from "opossum";
import type { TmdbMovieListResponse } from "./tmdb.types.js";
import { CatalogErrorCode } from "../common/error/catalog-error-code.js";
import { MessageService } from "../i18n/message.service.js";

// p-limit 7.x의 LimitFunction과 호환되는 타입
// LimitFunction은 callable object이지만, 함수처럼 호출 가능하므로 함수 타입으로 사용
type LimitExecutor = <T>(fn: () => Promise<T>) => Promise<T>;

// Node.js CommonJS 환경에서도 ESM 모듈을 안전하게 동적 로딩하기 위한 헬퍼

const dynamicImport = new Function(
  "specifier",
  "return import(specifier);",
) as <T>(specifier: string) => Promise<T>;
const P_LIMIT_SPECIFIER = "p-limit";

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
    private readonly messageService: MessageService,
  ) {
    this.apiKey = this.configService.get<string>("TMDB_API_KEY") || "";
    const timeoutConfig = this.configService.get<string>("TMDB_API_TIMEOUT");
    this.timeout = Number(timeoutConfig ?? 10000);

    if (Number.isNaN(this.timeout) || this.timeout <= 0) {
      this.logger.warn(
        `TMDB_API_TIMEOUT 설정이 유효하지 않아 기본값 10000ms를 사용합니다. (입력값: ${timeoutConfig})`,
      );
      this.timeout = 10000;
    }

    if (!this.apiKey) {
      this.logger.warn("TMDB_API_KEY가 설정되지 않았습니다.");
    }

    const maxConcurrencyConfig = this.configService.get<string>(
      "TMDB_API_MAX_CONCURRENCY",
    );
    const parsedConcurrency = Number(maxConcurrencyConfig);
    const resolvedConcurrency =
      Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
        ? Math.floor(parsedConcurrency)
        : 10;
    this.requestLimiter = this.loadLimiter(resolvedConcurrency);

    this.axios = this.httpService.axiosRef;
    const parsedRetries = Number(
      this.configService.get<string>("TMDB_API_MAX_RETRY"),
    );
    const resolvedRetries =
      Number.isFinite(parsedRetries) && parsedRetries >= 0
        ? Math.floor(parsedRetries)
        : 3;
    const retryDelayWithJitter = (retryCount: number) => {
      const baseDelay = exponentialDelay(retryCount);
      const jitter = Math.floor(Math.random() * 300);
      return baseDelay + jitter;
    };

    axiosRetry(this.axios, {
      retries: resolvedRetries,
      retryDelay: retryDelayWithJitter,
      retryCondition: (error) => {
        if (isNetworkOrIdempotentRequestError(error)) {
          return true;
        }

        const status = error.response?.status ?? 0;
        return status === 429 || status >= 500;
      },
      onRetry: (retryCount, error, requestConfig) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        this.logger.warn(
          `TMDB API 재시도 ${retryCount}/${resolvedRetries} - status=${status ?? "unknown"} url=${requestConfig?.url}`,
        );
      },
    });

    const circuitBreakerOptions: CircuitBreakerOptions = {
      timeout:
        Number(this.configService.get<string>("TMDB_BREAKER_TIMEOUT")) ||
        this.timeout + 1000,
      resetTimeout:
        Number(this.configService.get<string>("TMDB_BREAKER_RESET_TIMEOUT")) ||
        60000,
      errorThresholdPercentage:
        Number(
          this.configService.get<string>("TMDB_BREAKER_ERROR_PERCENTAGE"),
        ) || 50,
      volumeThreshold:
        Number(
          this.configService.get<string>("TMDB_BREAKER_VOLUME_THRESHOLD"),
        ) || 10,
    };

    this.circuitBreaker = new CircuitBreaker<AxiosResponse>(
      (config) => this.dispatchRequest(config as AxiosRequestConfig),
      circuitBreakerOptions,
    );
    this.registerCircuitBreakerEvents();

    this.logger.debug(
      `TMDB API 클라이언트 초기화: timeout=${this.timeout}ms, concurrency=${resolvedConcurrency}, retries=${resolvedRetries}, keyLength=${this.apiKey.length}, keyPreview=${this.maskToken(
        this.apiKey,
      )}`,
    );
  }

  private maskToken(token: string): string {
    if (!token) {
      return "empty";
    }
    if (token.length <= 10) {
      return `${token.slice(0, 2)}***`;
    }
    return `${token.slice(0, 6)}***${token.slice(-4)}`;
  }

  private registerCircuitBreakerEvents(): void {
    this.circuitBreaker.on("open", () =>
      this.logger.warn("TMDB Circuit breaker가 OPEN 상태로 전환되었습니다."),
    );
    this.circuitBreaker.on("halfOpen", () =>
      this.logger.log(
        "TMDB Circuit breaker가 HALF_OPEN 상태입니다. 상태 확인 중.",
      ),
    );
    this.circuitBreaker.on("close", () =>
      this.logger.log("TMDB Circuit breaker가 CLOSED 상태로 복구되었습니다."),
    );
    this.circuitBreaker.on("timeout", () =>
      this.logger.warn(
        "TMDB 요청이 회로 차단기 제한 시간 내에 완료되지 않았습니다.",
      ),
    );
    this.circuitBreaker.on("reject", () =>
      this.logger.warn(
        "TMDB Circuit breaker가 OPEN 상태라 요청이 거절되었습니다.",
      ),
    );
  }

  private async dispatchRequest(
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    return this.axios.request(config);
  }

  private async loadLimiter(concurrency: number): Promise<LimitExecutor> {
    try {
      // p-limit은 ESM 모듈이므로 동적 import를 사용합니다
      const module =
        await dynamicImport<typeof import("p-limit")>(P_LIMIT_SPECIFIER);
      const candidate =
        (module as { default?: unknown }).default ?? (module as unknown);
      if (typeof candidate === "function") {
        return (candidate as (limit: number) => LimitExecutor)(concurrency);
      }

      this.logger.warn(
        "p-limit 모듈에서 기본 함수를 찾을 수 없어 기본 구현으로 대체합니다.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `p-limit 모듈을 불러오지 못했습니다. 기본 구현을 사용합니다. 사유: ${message}`,
      );
    }

    return this.createFallbackLimiter(concurrency);
  }

  private createFallbackLimiter(concurrency: number): LimitExecutor {
    const effectiveConcurrency =
      Number.isFinite(concurrency) && concurrency > 0
        ? Math.floor(concurrency)
        : 1;
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
  async request<T>(
    method: Method,
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      method,
      url: endpoint,
      params,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      timeout: this.timeout,
    };

    this.logger.debug(
      `TMDB API 요청: ${method} ${endpoint} params=${JSON.stringify(params ?? {})} headers=${JSON.stringify(
        {
          Authorization: `Bearer ${this.maskToken(this.apiKey)}`,
          Accept: "application/json",
        },
      )}`,
    );

    try {
      const limit = await this.requestLimiter;
      const response = await limit(() =>
        this.circuitBreaker.fire(requestConfig),
      );
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
          error.response?.data ? JSON.stringify(error.response.data) : "N/A"
        }`,
      );

      if (error.response) {
        return new HttpException(
          this.messageService.get(CatalogErrorCode.CATALOG_TMDB_API_ERROR, {
            status: error.response.status,
            statusText: error.response.statusText,
          }),
          error.response.status,
        );
      }

      return new HttpException(
        this.messageService.get(CatalogErrorCode.CATALOG_TMDB_NETWORK_ERROR),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : this.messageService.get(CatalogErrorCode.UNKNOWN_ERROR);
    const errorCode = (error as { code?: string }).code;

    if (errorCode === "EOPENBREAKER") {
      this.logger.warn(
        "TMDB Circuit breaker가 OPEN 상태여서 요청이 거절되었습니다.",
      );
      return new HttpException(
        this.messageService.get(
          CatalogErrorCode.CATALOG_TMDB_CIRCUIT_BREAKER_OPEN,
        ),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (errorCode === "ETIMEDOUT") {
      this.logger.warn("TMDB Circuit breaker가 요청 시간 초과로 실패했습니다.");
      return new HttpException(
        this.messageService.get(CatalogErrorCode.CATALOG_TMDB_TIMEOUT),
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    this.logger.error(
      "TMDB API 요청 중 처리되지 않은 예외가 발생했습니다.",
      error instanceof Error ? error.stack : undefined,
    );
    return new HttpException(
      this.messageService.get(CatalogErrorCode.CATALOG_TMDB_UNEXPECTED_ERROR, {
        message: errorMessage,
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 영화 검색
   */
  async searchMovies(query: string, page = 1, language = "ko-KR") {
    return this.request("GET", "/search/movie", {
      query,
      page,
      language,
    });
  }

  /**
   * 영화 상세 조회
   */
  async getMovieDetail(tmdbId: number, language = "ko-KR") {
    return this.request("GET", `/movie/${tmdbId}`, {
      language,
    });
  }

  /**
   * 인기 영화 목록
   */
  async getPopularMovies<T = TmdbMovieListResponse>(
    page = 1,
    language = "ko-KR",
  ): Promise<T> {
    return this.request<T>("GET", "/movie/popular", {
      page,
      language,
    });
  }

  /**
   * 트렌딩 영화 목록
   */
  async getTrendingMovies<T = TmdbMovieListResponse>(
    timeWindow: "day" | "week" = "day",
    page = 1,
  ): Promise<T> {
    return this.request<T>("GET", `/trending/movie/${timeWindow}`, {
      page,
    });
  }
}
