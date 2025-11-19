import { Injectable, HttpStatus } from "@nestjs/common";
import { CatalogErrorCode } from "./catalog-error-code.js";
import { CatalogException } from "./catalog-exception.js";
import { MessageService } from "../../i18n/message.service.js";

/**
 * 예외 생성 팩토리 서비스
 *
 * 에러 코드, 메시지, HTTP 상태를 중앙에서 관리합니다.
 * 나중에 로깅/메트릭을 공통으로 추가할 때 여기만 수정하면 됩니다.
 */
@Injectable()
export class ExceptionFactoryService {
  constructor(private readonly messageService: MessageService) {}

  /**
   * 영화를 찾을 수 없음
   */
  movieNotFound(tmdbId: number): CatalogException {
    return new CatalogException(
      CatalogErrorCode.MOVIE_NOT_FOUND,
      this.messageService.get(CatalogErrorCode.MOVIE_NOT_FOUND, { tmdbId }),
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * TMDB API 호출 실패
   */
  tmdbApiFailed(message: string): CatalogException {
    return new CatalogException(
      CatalogErrorCode.TMDB_API_FAILED,
      this.messageService.get(CatalogErrorCode.TMDB_API_FAILED, { message }),
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * 서비스 사용 불가 (Circuit Breaker 등)
   */
  serviceUnavailable(serviceName: string): CatalogException {
    return new CatalogException(
      CatalogErrorCode.SERVICE_UNAVAILABLE,
      this.messageService.get(CatalogErrorCode.SERVICE_UNAVAILABLE, {
        serviceName,
      }),
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * 작업(Job)을 찾을 수 없음
   */
  jobNotFound(jobId: string): CatalogException {
    return new CatalogException(
      CatalogErrorCode.JOB_NOT_FOUND,
      this.messageService.get(CatalogErrorCode.JOB_NOT_FOUND, { jobId }),
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * 작업이 이미 진행 중
   */
  jobInProgress(jobId: string): CatalogException {
    return new CatalogException(
      CatalogErrorCode.JOB_IN_PROGRESS,
      this.messageService.get(CatalogErrorCode.JOB_IN_PROGRESS, { jobId }),
      HttpStatus.CONFLICT,
    );
  }

  /**
   * 검색어 필수
   */
  validationSearchQueryRequired(): CatalogException {
    return new CatalogException(
      CatalogErrorCode.VALIDATION_SEARCH_QUERY_REQUIRED,
      this.messageService.get(
        CatalogErrorCode.VALIDATION_SEARCH_QUERY_REQUIRED,
      ),
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * TMDB ID 유효하지 않음
   */
  validationTmdbIdInvalid(): CatalogException {
    return new CatalogException(
      CatalogErrorCode.VALIDATION_TMDB_ID_INVALID,
      this.messageService.get(CatalogErrorCode.VALIDATION_TMDB_ID_INVALID),
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * 도메인 규칙 위반 (범용)
   */
  domainViolation(message: string): CatalogException {
    return new CatalogException(
      CatalogErrorCode.VALIDATION_ERROR,
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  /**
   * 내부 서버 오류
   */
  internalError(): CatalogException {
    return new CatalogException(
      CatalogErrorCode.INTERNAL_ERROR,
      this.messageService.get(CatalogErrorCode.INTERNAL_ERROR),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 알 수 없는 오류
   */
  unknownError(): CatalogException {
    return new CatalogException(
      CatalogErrorCode.UNKNOWN_ERROR,
      this.messageService.get(CatalogErrorCode.UNKNOWN_ERROR),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
