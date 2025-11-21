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
   * 검증 에러 (범용)
   */
  validationError(message?: string): CatalogException {
    return new CatalogException(
      CatalogErrorCode.VALIDATION_ERROR,
      message ?? this.messageService.get(CatalogErrorCode.VALIDATION_ERROR),
      HttpStatus.BAD_REQUEST,
    );
  }
}
