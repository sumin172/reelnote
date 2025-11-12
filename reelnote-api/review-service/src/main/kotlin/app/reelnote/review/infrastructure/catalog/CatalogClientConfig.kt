package app.reelnote.review.infrastructure.catalog

import io.netty.channel.ChannelOption
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient

@Configuration
@EnableConfigurationProperties(CatalogApiProperties::class)
class CatalogClientConfig {
    @Bean("catalogWebClient")
    fun catalogWebClient(
        builder: WebClient.Builder,
        properties: CatalogApiProperties,
    ): WebClient {
        val httpClient =
            HttpClient
                .create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, properties.connectTimeout.toMillis().toInt())
                .doOnConnected { connection ->
                    connection.addHandlerLast(
                        io.netty.handler.timeout.ReadTimeoutHandler(
                            properties.timeout.toMillis(),
                            java.util.concurrent.TimeUnit.MILLISECONDS,
                        ),
                    )
                    connection.addHandlerLast(
                        io.netty.handler.timeout.WriteTimeoutHandler(
                            properties.timeout.toMillis(),
                            java.util.concurrent.TimeUnit.MILLISECONDS,
                        ),
                    )
                }.responseTimeout(properties.timeout)

        return builder
            .baseUrl(properties.baseUrl)
            .clientConnector(
                org.springframework.http.client.reactive
                    .ReactorClientHttpConnector(httpClient),
            ).build()
    }
}
