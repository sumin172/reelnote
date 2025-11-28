package app.reelnote.review.e2e

import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import java.time.LocalDate
import java.util.UUID
import kotlin.random.Random
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.notNullValue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class ReviewCreateFlowE2eTest {
    private val baseUrl: String = System.getenv("REVIEW_BASE_URL") ?: "http://localhost:5100"

    private val userSeq: Long = 4242L

    @Test
    @DisplayName("리뷰 생성 후 조회와 삭제까지 성공 플로우를 수행한다")
    fun createAndCleanupReview_success() {
        val movieId = 500_000 + Random(System.currentTimeMillis()).nextInt(10_000)
        val reason = "E2E flow ${UUID.randomUUID()}"
        val payload =
                mapOf(
                        "movieId" to movieId,
                        "rating" to 4,
                        "reason" to reason,
                        "tags" to listOf("e2e", "flow"),
                        "watchedAt" to LocalDate.now().minusDays(1).toString(),
                )

        val createdReviewId =
                given().baseUri(baseUrl)
                        .contentType(ContentType.JSON)
                        .header("X-User-Seq", userSeq)
                        .body(payload)
                        .`when`()
                        .post("/api/v1/reviews")
                        .then()
                        .statusCode(201)
                        .body("id", notNullValue())
                        .body("movieId", equalTo(movieId))
                        .extract()
                        .path<Int>("id")
                        .toLong()

        // 리뷰 생성 후 조회
        val response =
                given().baseUri(baseUrl)
                        .queryParam("userSeq", userSeq)
                        .queryParam("movieId", movieId)
                        .`when`()
                        .get("/api/v1/reviews")
                        .then()
                        .extract()
                        .response()

        // 에러 응답 본문 확인을 위해 상태 코드와 본문을 출력
        if (response.statusCode() != 200) {
            println("Error Status: ${response.statusCode()}")
            println("Error Body: ${response.body().asString()}")
        }

        response.then()
                .statusCode(200)
                .body("id", equalTo(createdReviewId.toInt()))
                .body("reason", equalTo(reason))

        given().baseUri(baseUrl)
                .header("X-User-Seq", userSeq)
                .`when`()
                .delete("/api/v1/reviews/$createdReviewId")
                .then()
                .statusCode(204)
    }
}
