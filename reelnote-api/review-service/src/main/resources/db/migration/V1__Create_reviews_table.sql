-- 리뷰 테이블 생성
CREATE TABLE reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_seq BIGINT NOT NULL,
    movie_id BIGINT NOT NULL,
    rating_value INT NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
    reason VARCHAR(1000),
    watched_at DATE,
    
    -- 공통 메타데이터
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    
    -- 감사 메타데이터
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    
    -- 이벤트 발행 메타데이터
    event_published BOOLEAN NOT NULL DEFAULT FALSE,
    event_published_at TIMESTAMP
);

-- 리뷰 태그 테이블 생성
CREATE TABLE review_tags (
    review_id BIGINT NOT NULL,
    tag VARCHAR(50) NOT NULL,
    
    PRIMARY KEY (review_id, tag),
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_reviews_user_seq ON reviews (user_seq);
CREATE INDEX idx_reviews_movie_id ON reviews (movie_id);
CREATE INDEX idx_reviews_rating ON reviews (rating_value);
CREATE INDEX idx_reviews_watched_at ON reviews (watched_at);
CREATE INDEX idx_reviews_deleted ON reviews (deleted);
CREATE INDEX idx_reviews_event_published ON reviews (event_published);
CREATE INDEX idx_reviews_tag ON review_tags (tag);

-- 복합 인덱스 (자주 사용되는 쿼리 패턴)
CREATE INDEX idx_reviews_movie_rating ON reviews (movie_id, rating_value);
CREATE INDEX idx_reviews_user_deleted ON reviews(user_seq, deleted);
CREATE INDEX idx_reviews_movie_deleted ON reviews(movie_id, deleted);