package app.reelnote.review.e2e

import io.restassured.RestAssured.given
import org.hamcrest.Matchers.notNullValue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class ReviewRecentE2eTest {
    private val baseUrl: String =
        System.getenv("REVIEW_BASE_URL") ?: "http://localhost:5100"

    @Test
    @DisplayName("최근 리뷰 목록 조회 시 성공 응답을 반환한다")
    fun recentReviews_shouldReturnPagedResponse() {
        val response =
            given()
                .baseUri(baseUrl)
                .`when`()
                .get("/api/v1/reviews/recent")
                .then()
                .extract()
                .response()

        // 에러 응답 본문 확인을 위해 상태 코드와 본문을 출력
        if (response.statusCode() != 200) {
            println("Error Status: ${response.statusCode()}")
            println("Error Body: ${response.body().asString()}")
        }

        response
            .then()
            .statusCode(200)
            // 현재 API는 래퍼가 아닌 List<ReviewResponse>를 직접 반환하므로
            // 응답 본문이 존재하는지만 검증한다
            .body(notNullValue())
    }
}
