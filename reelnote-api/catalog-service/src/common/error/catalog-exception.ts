import { HttpStatus } from "@nestjs/common";
import { CatalogErrorCode } from "./catalog-error-code.js";
import { BaseAppException } from "./base-app-exception.js";

/**
 * Catalog Service 예외 클래스
 *
 * BaseAppException을 상속하여 프레임워크 독립성을 유지합니다.
 * HttpExceptionFilter에서 자동으로 HTTP 응답으로 변환됩니다.
 *
 * @see ERROR_HANDLING_GUIDE.md
 */
export class CatalogException extends BaseAppException {
  constructor(
    public readonly code: CatalogErrorCode,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    super(code, message, status, details);
  }
}
