# Tools Configuration Directory

이 디렉토리는 각 언어/플랫폼별 도구 설정 파일을 관리합니다.

## 구조

```
tools/
├── nestjs/          # NestJS 프레임워크 전용 설정
│   └── jest.preset.cjs
└── kotlin/          # Kotlin 공통 설정
    ├── build.gradle.kts.base    # 공통 Gradle 설정 (플러그인, toolchain, lint 등)
    └── detekt.yml               # 공통 detekt 코드 품질 규칙
```

루트 디렉토리:
```
루트/
├── tsconfig.base.json         # TypeScript 최상위 기본 설정 (공통 옵션만)
├── tsconfig.node.json         # TypeScript Node.js 프로젝트용 preset
├── tsconfig.bundler.json      # TypeScript Bundler 기반 프로젝트용 preset
├── eslint.base.config.mjs     # ESLint 공통 기본 설정 (Nx 플러그인, 모듈 경계 규칙)
├── eslint.config.mjs          # ESLint 루트 설정 (base 상속 + 루트 레벨 규칙)
├── jest.config.ts             # Jest multi-project 설정 (IDE/에디터 통합용)
└── jest.preset.cjs            # Jest 범용 preset (Windows NODE_PATH 해결 등)
```

> **참고**: Kotlin 설정은 `tools/kotlin/` 디렉토리에서 관리합니다.

## 공통 설정

- Nx 워크스페이스에서 공유하는 설정은 `tools/` 하위에 두고 각 프로젝트가 상속합니다.
- 새로운 언어/플랫폼 설정을 추가할 때는 하위 디렉터리를 만들고 README에 반영하세요.
- 공통 설정 업데이트 시 영향 범위를 파악하기 위해 Nx `affected` 명령어(`pnpm nx affected:test` 등)를 활용하세요.

## TypeScript 설정

### 설정 파일 계층 구조

1. **tsconfig.base.json**: 최상위 기본 설정
   - 모든 프로젝트의 공통 컴파일러 옵션
   - `moduleResolution`은 설정하지 않음 (프로젝트별로 다름)
   - `typeRoots`는 설정하지 않음 - TypeScript가 자동으로 `node_modules/@types`를 찾음

2. **tsconfig.node.json**: Node.js 프로젝트용 preset
   - `module: "nodenext"`, `moduleResolution: "nodenext"`
   - NestJS, Node.js 라이브러리, 테스트 프로젝트에 사용
   - `types: ["node"]` 기본값 포함
   - `customConditions: ["reelnote", "node", "require", "default"]` 포함

3. **tsconfig.bundler.json**: Bundler 기반 프로젝트용 preset
   - `module: "ESNext"`, `moduleResolution: "bundler"`
   - Next.js, Vite 등 번들러 기반 프로젝트에 사용
   - `customConditions: ["reelnote", "browser", "import", "default"]` 포함
   - `jsx`는 설정하지 않음 (Next.js는 "preserve"로 오버라이드 필요)

### 사용법

각 프로젝트의 환경에 맞는 preset을 상속:

```json
// Node.js 프로젝트 (NestJS, 라이브러리, 테스트)
{
  "extends": "../../tsconfig.node.json"
}

// Bundler 기반 프로젝트 (Next.js, Vite)
{
  "extends": "../../tsconfig.bundler.json"
}
```

## ESLint 설정

### 설정 파일 계층 구조

1. **eslint.base.config.mjs**: 공통 기본 설정
   - Nx 플러그인 설정
   - 모듈 경계 규칙 (`@nx/enforce-module-boundaries`)
   - TypeScript/JavaScript 공통 규칙

2. **eslint.config.mjs**: 루트 설정
   - `eslint.base.config.mjs` 상속
   - 루트 레벨 ignores
   - 테스트 프로젝트 전용 규칙

### 사용법

각 프로젝트의 환경에 맞는 설정을 상속:

```javascript
// Node.js 프로젝트 (NestJS, 라이브러리, 테스트)
// 프로젝트별 eslint.config.mjs 파일이 없으면 루트 설정 자동 사용

// React 프로젝트 (Next.js 등)
// reelnote-frontend/eslint.config.mjs
import baseConfig from '../eslint.base.config.mjs';
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
    ...baseConfig,
    {
        plugins: {
            "react-hooks": reactHooksPlugin,
        },
        rules: {
            ...reactHooksPlugin.configs.recommended.rules,
        },
    },
    {
        ignores: [/* 프로젝트별 ignores */],
    },
];
```

## Jest 설정

### 설정 파일 계층 구조

1. **jest.preset.cjs** (루트): 범용 Jest preset
   - Windows NODE_PATH 문제 해결
   - 공통 testEnvironment, moduleFileExtensions
   - 프레임워크 특화 설정 제외

2. **jest.config.ts** (루트): IDE/에디터 통합용
   - Jest multi-project 설정
   - `getJestProjectsAsync()`로 모든 Jest 프로젝트 자동 감지

3. **tools/nestjs/jest.preset.cjs**: NestJS 전용 preset
   - 루트 preset 확장
   - SWC transform, decorator 지원
   - NestJS 프로젝트 공통 설정

### 사용법

각 프로젝트의 환경에 맞는 preset을 상속:

```javascript
// NestJS 프로젝트 (catalog-service, gateway 등)
// catalog-service/jest.config.cjs
const nestPreset = require("../../tools/nestjs/jest.preset.cjs");

module.exports = {
  ...nestPreset,
  displayName: "catalog-service",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

// 범용 Node.js 테스트 (e2e-catalog 등)
// e2e-catalog/jest.config.ts
const rootPreset = require("../../jest.preset.cjs");

export default {
  ...rootPreset,
  displayName: "e2e-catalog",
  // e2e 테스트 전용 설정
};
```

### 설계 원칙

- **범용 vs 프레임워크 특화 분리**: Jest 도구의 공통 설정은 루트에, 프레임워크 특화 설정은 `tools/` 하위에
- **CJS 포맷 통일**: Jest 설정은 CommonJS로 통일하여 import/require 혼용 문제 방지
- **확장 가능성**: `tools/spring-boot/`, `tools/python/` 등으로 확장 가능

## Kotlin 설정

### 설정 파일 계층 구조

1. **tools/kotlin/build.gradle.kts.base**: 공통 Gradle 설정
   - 모든 Kotlin 프로젝트의 공통 플러그인 (`kotlin("jvm")`, `detekt`, `ktlint`)
   - Java toolchain 설정 (Java 21)
   - 공통 저장소 설정
   - 공통 테스트 설정 (JUnit Platform)
   - 공통 lint task (`detekt`, `ktlintCheck`)

2. **tools/kotlin/detekt.yml**: 공통 코드 품질 규칙
   - 모든 Kotlin 프로젝트에서 공유하는 detekt 설정
   - 스타일, 네이밍, 성능 규칙 통일

### 사용법

각 프로젝트의 `build.gradle.kts`에서 base 설정을 상속:

```kotlin
// Spring Boot 서비스 (review-service)
// reelnote-api/review-service/build.gradle.kts
apply(from = "$rootDir/tools/kotlin/build.gradle.kts.base")

plugins {
    // Spring Boot 특화 플러그인만 추가
    kotlin("plugin.spring") version "2.0.21"
    kotlin("plugin.jpa") version "2.0.21"
    id("org.springframework.boot") version "3.5.7"
    // ...
}

dependencies {
    // 프로젝트별 의존성만
}

// E2E 테스트 프로젝트 (e2e-review)
// tests/e2e-review/build.gradle.kts
apply(from = "$rootDir/tools/kotlin/build.gradle.kts.base")

dependencies {
    // E2E 테스트 전용 의존성만
}
```

### 설계 원칙

- **공통 설정 중앙화**: Kotlin 플러그인 버전, toolchain, lint 설정을 한 곳에서 관리
- **프로젝트별 특화 분리**: Spring Boot, E2E 테스트 등 프로젝트 특화 설정은 각 프로젝트에서 관리
- **확장 가능성**: 새로운 Kotlin 프로젝트 추가 시 base만 상속하면 공통 설정 자동 적용


