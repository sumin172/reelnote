package app.reelnote.review.shared.exception

import app.reelnote.review.shared.response.ErrorCodes
import app.reelnote.review.shared.response.ErrorDetail
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.validation.ConstraintViolationException
import java.util.Locale
import java.util.UUID
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.context.MessageSource
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

/** 글로벌 예외 처리기 표준 에러 스키마를 사용하여 일관된 에러 응답을 제공합니다. */
@RestControllerAdvice
class GlobalExceptionHandler(
        private val messageSource: MessageSource,
) {
    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)
    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    /** 메시지 조회 헬퍼 메서드 */
    private fun getMessage(
            key: String,
            vararg args: Any,
    ): String =
            runCatching { messageSource.getMessage(key, args, Locale.getDefault()) }
                    .getOrDefault(key)

    /** TraceId 생성 또는 조회 요청 헤더에 X-Trace-Id가 있으면 사용하고, 없으면 새로 생성합니다. */
    private fun getOrCreateTraceId(request: WebRequest): String {
        val traceIdHeader = request.getHeader("X-Trace-Id")
        if (!traceIdHeader.isNullOrBlank()) {
            return traceIdHeader
        }
        // MDC에서 traceId 확인 (필터에서 설정했을 수 있음)
        val mdcTraceId = MDC.get("traceId")
        if (!mdcTraceId.isNullOrBlank()) {
            return mdcTraceId
        }
        // 새로 생성
        return UUID.randomUUID().toString()
    }

    /** BaseAppException 처리 (프레임워크 독립 예외) ReviewException을 포함한 모든 BaseAppException을 처리합니다. */
    @ExceptionHandler(BaseAppException::class)
    fun handleBaseAppException(
            ex: BaseAppException,
            request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)

        // 구조화된 에러 로깅
        val errorType = if (ex.httpStatus.is5xxServerError) "SYSTEM" else "BUSINESS"
        val metadata = requestMetadata(request)
        val logContext =
                buildMap<String, Any?> {
                    put("errorCode", ex.errorCode)
                    put("errorType", errorType)
                    put("message", ex.message ?: getMessage("error.unknown"))
                    put("traceId", traceId)
                    put("metadata", metadata)
                    if (ex.httpStatus.is5xxServerError) {
                        put("stack", ex.stackTraceToString())
                    }
                }

        if (ex.httpStatus.is5xxServerError) {
            logger.error(
                    objectMapper.writeValueAsString(logContext),
                    ex,
            )
        } else {
            logger.warn(objectMapper.writeValueAsString(logContext))
        }

        val error =
                ErrorDetail(
                        code = ex.errorCode,
                        message = ex.message ?: getMessage("error.unknown"),
                        details = metadata,
                        traceId = traceId,
                )

        return ResponseEntity.status(ex.httpStatus).body(error)
    }

    /** 검증 예외 처리 */
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(
            ex: MethodArgumentNotValidException,
            request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)

        val fieldErrors =
                ex.bindingResult.fieldErrors.associate { error ->
                    error.field to (error.defaultMessage ?: "유효하지 않은 값입니다")
                }

        val metadata = requestMetadata(request, mapOf("fieldErrors" to fieldErrors))
        val logContext =
                buildMap<String, Any?> {
                    put("errorCode", ErrorCodes.VALIDATION_ERROR)
                    put("errorType", "BUSINESS")
                    put("message", ex.message)
                    put("traceId", traceId)
                    put("metadata", metadata)
                }

        logger.warn(objectMapper.writeValueAsString(logContext))

        val error =
                ErrorDetail(
                        code = ErrorCodes.VALIDATION_ERROR,
                        message = getMessage("error.validation.failed"),
                        details = metadata,
                        traceId = traceId,
                )

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error)
    }

    /** @Validated 검증 예외 처리 (ConstraintViolationException) */
    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolationException(
            ex: ConstraintViolationException,
            request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)

        val violations =
                ex.constraintViolations.associate { violation ->
                    violation.propertyPath.toString() to violation.message
                }

        val metadata = requestMetadata(request, mapOf("violations" to violations))
        val logContext = buildMap {
            put("errorCode", ErrorCodes.VALIDATION_ERROR)
            put("errorType", "BUSINESS")
            put("message", ex.message)
            put("traceId", traceId)
            put("metadata", metadata)
        }

        logger.warn(objectMapper.writeValueAsString(logContext))

        val error =
                ErrorDetail(
                        code = ErrorCodes.VALIDATION_ERROR,
                        message = getMessage("error.parameter.validation.failed"),
                        details = metadata,
                        traceId = traceId,
                )

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error)
    }

    /**
     * 도메인 무결성/상태 위반 예외 처리
     * - require 등에서 발생하는 IllegalArgumentException/IllegalStateException을 422로 매핑
     */
    @ExceptionHandler(IllegalArgumentException::class, IllegalStateException::class)
    fun handleDomainViolation(
            ex: RuntimeException,
            request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)

        val metadata = requestMetadata(request)
        val logContext =
                buildMap<String, Any?> {
                    put("errorCode", ErrorCodes.VALIDATION_ERROR)
                    put("errorType", "BUSINESS")
                    put("message", ex.message ?: getMessage("error.validation.failed"))
                    put("traceId", traceId)
                    put("metadata", metadata)
                }

        logger.warn(objectMapper.writeValueAsString(logContext))

        val error =
                ErrorDetail(
                        code = ErrorCodes.VALIDATION_ERROR,
                        message = ex.message ?: getMessage("error.validation.failed"),
                        details = metadata,
                        traceId = traceId,
                )

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(error)
    }

    /** 타입 변환 예외 처리 */
    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleTypeMismatchException(
            ex: MethodArgumentTypeMismatchException,
            request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)

        val additionalDetails =
                mapOf(
                        "field" to ex.name,
                        "requiredType" to (ex.requiredType?.simpleName ?: "Unknown"),
                        "actualValue" to (ex.value?.toString() ?: "null"),
                )

        val metadata = requestMetadata(request, additionalDetails)
        val logContext =
                buildMap<String, Any?> {
                    put("errorCode", ErrorCodes.VALIDATION_ERROR)
                    put("errorType", "BUSINESS")
                    put("message", ex.message)
                    put("traceId", traceId)
                    put("metadata", metadata)
                }

        logger.warn(objectMapper.writeValueAsString(logContext))

        val error =
                ErrorDetail(
                        code = ErrorCodes.VALIDATION_ERROR,
                        message = getMessage("error.invalid.parameter.type", ex.name),
                        details = metadata,
                        traceId = traceId,
                )

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error)
    }

    /** 일반적인 예외 처리 (예측하지 못한 예외 - 마지막 방패) */
    @ExceptionHandler(Exception::class)
    fun handleGenericException(
            ex: Exception,
            request: WebRequest,
    ): ResponseEntity<ErrorDetail> {
        val traceId = getOrCreateTraceId(request)

        val metadata = requestMetadata(request)
        val logContext =
                buildMap<String, Any?> {
                    put("errorCode", ErrorCodes.UNKNOWN_ERROR)
                    put("errorType", "SYSTEM")
                    put("message", ex.message ?: "알 수 없는 오류")
                    put("traceId", traceId)
                    put("metadata", metadata)
                    put("stack", ex.stackTraceToString())
                }

        logger.error(
                objectMapper.writeValueAsString(logContext),
                ex,
        )

        val error =
                ErrorDetail(
                        code = ErrorCodes.UNKNOWN_ERROR,
                        message = getMessage("error.unknown.error"),
                        details = metadata,
                        traceId = traceId,
                )

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error)
    }

    /** 요청 메타데이터 수집 */
    private fun requestMetadata(
            request: WebRequest,
            extra: Map<String, Any?> = emptyMap(),
    ): Map<String, Any> = buildMap {
        put("path", request.getDescription(false).removePrefix("uri="))
        extra.forEach { (key, value) ->
            if (value != null) {
                put(key, value)
            }
        }
    }
}
