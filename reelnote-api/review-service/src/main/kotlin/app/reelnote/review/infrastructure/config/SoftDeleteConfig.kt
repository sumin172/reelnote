package app.reelnote.review.infrastructure.config

/**
 * 소프트 삭제(Soft Delete) 관련 설정 및 주의사항
 *
 * - @SQLDelete: 삭제 시 deleted=true, deleted_at=NOW()
 * - @SQLRestriction: 기본 조회에 deleted=false 자동 적용
 * - 낙관적 락과 호환 (WHERE id=? AND version=?)
 *
 * 적용된 엔티티
 * - AuditableEntity: 공통 소프트 삭제
 * - Review: @SQLRestriction 적용
 *
 * 주의사항
 * - 네이티브 쿼리/벌크 업데이트에서는 deleted 조건을 직접 추가
 * - JPQL/Criteria/Specification에서는 자동 적용
 *
 * 소프트 삭제 데이터 조회
 * - 삭제된 데이터만: WHERE deleted = true
 * - 전체 데이터: WHERE deleted IN (true, false)
 * - 네이티브 조회 예: SELECT * FROM reviews WHERE deleted = true
 *
 * 성능 팁
 * - deleted, deleted_at, user_seq+deleted, movie_id+deleted 인덱스 권장
 * - 주기적으로 삭제 데이터 정리(아카이빙 등)
 *
 * 테스트 유의사항
 * - @DataJpaTest/@SpringBootTest: 실제 동작 확인
 * - Mock 테스트: deleted 필터링을 직접 적용
 */
object SoftDeleteConfig {
    const val SOFT_DELETE_SCHEMA: String = "app"
}
