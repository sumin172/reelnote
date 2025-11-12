package app.reelnote.review.infrastructure.catalog

import app.reelnote.review.shared.exception.ExternalApiException
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import org.slf4j.LoggerFactory
import org.springframework.core.codec.DecodingException
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import org.springframework.web.reactive.function.client.awaitBody

@Component
class CatalogClient(
    private val catalogWebClient: WebClient,
) {
    private val logger = LoggerFactory.getLogger(CatalogClient::class.java)

    suspend fun searchMovies(
        query: String,
        page: Int,
        language: String,
    ): CatalogMovieSearchResponse {
        logger.debug("Catalog 서비스 영화 검색 호출: query={}, page={}, language={}", query, page, language)

        return runCatching {
            catalogWebClient
                .get()
                .uri { builder ->
                    builder
                        .path("/v1/search")
                        .queryParam("q", query)
                        .queryParam("page", page)
                        .queryParam("language", language)
                        .build()
                }.retrieve()
                .awaitBody<CatalogMovieSearchResponse>()
        }.getOrElse { ex -> handleCatalogError(ex) }
    }

    private fun handleCatalogError(ex: Throwable): Nothing {
        when (ex) {
            is WebClientResponseException ->
                logger.error(
                    "Catalog 서비스 영화 검색 실패: status={}, body={}",
                    ex.statusCode,
                    ex.responseBodyAsString,
                )

            is WebClientRequestException ->
                logger.error("Catalog 서비스 영화 검색 네트워크 오류: {}", ex.message)

            is DecodingException ->
                logger.error("Catalog 서비스 응답 역직렬화 실패", ex)

            else -> logger.error("Catalog 서비스 호출 중 예외 발생", ex)
        }
        throw ExternalApiException("Catalog", ex)
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class CatalogMovieSearchResponse(
    val local: List<CatalogMovieSummary> = emptyList(),
    val tmdb: List<CatalogMovieSummary> = emptyList(),
    val page: Int = 1,
    val query: String = "",
) {
    fun aggregateMovieIds(): List<Long> =
        (local + tmdb)
            .mapNotNull { it.tmdbId }
            .distinct()
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class CatalogMovieSummary(
    val tmdbId: Long? = null,
    val title: String? = null,
    val originalTitle: String? = null,
)
