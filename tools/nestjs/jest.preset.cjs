// NestJS Jest preset
// 루트 preset을 확장하고 NestJS 특화 설정 추가 (SWC, decorator 등)
const { readFileSync } = require('fs');
const { join } = require('path');
const rootPreset = require('../../jest.preset.cjs');

// 공통 SWC 설정 로드
const swcJestConfig = JSON.parse(
  readFileSync(join(__dirname, '.spec.swcrc'), 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  ...rootPreset,
  // NestJS 특화 설정
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // testEnvironment는 루트에서 'node'로 설정되어 있으므로 그대로 사용
};

