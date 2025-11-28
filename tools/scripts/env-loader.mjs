import { readFileSync, existsSync } from "node:fs";

/**
 * .env 파일을 파싱하여 객체로 반환
 *
 * @param {string} filePath - .env 파일 경로
 * @param {Object} options - 옵션
 * @param {boolean} options.required - 파일이 없을 때 에러를 던질지 여부 (기본값: false)
 * @returns {Record<string, string>} 환경 변수 객체
 */
export function parseEnvFile(filePath, options = {}) {
  const { required = false } = options;

  if (!existsSync(filePath)) {
    if (required) {
      throw new Error(`환경 변수 파일을 찾을 수 없습니다: ${filePath}`);
    }
    return {};
  }

  const content = readFileSync(filePath, "utf-8");
  /** @type {Record<string, string>} */
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // 주석이나 빈 줄 건너뛰기
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // KEY=VALUE 형식 파싱
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // 따옴표 제거
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

/**
 * .env 파일을 파싱하여 process.env에 로드
 *
 * @param {string} filePath - .env 파일 경로
 * @param {Object} options - 옵션
 * @param {boolean} options.required - 파일이 없을 때 에러를 던질지 여부 (기본값: false)
 * @param {boolean} options.overwrite - 기존 환경 변수를 덮어쓸지 여부 (기본값: false)
 */
export function loadEnvToProcess(filePath, options = {}) {
  const { required = false, overwrite = false } = options;

  const env = parseEnvFile(filePath, { required });

  for (const [key, value] of Object.entries(env)) {
    if (overwrite || !process.env[key]) {
      process.env[key] = String(value);
    }
  }
}

