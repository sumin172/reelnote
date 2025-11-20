import { HttpStatus } from "@nestjs/common";

/**
 * 프레임워크 독립 베이스 예외 클래스
 *
 * 모든 애플리케이션 예외의 기본 클래스입니다.
 * HttpException을 상속하지 않아 프레임워크 독립성을 유지하며,
 * HttpExceptionFilter에서 HTTP 응답으로 변환됩니다.
 *
 * @see docs/specs/error-handling.md
 */
export abstract class BaseAppException extends Error {
  protected constructor(
    public readonly errorCode: string,
    message: string,
    public readonly httpStatus: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Error 클래스의 스택 트레이스 보존
    Error.captureStackTrace(this, this.constructor);
  }
}
