import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const [relativeProjectPath, ...gradleArgs] = process.argv.slice(2);

if (!relativeProjectPath || gradleArgs.length === 0) {
  console.error(
    "Usage: node tools/scripts/run-gradlew.mjs <projectPath> <gradle-commands...>",
  );
  process.exit(1);
}

// 프로젝트 경로를 모듈 이름으로 변환
const projectPathToModuleName = (path) => {
  const normalizedPath = path.replace(/\\/g, "/");
  if (normalizedPath === "reelnote-api/review-service" || normalizedPath.endsWith("/review-service")) {
    return ":review-service";
  }
  if (normalizedPath === "tests/e2e-review" || normalizedPath.endsWith("/e2e-review")) {
    return ":e2e-review";
  }
  // 알 수 없는 경로인 경우 경고하고 원래 경로 사용
  console.warn(`Warning: Unknown project path "${path}", using as-is`);
  return path;
};

const workspaceRoot = resolve(process.cwd());
const gradlewExecutable = join(
  workspaceRoot,
  process.platform === "win32" ? "gradlew.bat" : "gradlew",
);

// 프로젝트 경로를 모듈 이름으로 변환
const moduleName = projectPathToModuleName(relativeProjectPath);

// Gradle 태스크에 모듈 이름을 접두사로 추가
const modulePrefixedArgs = gradleArgs.map((arg) => {
  // 이미 모듈 접두사가 있거나 특수 옵션인 경우 그대로 사용
  if (arg.startsWith("-") || arg.startsWith(":") || arg.includes("=")) {
    return arg;
  }
  // 태스크 이름에 모듈 접두사 추가
  return `${moduleName}:${arg}`;
});

const result = spawnSync(
  gradlewExecutable,
  modulePrefixedArgs,
  process.platform === "win32"
    ? {
        stdio: "inherit",
        cwd: workspaceRoot,
        shell: true,
        env: process.env, // 환경 변수 명시적 전달
      }
    : {
        stdio: "inherit",
        cwd: workspaceRoot,
        shell: false,
        env: process.env, // 환경 변수 명시적 전달
      },
);

if (result.error) {
  console.error(result.error);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

