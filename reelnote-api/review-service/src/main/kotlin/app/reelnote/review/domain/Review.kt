package app.reelnote.review.domain

import jakarta.persistence.*
import org.hibernate.annotations.SQLDelete
import org.hibernate.annotations.SQLRestriction
import java.time.LocalDate

/**
 * 영화 리뷰 도메인 엔티티
 * 
 * @property id 리뷰 고유 식별자
 * @property userSeq 사용자 식별자 (멀티테넌시 지원)
 * @property movieId 영화 ID (Catalog 서비스 연동)
 * @property rating 평점 (1-5)
 * @property reason 리뷰 내용
 * @property tags 태그 목록
 * @property watchedAt 시청일
 */
@Entity
@Table(name = "reviews")
@SQLDelete(sql = "UPDATE reviews SET deleted = true, deleted_at = NOW(), version = version + 1 WHERE id = ? AND version = ?")
@SQLRestriction("deleted = false")
class Review private constructor(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    
    @Column(name = "user_seq", nullable = false)
    val userSeq: Long,
    
    @Column(name = "movie_id", nullable = false)
    val movieId: Long,
    
    @Embedded
    var rating: Rating,
    
    @Column(length = 1000)
    var reason: String? = null,
    
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "review_tags", joinColumns = [JoinColumn(name = "review_id")])
    @Column(name = "tag", length = 50)
    var tags: Set<String> = emptySet(),

    @Column(name = "watched_at")
    var watchedAt: LocalDate? = null
) : BaseEntity() {
    
    init {
        require(userSeq > 0) { "사용자 식별자는 양수여야 합니다. 입력값: $userSeq" }
        require(movieId > 0) { "영화 ID는 양수여야 합니다. 입력값: $movieId" }
        require((reason?.length ?: 0) <= 1000) { "리뷰 내용은 1000자를 초과할 수 없습니다. 현재 길이: ${reason?.length ?: 0}" }
        require(tags.all { it.length <= 50 }) { "태그는 50자를 초과할 수 없습니다. 위반 태그: ${tags.filter { it.length > 50 }}" }
    }
    
    /**
     * ID 기반 equals/hashCode
     */
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Review) return false
        return id != 0L && id == other.id
    }
    
    override fun hashCode(): Int {
        return id.hashCode()
    }
    
    /**
     * 리뷰 내용 수정 - 더티 체킹 사용
     */
    fun updateContent(
        rating: Rating = this.rating,
        reason: String? = this.reason,
        tags: Set<String> = this.tags,
        watchedAt: LocalDate? = this.watchedAt
    ) {
        // 검증 로직
        require((reason?.length ?: 0) <= 1000) { "리뷰 내용은 1000자를 초과할 수 없습니다. 현재 길이: ${reason?.length ?: 0}" }
        require(tags.all { it.length <= 50 }) { "태그는 50자를 초과할 수 없습니다. 위반 태그: ${tags.filter { it.length > 50 }}" }
        
        // 더티 체킹으로 자동 업데이트
        this.rating = rating
        this.reason = reason
        this.tags = tags
        this.watchedAt = watchedAt
    }
    
    /**
     * 이벤트 발행 완료 표시
     */
    fun markAsPublished() {
        markEventAsPublished()
    }
    
    companion object {
        /**
         * 새로운 리뷰 생성 - 비즈니스 로직 검증 포함
         */
        fun create(
            userSeq: Long,
            movieId: Long,
            rating: Rating,
            reason: String? = null,
            tags: Set<String> = emptySet(),
            watchedAt: LocalDate? = null
        ): Review {
            return Review(
                userSeq = userSeq,
                movieId = movieId,
                rating = rating,
                reason = reason,
                tags = tags,
                watchedAt = watchedAt
            )
        }
    }
    
}

/**
 * 평점 값 객체
 */
@Embeddable
data class Rating(
    @Column(name = "rating_value", nullable = false)
    val value: Int
) {
    init {
        require(value in 1..5) { "평점은 1-5 사이여야 합니다" }
    }
    
    companion object {
        fun of(value: Int) = Rating(value)
    }
}