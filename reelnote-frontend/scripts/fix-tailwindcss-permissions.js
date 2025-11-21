const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const filePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@tailwindcss",
  ".ignored_postcss",
);

if (fs.existsSync(filePath)) {
  try {
    // Windows에서는 attrib 명령어 사용
    if (process.platform === "win32") {
      execSync(`attrib +R "${filePath}"`, { stdio: "ignore" });
    } else {
      // Unix/Linux/Mac에서는 chmod 사용
      fs.chmodSync(filePath, 0o444);
    }
    console.log("✓ .ignored_postcss 파일을 읽기 전용으로 설정했습니다.");
  } catch (error) {
    // 에러가 발생해도 설치를 중단하지 않음
    console.warn(
      "⚠ .ignored_postcss 파일 권한 설정 실패 (무시됨):",
      error.message,
    );
  }
}
