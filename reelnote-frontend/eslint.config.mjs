// Frontend ESLint configuration
// Extends base config and adds React Hooks plugin
import baseConfig from "../eslint.base.config.mjs";
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
    // 컴포넌트 파일에서 apiFetch 직접 사용 금지
    // 도메인 서비스 파일은 예외 (서비스 레이어에서만 apiFetch 호출 허용)
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      // domains 폴더는 포함하되 services.ts는 제외
      "src/domains/**/*.{ts,tsx}",
    ],
    ignores: ["**/domains/**/services.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/api/client",
              importNames: ["apiFetch"],
              message:
                "컴포넌트에서는 apiFetch를 직접 사용하지 마세요. domains/{domain}/services.ts의 서비스 함수를 사용하세요.",
            },
          ],
        },
      ],
    },
  },
  {
    // 도메인 서비스 파일은 apiFetch 사용 허용
    files: ["src/domains/**/services.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // 테스트 파일과 Storybook에서는 apiFetch 사용 허용
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/mockServiceWorker.js",
    ],
  },
];
