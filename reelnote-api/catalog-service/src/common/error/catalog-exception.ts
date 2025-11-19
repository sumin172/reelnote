import { HttpException, HttpStatus } from "@nestjs/common";
import { CatalogErrorCode } from "./catalog-error-code.js";

/**
 * Catalog Service 예외 클래스
 *
 * HttpException을 상속하여 { code, message } 형태로 응답합니다.
 * HttpExceptionFilter에서 자동으로 처리됩니다.
 */
export class CatalogException extends HttpException {
  constructor(
    public readonly code: CatalogErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    // HttpException에 { code, message } 객체 전달
    super({ code, message }, status);
    this.name = this.constructor.name;
  }
}
