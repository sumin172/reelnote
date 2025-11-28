import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "../../../tools/scripts/env-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configDir = resolve(__dirname);

/**
 * .env 파일 생성
 */
function writeEnvFile(filePath, env) {
  const lines = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  writeFileSync(filePath, lines, "utf-8");
}

/**
 * 환경 변수 병합
 */
function mergeEnv(baseEnv, overrideEnv) {
  return { ...baseEnv, ...overrideEnv };
}

/**
 * 메인 함수
 */
function main() {
  const mode = process.argv[2] || "local"; // local 또는 docker

  // 1. base.env 로드
  const baseEnv = parseEnvFile(resolve(configDir, "base.env"));

  // 2. override.env 로드 (도커 모드일 때만)
  let overrideEnv = {};
  if (mode === "docker") {
    const overrideFile = "e2e.docker.override.env";
    overrideEnv = parseEnvFile(resolve(configDir, overrideFile));
  }
  // 로컬 모드는 base.env만 사용

  // 3. 병합
  const mergedEnv = mergeEnv(baseEnv, overrideEnv);

  // 4. tests/.env.e2e 파일 생성
  const outputPath = resolve(__dirname, "../../.env.e2e");
  writeEnvFile(outputPath, mergedEnv);

  console.log(`✅ 환경 변수 병합 완료: ${outputPath}`);
  console.log(`   모드: ${mode}`);
  console.log(`   변수 개수: ${Object.keys(mergedEnv).length}`);
  if (mode === "docker" && Object.keys(overrideEnv).length > 0) {
    console.log(`   오버라이드 변수: ${Object.keys(overrideEnv).length}`);
  }
}

main();

