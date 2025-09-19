package app.reelnote.review.infrastructure

import app.reelnote.review.domain.Review
import app.reelnote.review.domain.ReviewRepository
import app.reelnote.review.domain.Rating
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/**
 * Hibernate @SQLDelete와 @SQLRestriction 어노테이션을 통한 소프트 삭제 통합 테스트
 */
@DataJpaTest
@ActiveProfiles("test")
class SoftDeleteIntegrationTest {

    @Autowired
    private lateinit var entityManager: TestEntityManager

    @Autowired
    private lateinit var reviewRepository: ReviewRepository

    @Test
    fun `소프트 삭제된 리뷰는 기본 조회에서 제외됨`() {
        // Given
        val review = Review(
            userSeq = 1L,
            movieId = 12345L,
            rating = Rating.of(5),
            reason = "정말 좋았습니다",
            tags = setOf("액션", "SF"),
            watchedAt = LocalDate.now()
        )
        
        val savedReview = reviewRepository.save(review)
        entityManager.flush()
        
        // When - 소프트 삭제 실행 (Hibernate의 @SQLDelete가 실행됨)
        reviewRepository.delete(savedReview)
        entityManager.flush()
        entityManager.clear()
        
        // Then - @SQLRestriction으로 인해 삭제된 리뷰는 조회되지 않음
        val foundReview = reviewRepository.findById(savedReview.id)
        assertEquals(false, foundReview.isPresent)
        
        // 하지만 데이터베이스에서는 실제로 삭제되지 않고 deleted=true로 업데이트됨
        val nativeQuery = entityManager.entityManager.createNativeQuery(
            "SELECT deleted, deleted_at FROM reviews WHERE id = ?"
        )
        nativeQuery.setParameter(1, savedReview.id)
        val result = nativeQuery.singleResult as Array<*>
        
        assertEquals(true, result[0]) // deleted = true
        assertNotNull(result[1]) // deleted_at이 설정됨
    }

    @Test
    fun `낙관적 락과 함께 소프트 삭제가 정상 작동함`() {
        // Given
        val review = Review(
            userSeq = 1L,
            movieId = 12345L,
            rating = Rating.of(5),
            reason = "정말 좋았습니다"
        )
        
        val savedReview = reviewRepository.save(review)
        entityManager.flush()
        
        // When - 버전을 포함한 소프트 삭제
        val currentVersion = savedReview.version
        reviewRepository.delete(savedReview)
        entityManager.flush()
        entityManager.clear()
        
        // Then - @SQLDelete의 WHERE id = ? AND version = ? 조건이 정상 작동
        val foundReview = reviewRepository.findById(savedReview.id)
        assertEquals(false, foundReview.isPresent)
        
        // 버전이 증가했는지 확인
        val nativeQuery = entityManager.entityManager.createNativeQuery(
            "SELECT version, deleted FROM reviews WHERE id = ?"
        )
        nativeQuery.setParameter(1, savedReview.id)
        val result = nativeQuery.singleResult as Array<*>
        
        assertEquals(true, result[1]) // deleted = true
        // 버전은 @PreUpdate에서 증가하므로 currentVersion + 1이어야 함
        assertEquals(currentVersion + 1, result[0])
    }

    @Test
    fun `삭제되지 않은 리뷰는 정상 조회됨`() {
        // Given
        val review = Review(
            userSeq = 1L,
            movieId = 12345L,
            rating = Rating.of(5),
            reason = "정말 좋았습니다"
        )
        
        val savedReview = reviewRepository.save(review)
        entityManager.flush()
        entityManager.clear()
        
        // When
        val foundReview = reviewRepository.findById(savedReview.id)
        
        // Then
        assertEquals(true, foundReview.isPresent)
        assertEquals(savedReview.id, foundReview.get().id)
        assertEquals("정말 좋았습니다", foundReview.get().reason)
    }

    @Test
    fun `모든 리뷰 조회 시 삭제된 리뷰는 제외됨`() {
        // Given
        val activeReview1 = Review(
            userSeq = 1L,
            movieId = 12345L,
            rating = Rating.of(5),
            reason = "활성 리뷰 1"
        )
        
        val activeReview2 = Review(
            userSeq = 2L,
            movieId = 67890L,
            rating = Rating.of(4),
            reason = "활성 리뷰 2"
        )
        
        val deletedReview = Review(
            userSeq = 3L,
            movieId = 11111L,
            rating = Rating.of(3),
            reason = "삭제될 리뷰"
        )
        
        reviewRepository.saveAll(listOf(activeReview1, activeReview2, deletedReview))
        entityManager.flush()
        
        // 삭제된 리뷰를 소프트 삭제
        reviewRepository.delete(deletedReview)
        entityManager.flush()
        entityManager.clear()
        
        // When
        val allReviews = reviewRepository.findAll()
        
        // Then
        assertEquals(2, allReviews.size)
        assertEquals(setOf("활성 리뷰 1", "활성 리뷰 2"), 
                   allReviews.map { it.reason }.toSet())
    }
}
