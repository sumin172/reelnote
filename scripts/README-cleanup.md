# 프로젝트 정리 가이드

프로젝트의 빌드 산출물, 캐시, IDE 설정 등을 안전하게 정리하는 가이드입니다.

## 📋 개요

이 프로젝트에는 두 가지 주요 정리 스크립트가 있습니다:

1. **`clean-build-outputs.ps1`** - 빌드 산출물 정리 (dist, build, bin 등)
2. **`clean-workspace-cache.ps1`** - IDE 캐시 및 워크스페이스 캐시 정리

## 🚀 빠른 실행 (pnpm 스크립트)

가장 간편한 방법은 `package.json`의 npm/pnpm 스크립트를 사용하는 것입니다:

```bash
# 빌드 산출물 정리
pnpm clean:build              # 모든 빌드 산출물 정리 + build-logic 자동 재빌드
pnpm clean:build:dry          # 삭제할 항목만 확인 (실제 삭제 안 함)

# 캐시 정리
pnpm clean:cache              # Nx 캐시 + IDE 캐시 정리
pnpm clean:ide                # IDE 캐시만 정리

# 전체 정리
pnpm clean:all                # 빌드 산출물 + Nx 캐시 + IDE 캐시 모두 정리 + build-logic 자동 재빌드
```

## 📦 1. 빌드 산출물 정리 (`clean-build-outputs.ps1`)

`.gitignore`에 포함된 빌드 산출물 디렉토리들을 안전하게 정리합니다.

### 사용법

```powershell
# 기본: 모든 빌드 산출물 정리
.\scripts\clean-build-outputs.ps1

# 건조 실행: 삭제할 항목만 확인 (실제 삭제 안 함)
.\scripts\clean-build-outputs.ps1 -DryRun

# 대화형 모드: 삭제할 항목을 선택할 수 있음
.\scripts\clean-build-outputs.ps1 -Interactive
```

### 정리되는 항목

- `dist/` (루트 및 서비스별)
- `tmp/` (루트)
- `build/` (루트 및 `review-service`, `build-logic`, `e2e-review`)
- `out-tsc/` (루트 및 `catalog-service`)
- `bin/` (`review-service`, `build-logic`, `e2e-review`)

### 주요 특징

- ✅ **보호 기능**: `.nx.js`, `nxw.js` 같은 중요 파일은 자동으로 보호됩니다
- ✅ **자동 재빌드**: `build-logic` 삭제 시 자동으로 재빌드하여 경로 이슈를 방지합니다
- ✅ **크기 표시**: 각 디렉토리 크기와 총 해제 가능 공간을 표시합니다
- ✅ **안전성**: `.gitignore`에 포함된 디렉토리만 정리합니다

### 참고

- 이 디렉토리들은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다
- 다음 빌드 시 자동으로 다시 생성됩니다
- 중요 파일 (.nx.js, nxw.js 등)은 자동으로 보호됩니다
- `build-logic`은 삭제 시 자동으로 재빌드됩니다 (경로 이슈 방지)

## 🧹 2. IDE 캐시 정리 (`clean-workspace-cache.ps1`)

IDE가 프로젝트 구조를 잘못 인식하거나, 이전 멀티 프로젝트 구조의 잔재가 남아있을 때 사용하는 캐시 정리 가이드입니다.

### 사용법

```powershell
# 기본: 현재 프로젝트의 워크스페이스 캐시만 정리
.\scripts\clean-workspace-cache.ps1

# 대화형 모드: 삭제할 항목을 선택할 수 있음
.\scripts\clean-workspace-cache.ps1 -Interactive

# 모든 워크스페이스 캐시 정리 (다른 프로젝트 포함)
.\scripts\clean-workspace-cache.ps1 -AllWorkspaces

# 빌드 캐시는 제외하고 IDE 캐시만 정리
.\scripts\clean-workspace-cache.ps1 -SkipBuildCache

# 전체 캐시 정리 (Gradle 사용자 캐시 포함)
.\scripts\clean-workspace-cache.ps1 -GradleUserCache
```

### 정리되는 항목

#### 1. 워크스페이스별 캐시
- 위치: `%APPDATA%\Cursor\User\workspaceStorage\*`
- 내용: 워크스페이스별 프로젝트 구조, 설정, 상태 정보
- 영향: 워크스페이스로 열었을 때만 적용됨
- 옵션: `-AllWorkspaces`로 모든 워크스페이스 정리 가능

#### 2. 언어 서버 및 확장 캐시
다음 확장들의 캐시를 정리합니다:
- **Java Language Server** (`redhat.java`): Java/Gradle 프로젝트 분석 결과
- **Kotlin 확장** (`fwcd.kotlin`): Kotlin 언어 서버 캐시
- **TypeScript** (`ms-vscode.vscode-typescript-next`): TypeScript 언어 서버 캐시
- **ESLint** (`dbaeumer.vscode-eslint`): ESLint 캐시
- **Prettier** (`esbenp.prettier-vscode`): Prettier 캐시
- **Nx Console** (`nrwl.angular-console`): Nx Console 캐시

#### 3. 프로젝트 빌드 캐시 (선택)
- 위치: 프로젝트 내 `.gradle`, `build`, `bin`, `.nx`, `node_modules/.cache` 등
- 내용: Gradle, Nx, Node.js 빌드 결과물
- 영향: 다음 빌드 시 재생성됨
- 옵션: `-SkipBuildCache`로 제외 가능

#### 4. Gradle 사용자 캐시 (선택)
- 위치: `%USERPROFILE%\.gradle\caches`
- 내용: 모든 Gradle 프로젝트에 공유되는 의존성 캐시
- 영향: 모든 Gradle 프로젝트에 영향 (신중하게 사용)
- 옵션: `-GradleUserCache`로 포함 가능

## ⚠️ 주의사항

1. **Cursor를 먼저 종료하세요**
   - 스크립트 실행 전에 Cursor의 모든 창을 닫아주세요
   - 파일이 사용 중이면 삭제가 실패할 수 있습니다

2. **워크스페이스 재시작 필요**
   - 캐시 정리 후 Cursor를 재시작하세요
   - 워크스페이스 파일로 프로젝트를 다시 여세요

3. **Gradle 사용자 캐시**
   - `-GradleUserCache` 옵션으로 사용자 홈의 Gradle 캐시도 정리 가능합니다
   - 이 캐시는 모든 Gradle 프로젝트에 공유되므로 신중하게 삭제하세요
   - 삭제하면 다음 빌드 시 의존성을 다시 다운로드합니다

## 🔍 문제 진단

### 에러 메시지 예시

```
Execution failed for task ':build-logic:kotlin-e2e:generatePrecompiledScriptPluginAccessors'
```

이런 에러가 발생하면:
1. `build-logic`이 단일 프로젝트인데 멀티 프로젝트로 인식되는 경우
2. 이전 프로젝트 구조의 캐시가 남아있는 경우

### 해결 방법

1. 빌드 산출물 정리 스크립트 실행 (`pnpm clean:build`)
2. 워크스페이스 캐시 정리 스크립트 실행 (`pnpm clean:ide`)
3. Cursor 재시작
4. 워크스페이스로 프로젝트 다시 열기

## 💡 팁

- **정기적인 정리**: 프로젝트 구조를 크게 변경한 후에는 캐시를 정리하는 것이 좋습니다
- **대화형 모드**: `-Interactive` 옵션으로 삭제할 항목을 선택할 수 있습니다
- **빌드 캐시 제외**: IDE 문제만 해결하고 싶을 때는 `-SkipBuildCache`를 사용하세요
- **건조 실행**: `-DryRun` 또는 `pnpm clean:build:dry`로 삭제 전에 확인할 수 있습니다
- **폴더로 열기**: 워크스페이스 캐시 문제가 있을 때는 일시적으로 폴더로 열어서 확인할 수 있습니다
- **Gradle daemon 중지**: 캐시 정리 전에 `.\gradlew.bat --stop`으로 daemon을 중지하면 더 깔끔하게 정리됩니다

## 🎯 사용 시나리오

### 시나리오 1: 빌드 산출물 정리 (디스크 공간 확보)

```bash
# 먼저 무엇이 삭제될지 확인
pnpm clean:build:dry

# 실제로 정리
pnpm clean:build
```

### 시나리오 2: IDE가 프로젝트 구조를 잘못 인식할 때

```bash
pnpm clean:ide
# 또는
.\scripts\clean-workspace-cache.ps1
```

### 시나리오 3: TypeScript/ESLint 등 언어 서버가 이상할 때

```bash
pnpm clean:ide
# 또는
.\scripts\clean-workspace-cache.ps1 -SkipBuildCache
```

### 시나리오 4: 모든 워크스페이스 캐시를 깔끔하게 정리하고 싶을 때

```powershell
.\scripts\clean-workspace-cache.ps1 -AllWorkspaces -Interactive
```

### 시나리오 5: 완전히 깔끔하게 시작하고 싶을 때

```bash
pnpm clean:all
# 모든 빌드 산출물과 캐시를 정리한 후 build-logic을 자동으로 재빌드합니다
```

## 📚 관련 문서

- `.gitignore` - 정리 대상 항목 확인
- `CLEANUP_REPORT.md` - 프로젝트 정리 보고서

