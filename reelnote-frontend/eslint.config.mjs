import { dirname, resolve } from "path";
import { existsSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
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

const config = [
  // Nx base 설정 (모듈 경계 규칙 포함)
  ...baseConfig,
  // React Hooks 플러그인 추가
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
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

export default config;
