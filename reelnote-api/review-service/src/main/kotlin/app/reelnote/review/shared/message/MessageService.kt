package app.reelnote.review.shared.message

import org.springframework.context.MessageSource
import org.springframework.stereotype.Service
import java.util.*

/**
 * 메시지 관리 서비스
 * 다국어 지원을 위한 메시지 처리를 담당합니다.
 */
@Service
class MessageService(
    private val messageSource: MessageSource
) {
    
    /**
     * 메시지 키로 메시지를 조회합니다.
     * 
     * @param key 메시지 키
     * @param args 메시지에 삽입할 인수들
     * @param locale 로케일 (기본값: 한국어)
     * @return 포맷된 메시지
     */
    fun getMessage(
        key: String, 
        args: Array<Any> = emptyArray(), 
        locale: Locale = Locale.KOREAN
    ): String {
        return try {
            messageSource.getMessage(key, args, locale)
        } catch (_: Exception) {
            // 메시지를 찾을 수 없는 경우 키를 그대로 반환
            key
        }
    }
    
    /**
     * 단일 인수를 가진 메시지를 조회합니다.
     */
    fun getMessage(key: String, arg: Any, locale: Locale = Locale.KOREAN): String {
        return getMessage(key, arrayOf(arg), locale)
    }
    
    /**
     * API 응답용 성공 메시지
     */
    fun getSuccessMessage(key: String, locale: Locale = Locale.KOREAN): String {
        return getMessage(key, locale = locale)
    }
    
    /**
     * API 응답용 에러 메시지
     */
    fun getErrorMessage(key: String, vararg args: Any, locale: Locale = Locale.KOREAN): String {
        return getMessage(key, args, locale)
    }
    
    /**
     * Validation 메시지
     */
    fun getValidationMessage(key: String, locale: Locale = Locale.KOREAN): String {
        return getMessage(key, locale = locale)
    }
}
