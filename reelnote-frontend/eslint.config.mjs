import { dirname, resolve } from "path";
import { existsSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const toolConfigCandidates = [
  resolve(__dirname, "..", "tools", "ts", "eslint.config.mjs"),
  resolve(__dirname, "..", "..", "tools", "ts", "eslint.config.mjs"),
];

let baseConfigModule;
for (const candidate of toolConfigCandidates) {
  if (existsSync(candidate)) {
    baseConfigModule = await import(pathToFileURL(candidate).href);
    break;
  }
}

if (!baseConfigModule) {
  throw new Error("Base ESLint config를 찾을 수 없습니다.");
}

const baseConfig = baseConfigModule.default;

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextConfigs = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((config) => {
    const existingPlugins = config.plugins
      ? Object.fromEntries(
          Object.entries(config.plugins).filter(
            ([name]) => name !== "@typescript-eslint",
          ),
        )
      : {};

    return {
      ...config,
      plugins: {
        ...existingPlugins,
        "react-hooks": reactHooksPlugin,
      },
    };
  });

const config = [
  // Nx base 설정 (모듈 경계 규칙 포함)
  ...baseConfig,
  // Next.js 전용 규칙
  ...nextConfigs,
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

export default config;
