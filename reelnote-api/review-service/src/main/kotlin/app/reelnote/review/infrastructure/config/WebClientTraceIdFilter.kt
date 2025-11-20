package app.reelnote.review.infrastructure.config

import org.slf4j.MDC
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.ExchangeFilterFunction
import reactor.core.publisher.Mono

/**
 * WebClient TraceId 필터
 * WebClient 요청 시 MDC에서 traceId를 읽어서 X-Trace-Id 헤더로 자동 추가합니다.
 * 이를 통해 서비스 간 호출 시 TraceId가 자동으로 전파됩니다.
 */
object WebClientTraceIdFilter {
    private const val TRACE_ID_HEADER = "X-Trace-Id"
    private const val MDC_TRACE_ID_KEY = "traceId"

    /**
     * ExchangeFilterFunction 생성
     * WebClient 요청 시 MDC의 traceId를 X-Trace-Id 헤더로 추가합니다.
     */
    fun create(): ExchangeFilterFunction =
        ExchangeFilterFunction.ofRequestProcessor { request ->
            val traceId = MDC.get(MDC_TRACE_ID_KEY)
            if (!traceId.isNullOrBlank()) {
                val modifiedRequest =
                    ClientRequest
                        .from(request)
                        .header(TRACE_ID_HEADER, traceId)
                        .build()
                Mono.just(modifiedRequest)
            } else {
                Mono.just(request)
            }
        }
}
