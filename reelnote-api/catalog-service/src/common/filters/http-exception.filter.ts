import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ErrorDetailDto } from "../dto/error.dto.js";
import { BaseAppException } from "../error/base-app-exception.js";
import { CatalogErrorCode } from "../error/catalog-error-code.js";
import { MessageService } from "../../i18n/message.service.js";

/**
 * 글로벌 HTTP 예외 필터
 * 표준 에러 스키마를 사용하여 일관된 에러 응답을 제공합니다.
 *
 * 처리 순서:
 * 1. BaseAppException (프레임워크 독립 예외) - 우선 처리
 * 2. HttpException (NestJS 프레임워크 예외)
 * 3. 기타 예외
 *
 * @see ERROR_HANDLING_GUIDE.md
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly messageService: MessageService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = this.getOrCreateTraceId(request);

    // BaseAppException (프레임워크 독립 예외) 우선 처리
    if (exception instanceof BaseAppException) {
      const errorDetail: ErrorDetailDto = {
        code: exception.errorCode,
        message: exception.message,
        details: {
          path: request.url,
          ...exception.details,
        },
        traceId,
      };

      // 로그 기록
      if (exception.httpStatus >= 500) {
        this.logger.error(
          `예상치 못한 예외 발생: ${errorDetail.message}, traceId=${traceId}`,
          exception.stack,
        );
      } else {
        this.logger.warn(
          `예외 발생: ${errorDetail.message}, traceId=${traceId}`,
        );
      }

      response.status(exception.httpStatus).json(errorDetail);
      return;
    }

    // HttpException 처리 (NestJS 프레임워크 예외)
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
    }

    const errorDetail = this.buildErrorDetail(
      exception,
      request,
      traceId,
      status,
    );

    // 로그 기록
    if (status >= 500) {
      this.logger.error(
        `예상치 못한 예외 발생: ${errorDetail.message}, traceId=${traceId}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`예외 발생: ${errorDetail.message}, traceId=${traceId}`);
    }

    response.status(status).json(errorDetail);
  }

  /**
   * TraceId 생성 또는 조회
   */
  private getOrCreateTraceId(request: Request): string {
    // 요청 헤더에서 traceId 확인
    const traceIdHeader = request.headers["x-trace-id"] as string | undefined;
    if (traceIdHeader) {
      return traceIdHeader;
    }

    // 새로 생성 (UUID v4 형식)
    return this.generateTraceId();
  }

  /**
   * UUID v4 형식의 traceId 생성
   * Node.js 표준 crypto.randomUUID() 사용 (암호학적 랜덤 보장)
   */
  private generateTraceId(): string {
    return randomUUID();
  }

  /**
   * ErrorDetail 객체 생성
   */
  private buildErrorDetail(
    exception: unknown,
    request: Request,
    traceId: string,
    status: number,
  ): ErrorDetailDto {
    // HttpException인 경우
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // HttpException에 객체를 직접 전달한 경우 (권장하지 않지만 호환성 유지)
      // 예: throw new HttpException(result.job, HttpStatus.ACCEPTED)
      if (
        typeof exceptionResponse === "object" &&
        !("message" in exceptionResponse)
      ) {
        // 객체를 그대로 반환하지 않고, ErrorDetailDto로 래핑
        // 하지만 이런 패턴은 사용하지 않는 것이 좋음
        const code = this.getErrorCodeFromStatus(status);
        return {
          code,
          message: this.messageService.get(code),
          details: {
            path: request.url,
            data: exceptionResponse,
          },
          traceId,
        };
      }

      const message =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] })?.message ||
            exception.message ||
            this.messageService.get(CatalogErrorCode.UNKNOWN_ERROR);

      // 메시지가 배열인 경우 첫 번째 메시지 사용
      const errorMessage = Array.isArray(message) ? message[0] : message;

      // ValidationPipe 에러인 경우
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === "object" &&
        "message" in exceptionResponse
      ) {
        const validationErrors = (exceptionResponse as { message?: string[] })
          .message;
        return {
          code: CatalogErrorCode.VALIDATION_ERROR,
          message: errorMessage,
          details: {
            path: request.url,
            fieldErrors: this.extractFieldErrors(validationErrors),
          },
          traceId,
        };
      }

      // 기타 HttpException
      return {
        code: this.getErrorCodeFromStatus(status),
        message: errorMessage,
        details: {
          path: request.url,
        },
        traceId,
      };
    }

    // 알 수 없는 예외
    const code = CatalogErrorCode.INTERNAL_ERROR;
    return {
      code,
      message: this.messageService.get(code),
      details: {
        path: request.url,
      },
      traceId,
    };
  }

  /**
   * ValidationPipe 에러에서 필드별 에러 추출
   */
  private extractFieldErrors(
    messages?: string[],
  ): Record<string, string> | undefined {
    if (!messages || messages.length === 0) {
      return undefined;
    }

    const fieldErrors: Record<string, string> = {};
    messages.forEach((msg) => {
      // NestJS ValidationPipe 메시지 형식: "property should not be empty"
      // 필드명 추출 시도
      const match = msg.match(/^(\w+)\s/);
      if (match) {
        fieldErrors[match[1]] = msg;
      } else {
        fieldErrors["_general"] = msg;
      }
    });

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
  }

  /**
   * HTTP 상태 코드에서 에러 코드 매핑
   */
  private getErrorCodeFromStatus(status: number): CatalogErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return CatalogErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return CatalogErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return CatalogErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return CatalogErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return CatalogErrorCode.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return CatalogErrorCode.VALIDATION_ERROR;
      case HttpStatus.BAD_GATEWAY:
        return CatalogErrorCode.EXTERNAL_API_ERROR;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return CatalogErrorCode.SERVICE_UNAVAILABLE;
      default:
        return CatalogErrorCode.INTERNAL_ERROR;
    }
  }
}
