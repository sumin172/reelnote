# Frontend ↔ Catalog Contract Tests

이 디렉터리는 프론트엔드(Remote API consumer)와 카탈로그 서비스(provider) 간 계약 검증을 위한 자리를 미리 마련한 것입니다.

## 현재 상태

- `contract:generate` – 소비자 계약 생성 (추후 Pact/contract 툴로 교체 예정)
- `contract:verify` – 제공자 계약 검증 (추후 provider 테스트로 대체 예정)
- `implicitDependencies`에 `frontend`, `catalog-service`, `api-schema`가 연결되어 있어 관련 변경 시 `nx affected`에 자동 포함됩니다.

## TODO

1. Pact 등 계약 테스트 도구 도입
2. 계약 산출물(`packages/api-schema`)과 CI 통합
3. provider 검증을 위한 카탈로그 서비스 기동 스크립트 작성

지금은 구조만 잡혀 있으며, 스크립트는 `TODO` 메시지만 출력합니다.

