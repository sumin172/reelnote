package app.reelnote.review.shared.exception

import org.springframework.http.HttpStatus

/**
 * 프레임워크 독립 베이스 예외 클래스
 *
 * 모든 애플리케이션 예외의 기본 클래스입니다. RuntimeException을 상속하여 프레임워크 독립성을 유지하며, GlobalExceptionHandler에서 HTTP
 * 응답으로 변환됩니다.
 *
 * @see docs/specs/error-handling.md
 */
abstract class BaseAppException(
    message: String,
    val errorCode: String,
    val httpStatus: HttpStatus,
    val details: Map<String, Any>? = null,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
