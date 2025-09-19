package app.reelnote.review.infrastructure.config

import org.springframework.context.annotation.Configuration

/**
 * 소프트 삭제(Soft Delete) 관련 설정 및 주의사항
 * 
 * 이 클래스는 Hibernate의 @SQLDelete와 @SQLRestriction 어노테이션을 통한
 * 소프트 삭제 구현에 대한 가이드라인을 제공합니다.
 */
@Configuration
class SoftDeleteConfig {

    /**
     * 소프트 삭제 구현 개요
     * 
     * 1. @SQLDelete: delete() 호출 시 실제 삭제 대신 deleted=true, deleted_at=NOW() 수행
     * 2. @SQLRestriction: 모든 기본 조회에서 deleted=false인 레코드만 반환
     * 3. 낙관적 락과 호환: WHERE id=? AND version=? 조건으로 안전한 삭제
     * 
     * 적용된 엔티티:
     * - AuditableEntity: 모든 감사 가능한 엔티티의 기본 소프트 삭제
     * - Review: 리뷰 엔티티에 @SQLRestriction 어노테이션 적용
     */

    /**
     * 주의사항 및 제한사항
     * 
     * 1. 네이티브 쿼리 (@Query(nativeQuery = true))
     *    - @SQLRestriction이 자동으로 적용되지 않음
     *    - 수동으로 WHERE deleted = false 조건을 추가해야 함
     *    - 예시:
     *      @Query("SELECT * FROM reviews WHERE user_seq = ?1 AND deleted = false", nativeQuery = true)
     *      fun findByUserSeqNative(userSeq: Long): List<Review>
     * 
     * 2. 벌크 업데이트 (@Modifying + @Query)
     *    - @SQLRestriction이 적용되지 않음
     *    - 수동으로 WHERE deleted = false 조건을 추가해야 함
     *    - 예시:
     *      @Modifying
     *      @Query("UPDATE reviews SET reason = ?2 WHERE user_seq = ?1 AND deleted = false")
     *      fun updateReasonByUserSeq(userSeq: Long, reason: String): Int
     * 
     * 3. JPQL 쿼리 (@Query)
     *    - @SQLRestriction이 자동으로 적용됨
     *    - 추가 조건 불필요
     *    - 예시:
     *      @Query("SELECT r FROM Review r WHERE r.userSeq = ?1")
     *      fun findByUserSeq(userSeq: Long): List<Review>
     * 
     * 4. Criteria API
     *    - @SQLRestriction이 자동으로 적용됨
     *    - 추가 조건 불필요
     * 
     * 5. Specification (Spring Data JPA)
     *    - @SQLRestriction이 자동으로 적용됨
     *    - 추가 조건 불필요
     */

    /**
     * 소프트 삭제된 데이터 조회 방법
     * 
     * 1. 삭제된 데이터만 조회:
     *    @Query("SELECT r FROM Review r WHERE r.deleted = true")
     *    fun findDeletedReviews(): List<Review>
     * 
     * 2. 모든 데이터 조회 (삭제된 것 포함):
     *    @Query("SELECT r FROM Review r WHERE r.deleted = false OR r.deleted = true")
     *    fun findAllIncludingDeleted(): List<Review>
     * 
     * 3. 네이티브 쿼리로 삭제된 데이터 조회:
     *    @Query("SELECT * FROM reviews WHERE deleted = true", nativeQuery = true)
     *    fun findDeletedReviewsNative(): List<Review>
     */

    /**
     * 성능 고려사항
     * 
     * 1. 인덱스 추가 권장:
     *    CREATE INDEX idx_reviews_deleted ON reviews(deleted);
     *    CREATE INDEX idx_reviews_deleted_at ON reviews(deleted_at);
     * 
     * 2. 복합 인덱스 (자주 사용되는 조합):
     *    CREATE INDEX idx_reviews_user_deleted ON reviews(user_seq, deleted);
     *    CREATE INDEX idx_reviews_movie_deleted ON reviews(movie_id, deleted);
     * 
     * 3. 정기적인 삭제된 데이터 정리:
     *    - 오래된 삭제된 데이터는 별도 아카이브 테이블로 이동
     *    - 또는 완전 삭제 (GDPR 준수 고려)
     */

    /**
     * 테스트 시 주의사항
     * 
     * 1. @DataJpaTest 사용 시:
     *    - @SQLRestriction이 정상 작동함
     *    - 소프트 삭제 테스트 가능
     * 
     * 2. Mock 테스트 시:
     *    - @SQLRestriction이 적용되지 않음
     *    - 수동으로 삭제된 데이터 필터링 필요
     * 
     * 3. 통합 테스트 시:
     *    - 실제 데이터베이스에서 @SQLRestriction 동작 확인
     *    - 네이티브 쿼리 테스트 포함 권장
     */
}
