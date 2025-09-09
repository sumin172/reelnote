# Reelnote 🎬
개인 영화 리뷰 및 추천 플랫폼 (Microservices + Frontend)

## 구조
- `reelnote-api/`
  - `review-service/`: 영화 리뷰 CRUD 서비스 (Spring Boot + Kotlin)
  - `catalog-service/`: 영화 메타데이터 동기화 서비스 (NestJS)
  - `analysis-service/`: 리뷰 분석/집계 서비스 (FastAPI)
  - `reco-service/`: 추천 서비스 (Python or Kotlin)

- `reelnote-frontend/`
  - Next.js 기반 웹 프론트엔드

## 실행 (개발 단계)
1. 로컬에서 각 서비스 별로 실행
2. 추후 Docker Compose → K8s 확장

---