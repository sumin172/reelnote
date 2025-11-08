# Tools Configuration Directory

이 디렉토리는 각 언어/플랫폼별 도구 설정 파일을 관리합니다.

## 구조

```
tools/
├── ts/              # TypeScript/JavaScript 도구 설정
│   ├── eslint.config.mjs
│   ├── jest.config.ts
│   ├── jest.preset.js
│   └── tsconfig.base.json
```

> **참고**: Kotlin 설정은 루트의 `.editorconfig`에 포함되어 있습니다.
> 별도 설정 파일은 현재 사용하지 않으며, 필요 시 추가할 수 있습니다.

## 공통 설정

- Nx 워크스페이스에서 공유하는 설정은 `tools/` 하위에 두고 각 프로젝트가 상속합니다.
- 새로운 언어/플랫폼 설정을 추가할 때는 하위 디렉터리를 만들고 README에 반영하세요.
- 공통 설정 업데이트 시 영향 범위를 파악하기 위해 Nx `affected` 명령어(`pnpm nx affected:test` 등)를 활용하세요.

## TypeScript 설정

- **eslint.config.mjs**: 모든 TypeScript/JavaScript 프로젝트의 공통 ESLint 규칙
- **jest.config.ts**: Jest 루트 설정 (모든 Jest 프로젝트 자동 감지)
- **jest.preset.js**: Jest 프리셋 (각 프로젝트에서 상속)
- **tsconfig.base.json**: TypeScript 컴파일러 기본 설정 (모든 프로젝트에서 상속)

### 사용법

각 프로젝트의 설정 파일에서 상대 경로로 참조:

```json
// tsconfig.json
{
  "extends": "../../tools/ts/tsconfig.base.json"
}
```

```typescript
// jest.config.ts
export default {
  preset: '../../tools/ts/jest.preset.js',
  // ...
}
```

```javascript
// eslint.config.mjs
import baseConfig from "../../tools/ts/eslint.config.mjs";
export default [...baseConfig];
```


