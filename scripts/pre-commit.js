#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const ANSI_RESET = '\x1b[0m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_RED = '\x1b[31m';
const ANSI_BLUE = '\x1b[34m';

function log(message, color = ANSI_RESET) {
  console.log(`${color}${message}${ANSI_RESET}`);
}

function execCommand(command, options = {}) {
  try {
    execSync(command, {
      stdio: 'inherit',
      encoding: 'utf-8',
      ...options,
    });
    return true;
  } catch (error) {
    return false;
  }
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .map((file) => file.trim())
      .filter((file) => file.length > 0);
  } catch (error) {
    return [];
  }
}

// Common hooks
function fixTrailingWhitespace(files) {
  if (files.length === 0) return true;

  log('🔍 Trailing whitespace 제거 중...', ANSI_BLUE);
  let hasChanges = false;

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const fixed = lines.map((line) => line.replace(/[ \t]+$/, ''));
      const newContent = fixed.join('\n');

      if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf-8');
        hasChanges = true;
      }
    } catch (error) {
      // 파일을 읽을 수 없는 경우 스킵
    }
  }

  if (hasChanges) {
    // 파일 경로에 공백이 있을 수 있으므로 따옴표로 감싸기
    files.forEach((file) => {
      execCommand(`git add "${file}"`);
    });
    log('✅ Trailing whitespace 제거 완료', ANSI_GREEN);
  }

  return true;
}

function fixEndOfFile(files) {
  if (files.length === 0) return true;

  log('🔍 End of file 수정 중...', ANSI_BLUE);
  let hasChanges = false;

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    // 바이너리 파일 스킵
    if (
      file.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip|jar|war|class)$/i)
    ) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.length === 0) continue;

      const needsNewline = !content.endsWith('\n');
      if (needsNewline) {
        fs.writeFileSync(file, content + '\n', 'utf-8');
        hasChanges = true;
      }
    } catch (error) {
      // 파일을 읽을 수 없는 경우 스킵
    }
  }

  if (hasChanges) {
    // 파일 경로에 공백이 있을 수 있으므로 따옴표로 감싸기
    files.forEach((file) => {
      execCommand(`git add "${file}"`);
    });
    log('✅ End of file 수정 완료', ANSI_GREEN);
  }

  return true;
}

function detectPrivateKey(files) {
  if (files.length === 0) return true;

  log('🔍 Private key 검사 중...', ANSI_BLUE);
  const privateKeyPatterns = [
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
    /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/i,
    /-----BEGIN\s+DSA\s+PRIVATE\s+KEY-----/i,
    /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/i,
    /["']?[Aa][Ww][Ss].*[Aa][Cc][Cc][Ee][Ss][Ss].[Kk][Ee][Yy][Ii][Dd]["']?\s*[:=]\s*["']?[A-Za-z0-9\/+=]{20,}["']?/,
    /["']?[Aa][Pp][Ii][_\-]?[Kk][Ee][Yy["']?\s*[:=]\s*["']?[A-Za-z0-9\/+=]{20,}["']?/,
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    // 이미 .env 관련 파일이나 설정 파일은 스킵
    if (
      file.match(/\.(env|key|pem|p12|pfx|jks|keystore)$/i) ||
      file.includes('.env') ||
      file.includes('private') ||
      file.includes('secret')
    ) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of privateKeyPatterns) {
        if (pattern.test(content)) {
          log(`❌ Private key가 감지되었습니다: ${file}`, ANSI_RED);
          log('   보안상 커밋할 수 없습니다.', ANSI_RED);
          return false;
        }
      }
    } catch (error) {
      // 파일을 읽을 수 없는 경우 스킵
    }
  }

  log('✅ Private key 검사 완료', ANSI_GREEN);
  return true;
}

// Language-specific linting은 CI/CD에서 처리합니다.
// 이유:
// 1. 모든 개발자의 환경에 도구 설치가 필요 없음 (Windows/Mac/Linux 모두 지원)
// 2. Pre-commit은 빠르게 실행되어야 함
// 3. CI에서 일관된 환경으로 검사 가능
//
// TypeScript/JavaScript: nx run frontend:eslint:lint 또는 CI에서 실행
// Kotlin: Gradle에서 ktlint 실행 또는 CI에서 실행

// Main function
function main() {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    log('📝 변경된 파일이 없습니다.', ANSI_BLUE);
    process.exit(0);
  }

  log(`🔍 Pre-commit: ${stagedFiles.length}개 파일 검사 중...`, ANSI_BLUE);

  // Common hooks
  if (!fixTrailingWhitespace(stagedFiles)) {
    process.exit(1);
  }

  if (!fixEndOfFile(stagedFiles)) {
    process.exit(1);
  }

  if (!detectPrivateKey(stagedFiles)) {
    process.exit(1);
  }

  // Language-specific linting은 CI에서 처리
  // Pre-commit은 최소한의 공통 검사만 수행하여 모든 개발 환경에서 동작하도록 함

  log('✅ Pre-commit 검사 완료!', ANSI_GREEN);
  process.exit(0);
}

main();
