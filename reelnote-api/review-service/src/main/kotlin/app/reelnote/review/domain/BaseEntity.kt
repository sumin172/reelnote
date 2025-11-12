package app.reelnote.review.domain

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.MappedSuperclass
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Version
import org.springframework.data.annotation.CreatedBy
import org.springframework.data.annotation.LastModifiedBy
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant

/**
 * 모든 엔티티의 기본 메타데이터를 제공하는 추상 클래스
 *
 * @property createdAt 생성일시
 * @property updatedAt 수정일시
 * @property version 버전 (Optimistic Locking용)
 * @property createdBy 생성자 ID
 * @property updatedBy 수정자 ID
 * @property deleted 삭제 여부
 * @property deletedAt 삭제일시
 * @property eventPublished 이벤트 발행 여부
 * @property eventPublishedAt 이벤트 발행일시
 */
@MappedSuperclass
@EntityListeners(value = [BaseEntityListener::class, AuditingEntityListener::class])
abstract class BaseEntity {
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    @Version
    var version: Long = 0

    @CreatedBy
    @Column(name = "created_by", nullable = false)
    var createdBy: Long = 0

    @LastModifiedBy
    @Column(name = "updated_by")
    var updatedBy: Long? = null

    @Column(name = "deleted", nullable = false)
    var deleted: Boolean = false

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null

    @Column(name = "event_published", nullable = false)
    var eventPublished: Boolean = false

    @Column(name = "event_published_at")
    var eventPublishedAt: Instant? = null

    /**
     * 이벤트 발행 완료 표시
     */
    fun markEventAsPublished() {
        eventPublished = true
        eventPublishedAt = Instant.now()
    }

    /**
     * 삭제 취소
     */
    fun restore() {
        deleted = false
        deletedAt = null
    }
}

/**
 * BaseEntity의 자동 업데이트를 위한 JPA 리스너
 */
class BaseEntityListener {
    @PrePersist
    fun prePersist(entity: BaseEntity) {
        val now = Instant.now()
        entity.createdAt = now
        entity.updatedAt = now
    }

    @PreUpdate
    fun preUpdate(entity: BaseEntity) {
        entity.updatedAt = Instant.now()
    }
}
