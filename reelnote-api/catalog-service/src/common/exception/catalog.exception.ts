import { HttpStatus } from "@nestjs/common";
import { ErrorCodes } from "../dto/error.dto.js";

/**
 * Catalog Service 비즈니스 예외 베이스 클래스
 * Review Service의 ReviewException과 대응되는 구조
 */
export abstract class CatalogException extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: HttpStatus;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    if (cause) {
      this.cause = cause;
    }
    // 스택 트레이스 보존
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 영화를 찾을 수 없을 때 발생하는 예외
 */
export class MovieNotFoundException extends CatalogException {
  readonly code = ErrorCodes.NOT_FOUND;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(tmdbId: number) {
    super(`영화 정보를 찾을 수 없습니다. TMDB ID: ${tmdbId}`);
  }
}

/**
 * TMDB API 호출 실패 시 발생하는 예외
 */
export class TmdbApiException extends CatalogException {
  readonly code = ErrorCodes.EXTERNAL_API_ERROR;
  readonly httpStatus = HttpStatus.BAD_GATEWAY;

  constructor(message: string, cause?: Error) {
    super(`TMDB API 호출에 실패했습니다: ${message}`, cause);
  }
}

/**
 * Circuit Breaker가 열려서 요청이 거부된 경우
 */
export class ServiceUnavailableException extends CatalogException {
  readonly code = ErrorCodes.SERVICE_UNAVAILABLE;
  readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

  constructor(serviceName: string) {
    super(
      `${serviceName} 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.`,
    );
  }
}

/**
 * 비즈니스 로직 위반 예외 (도메인 규칙 위반)
 */
export class DomainViolationException extends CatalogException {
  readonly code = ErrorCodes.VALIDATION_ERROR;
  readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(message: string) {
    super(message);
  }
}

/**
 * 작업(Job)을 찾을 수 없을 때 발생하는 예외
 */
export class JobNotFoundException extends CatalogException {
  readonly code = ErrorCodes.NOT_FOUND;
  readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(jobId: string) {
    super(`작업을 찾을 수 없습니다. Job ID: ${jobId}`);
  }
}

/**
 * 작업이 이미 진행 중일 때 발생하는 예외
 */
export class JobInProgressException extends CatalogException {
  readonly code = ErrorCodes.CONFLICT;
  readonly httpStatus = HttpStatus.CONFLICT;

  constructor(jobId: string) {
    super(`작업이 이미 진행 중입니다. Job ID: ${jobId}`);
  }
}
