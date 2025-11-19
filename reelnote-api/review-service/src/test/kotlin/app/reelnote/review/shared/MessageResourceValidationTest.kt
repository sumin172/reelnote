package app.reelnote.review.shared

import app.reelnote.review.shared.response.ErrorCodes
import java.util.Locale
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.MessageSource
import org.springframework.test.context.ActiveProfiles

/**
 * 메시지 리소스 검증 테스트
 *
 * 에러 코드와 메시지 리소스 간의 드리프트를 방지하기 위한 테스트입니다.
 *
 * @see ERROR_SPECIFICATION.md 섹션 2.3
 */
@SpringBootTest
@ActiveProfiles("test")
class MessageResourceValidationTest(
        @Autowired private val messageSource: MessageSource,
) {
    /**
     * ErrorCodes에 정의된 에러 코드에 대응하는 메시지 키 매핑
     *
     * 이 매핑은 ERROR_SPECIFICATION.md의 매핑 테이블과 일치해야 합니다.
     */
    private val errorCodeToMessageKey: Map<String, String> =
            mapOf(
                    // 범용 에러 코드
                    ErrorCodes.VALIDATION_ERROR to "error.validation.failed",
                    ErrorCodes.NOT_FOUND to "error.unknown", // 범용 NOT_FOUND는 특정 메시지 키 없음
                    ErrorCodes.INTERNAL_ERROR to "error.internal.server",
                    ErrorCodes.EXTERNAL_API_ERROR to "error.external.api.failed",
                    ErrorCodes.CONFLICT to "error.unknown", // 범용 CONFLICT는 특정 메시지 키 없음
                    ErrorCodes.UNAUTHORIZED to "error.unknown", // 범용 UNAUTHORIZED는 특정 메시지 키 없음
                    ErrorCodes.FORBIDDEN to "error.unknown", // 범용 FORBIDDEN는 특정 메시지 키 없음
                    ErrorCodes.SERVICE_UNAVAILABLE to
                            "error.unknown", // 범용 SERVICE_UNAVAILABLE는 특정 메시지 키 없음
                    // Review 도메인 에러 코드
                    ErrorCodes.REVIEW_NOT_FOUND to "error.review.not.found",
                    ErrorCodes.REVIEW_ALREADY_EXISTS to "error.review.already.exists",
                    ErrorCodes.REVIEW_UNAUTHORIZED_UPDATE to "error.review.unauthorized.update",
                    ErrorCodes.REVIEW_UNAUTHORIZED_DELETE to "error.review.unauthorized.delete",
            )

    /**
     * 모든 에러 코드에 대응하는 메시지가 존재해야 함
     *
     * 이 테스트는 에러 코드 추가 시 메시지 리소스도 함께 추가되었는지 검증합니다.
     */
    @Test
    fun `모든 에러 코드에 대응하는 메시지가 존재해야 함`() {
        errorCodeToMessageKey.forEach { (code, key) ->
            assertDoesNotThrow {
                val message =
                        messageSource.getMessage(
                                key,
                                null,
                                Locale.getDefault(),
                        )
                // 메시지가 실제로 존재하는지 확인 (키 자체가 반환되지 않아야 함)
                assert(message != key) {
                    "Message key '$key' for error code '$code' should return actual message, not the key itself"
                }
            }
        }
    }

    /**
     * 메시지 키가 유효한지 검증 (NoSuchMessageException 방지)
     *
     * 이 테스트는 메시지 키 오타나 삭제를 감지합니다.
     */
    @Test
    fun `메시지 키가 유효해야 함`() {
        val testKeys =
                listOf(
                        "error.validation.failed",
                        "error.review.not.found",
                        "error.review.already.exists",
                        "error.review.unauthorized.update",
                        "error.review.unauthorized.delete",
                        "error.internal.server",
                        "error.external.api.failed",
                        "validation.search.keyword.required",
                )

        testKeys.forEach { key ->
            assertDoesNotThrow { messageSource.getMessage(key, null, Locale.getDefault()) }
        }
    }

    /** 파라미터가 포함된 메시지가 올바르게 처리되는지 검증 */
    @Test
    fun `파라미터가 포함된 메시지가 올바르게 처리되어야 함`() {
        val testCases =
                listOf(
                        Triple("error.review.not.found", arrayOf(123L), "리뷰를 찾을 수 없습니다"),
                        Triple("error.movie.not.found", arrayOf(456L), "영화 정보를 찾을 수 없습니다"),
                        Triple(
                                "error.external.api.failed",
                                arrayOf("CatalogService"),
                                "외부 API 호출에 실패했습니다",
                        ),
                )

        testCases.forEach { (key, args, expectedSubstring) ->
            val message = messageSource.getMessage(key, args, Locale.getDefault())
            assert(message.contains(expectedSubstring)) {
                "Message for key '$key' should contain '$expectedSubstring', but got: $message"
            }
        }
    }
}
