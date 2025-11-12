package app.reelnote.review.shared.exception

import app.reelnote.review.shared.response.ApiResponse
import app.reelnote.review.shared.response.ErrorCodes
import app.reelnote.review.shared.response.ErrorDetail
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.context.MessageSource
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import java.time.Instant
import java.util.Locale

/**
 * 글로벌 예외 처리기
 */
@RestControllerAdvice
class GlobalExceptionHandler(
    private val messageSource: MessageSource,
) {
    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    /**
     * 메시지 조회 헬퍼 메서드
     */
    private fun getMessage(
        key: String,
        vararg args: Any,
    ): String =
        runCatching { messageSource.getMessage(key, args, Locale.getDefault()) }
            .getOrDefault(key)

    /**
     * 비즈니스 예외 처리
     */
    @ExceptionHandler(ReviewException::class)
    fun handleReviewException(
        ex: ReviewException,
        request: WebRequest,
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("비즈니스 예외 발생: ${ex.message}", ex)

        val error =
            ErrorDetail(
                code = ex.errorCode,
                message = ex.message ?: getMessage("error.unknown"),
                details = requestMetadata(request),
            )

        return ResponseEntity
            .status(ex.httpStatus)
            .body(ApiResponse.error(error))
    }

    /**
     * 검증 예외 처리
     */
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(
        ex: MethodArgumentNotValidException,
        request: WebRequest,
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("검증 예외 발생: ${ex.message}")

        val fieldErrors =
            ex.bindingResult.fieldErrors.associate { error ->
                error.field to (error.defaultMessage ?: "유효하지 않은 값입니다")
            }

        val error =
            ErrorDetail(
                code = ErrorCodes.VALIDATION_ERROR,
                message = getMessage("error.validation.failed"),
                details = requestMetadata(request, mapOf("fieldErrors" to fieldErrors)),
            )

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(error))
    }

    /**
     * @Validated 검증 예외 처리 (ConstraintViolationException)
     */
    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolationException(
        ex: ConstraintViolationException,
        request: WebRequest,
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("매개변수 검증 예외 발생: ${ex.message}")

        val violations =
            ex.constraintViolations.associate { violation ->
                violation.propertyPath.toString() to violation.message
            }

        val error =
            ErrorDetail(
                code = ErrorCodes.VALIDATION_ERROR,
                message = getMessage("error.parameter.validation.failed"),
                details = requestMetadata(request, mapOf("violations" to violations)),
            )

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(error))
    }

    /**
     * 도메인 무결성/상태 위반 예외 처리
     * - require 등에서 발생하는 IllegalArgumentException/IllegalStateException을 422로 매핑
     */
    @ExceptionHandler(IllegalArgumentException::class, IllegalStateException::class)
    fun handleDomainViolation(
        ex: RuntimeException,
        request: WebRequest,
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("도메인 무결성 위반: ${ex.message}")

        val error =
            ErrorDetail(
                code = ErrorCodes.VALIDATION_ERROR,
                message = ex.message ?: getMessage("error.validation.failed"),
                details = requestMetadata(request),
            )

        return ResponseEntity
            .status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ApiResponse.error(error))
    }

    /**
     * 타입 변환 예외 처리
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleTypeMismatchException(
        ex: MethodArgumentTypeMismatchException,
        request: WebRequest,
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("타입 변환 예외 발생: ${ex.message}")

        val additionalDetails =
            mapOf(
                "requiredType" to (ex.requiredType?.simpleName ?: "Unknown"),
                "actualValue" to (ex.value?.toString() ?: "null"),
            )

        val error =
            ErrorDetail(
                code = ErrorCodes.VALIDATION_ERROR,
                message = getMessage("error.invalid.parameter.type", ex.name),
                field = ex.name,
                details = requestMetadata(request, additionalDetails),
            )

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(error))
    }

    /**
     * 일반적인 예외 처리
     */
    @ExceptionHandler(Exception::class)
    fun handleGenericException(
        ex: Exception,
        request: WebRequest,
    ): ResponseEntity<ApiResponse<Nothing>> {
        logger.error("예상치 못한 예외 발생: ${ex.message ?: "알 수 없는 오류"}", ex)

        val error =
            ErrorDetail(
                code = ErrorCodes.INTERNAL_ERROR,
                message = getMessage("error.internal.server"),
                details = requestMetadata(request),
            )

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(error))
    }

    private fun requestMetadata(
        request: WebRequest,
        extra: Map<String, Any?> = emptyMap(),
    ): Map<String, Any> =
        buildMap {
            put("timestamp", Instant.now().toString())
            put("path", request.getDescription(false).removePrefix("uri="))
            extra.forEach { (key, value) ->
                if (value != null) {
                    put(key, value)
                }
            }
        }
}
