package app.reelnote.review.infrastructure.config

import jakarta.servlet.Filter
import jakarta.servlet.FilterChain
import jakarta.servlet.ServletRequest
import jakarta.servlet.ServletResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * TraceId 필터
 * 요청 시작 시 X-Trace-Id 헤더를 확인하고, 없으면 새로 생성하여 MDC에 설정합니다.
 * 이를 통해 모든 로그에 traceId가 자동으로 포함됩니다.
 */
@Component
@Order(1) // 가장 먼저 실행되도록 설정
class TraceIdFilter : Filter {
    companion object {
        private const val TRACE_ID_HEADER = "X-Trace-Id"
        private const val MDC_TRACE_ID_KEY = "traceId"
    }

    override fun doFilter(
        request: ServletRequest,
        response: ServletResponse,
        chain: FilterChain,
    ) {
        val httpRequest = request as HttpServletRequest
        val httpResponse = response as HttpServletResponse

        try {
            // X-Trace-Id 헤더 확인
            val traceIdHeader = httpRequest.getHeader(TRACE_ID_HEADER)
            val traceId =
                if (!traceIdHeader.isNullOrBlank()) {
                    traceIdHeader
                } else {
                    // 헤더가 없으면 새로 생성
                    UUID.randomUUID().toString()
                }

            // MDC에 traceId 설정 (모든 로그에 자동 포함)
            MDC.put(MDC_TRACE_ID_KEY, traceId)

            // 응답 헤더에도 포함 (선택사항, 클라이언트가 확인할 수 있도록)
            httpResponse.setHeader(TRACE_ID_HEADER, traceId)

            chain.doFilter(request, response)
        } finally {
            // 요청 완료 후 MDC 정리 (메모리 누수 방지)
            MDC.clear()
        }
    }
}
