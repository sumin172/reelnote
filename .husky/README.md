# Husky Git Hooks

이 디렉토리는 Git 훅을 관리합니다.

## 훅 설명

### pre-commit
커밋 전 실행되는 훅으로 다음 공통 검사를 수행합니다:
- **Trailing whitespace 제거**: 모든 변경된 파일에서 줄 끝 공백 자동 제거
- **End of file 수정**: 파일 끝에 개행 문자 추가 (바이너리 파일 제외)
- **Private key 검사**: 민감한 정보(API 키, 개인 키 등) 커밋 방지

**참고**: 언어별 코드 스타일 검사(ESLint, Prettier, ktlint 등)는 **CI/CD에서 처리**합니다.
이렇게 하면 모든 개발 환경(Windows/Mac/Linux)에서 동일하게 동작하며, 로컬 환경 설정 부담이 줄어듭니다.

### commit-msg
커밋 메시지 형식을 검증합니다:
- **Conventional Commits 형식 강제**
- 형식: `type(scope): description`
- 예: `feat(catalog): add movie import`, `fix(review): resolve error`, `docs: update README`

## 사용 방법

### 커밋하기

**올바른 커밋 메시지 형식:**
```bash
git add .
git commit -m "feat(catalog): add movie import endpoint"
git commit -m "fix(review): resolve validation error"
git commit -m "docs: update README"
```

**잘못된 형식 (커밋 차단됨):**
```bash
# ❌ 이런 메시지는 거부됨
git commit -m "added feature"
git commit -m "fix bug"
git commit -m "update"
```

## 코드 스타일 검사

### CI/CD에서 자동 검사
푸시 또는 PR 생성 시 다음 검사가 자동으로 실행됩니다:
- **TypeScript/JavaScript**: ESLint 및 Prettier (`.github/workflows/lint.yml`)
- **Kotlin**: ktlint (`.github/workflows/lint.yml`)

### 로컬에서 수동 검사 (선택사항)
로컬에서 수동으로 검사하려면:
```bash
# TypeScript/JavaScript
cd reelnote-frontend
pnpm exec eslint .

## 트러블슈팅

### Private key 검사 오류 발생 시
실제로 민감한 정보가 아닌 경우:
```bash
# 해당 파일을 .gitignore에 추가하거나
# 필요하다면 --no-verify로 우회 (권장하지 않음)
git commit -m "fix: resolve issue" --no-verify
```

### CI 검사 실패 시
1. 로컬에서 해당 언어의 린터/포맷터 실행
2. 오류 수정
3. 다시 커밋 및 푸시

```bash
# 예: TypeScript 포맷팅 오류 수정
cd reelnote-frontend
pnpm exec prettier --write .
git add .
git commit -m "fix: apply prettier formatting"
git push
```

### 훅 건너뛰기 (비상시)

```bash
# Pre-commit 건너뛰기
git commit -m "message" --no-verify

# 주의: 일반적으로 권장하지 않습니다
# CI 검사는 여전히 실행되므로 최종적으로는 통과해야 합니다
```

