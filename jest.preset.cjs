// Jest 범용 preset
// Windows NODE_PATH 문제 해결 및 공통 설정만 포함
// 프레임워크 특화 설정은 tools/ 하위에 별도로 관리

// Windows 환경에서 Nx가 설정하는 과도하게 긴 NODE_PATH로 인해
// Jest 워커 프로세스 생성 시 명령줄/환경 블록 길이 제한을 초과하는 문제를 방지
// Jest는 tsconfig.json의 paths, baseUrl, moduleResolution을 통해 모듈을 찾을 수 있으므로
// NODE_PATH가 없어도 정상 동작함
if (process.platform === 'win32' && process.env.NODE_PATH) {
  delete process.env.NODE_PATH;
}

const nxPreset = require('@nx/jest/preset').default;

// nxPreset을 안전하게 확장
let preset;
try {
  // 타입 가드를 명시적으로 처리하여 경고 방지
  const isFunction = typeof nxPreset === 'function';
  if (isFunction) {
    // typeof 체크 후 별도 변수에 할당하여 타입을 좁힘
    const presetFn = /** @type {() => any} */ (nxPreset);
    preset = presetFn();
  } else {
    preset = nxPreset || {};
  }
} catch (e) {
  preset = {};
}

// 안전하게 확장 - testEnvironment가 문자열인지 확인
const safePreset = { ...preset };
if (typeof safePreset.testEnvironment !== 'string') {
  delete safePreset.testEnvironment;
}

module.exports = {
  ...safePreset,
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: [
    ...(Array.isArray(safePreset.setupFilesAfterEnv) ? safePreset.setupFilesAfterEnv : []),
  ],
};

