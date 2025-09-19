package app.reelnote.review.infrastructure.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration

/**
 * WebClient 설정
 */
@Configuration
class WebClientConfig {
    
    @Value("\${tmdb.api.base-url:https://api.themoviedb.org/3}")
    private lateinit var tmdbBaseUrl: String
    
    @Value("\${tmdb.api.key}")
    private lateinit var tmdbApiKey: String
    
    @Value("\${tmdb.api.timeout:10s}")
    private lateinit var timeout: String
    
    /**
     * TMDB API용 WebClient
     */
    @Bean("tmdbWebClient")
    fun tmdbWebClient(builder: WebClient.Builder): WebClient {
        val httpClient = HttpClient.create()
            .responseTimeout(Duration.parse("PT${timeout}"))
            .option(io.netty.channel.ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
        
        return builder
            .baseUrl(tmdbBaseUrl)
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer $tmdbApiKey")
            .defaultHeader(HttpHeaders.ACCEPT, "application/json")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json")
            .clientConnector(ReactorClientHttpConnector(httpClient))
            .codecs { configurer ->
                configurer.defaultCodecs().maxInMemorySize(1024 * 1024) // 1MB
            }
            .build()
    }
}


