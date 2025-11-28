import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnvToProcess } from "./env-loader.mjs";

// 루트 경로 찾기 (nx.json 또는 package.json이 있는 디렉토리)
function findRootPath(startPath = process.cwd()) {
  let current = resolve(startPath);
  const root = resolve("/");

  while (current !== root) {
    if (existsSync(resolve(current, "nx.json")) || existsSync(resolve(current, "package.json"))) {
      return current;
    }
    current = resolve(current, "..");
  }

  return startPath; // 찾지 못하면 현재 경로 반환
}

const root = findRootPath();
const envFile = process.argv[2];
const command = process.argv.slice(3);

if (!envFile) {
  console.error("Usage: node run-with-env.mjs <env-file> <command> [args...]");
  process.exit(1);
}

if (command.length === 0) {
  console.error("No command provided");
  process.exit(1);
}

// .env 파일 경로 확인 (항상 루트 경로 기준)
const envFilePath = resolve(root, envFile);
if (!existsSync(envFilePath)) {
  console.warn(`Warning: ${envFile} not found, continuing without it`);
} else {
  // .env 파일 파싱 및 환경 변수 설정 (기존 값이 있으면 덮어쓰지 않음)
  loadEnvToProcess(envFilePath, { overwrite: false });
}

// 명령 실행
const [cmd, ...args] = command;
const result = spawnSync(cmd, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

if (result.error) {
  console.error(`Error: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);

