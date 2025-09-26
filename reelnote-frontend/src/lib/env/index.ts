/**
 * 환경 변수 설정
 * 단순하고 실용적인 환경 변수 관리
 */

// 환경 감지
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// 환경 변수 검증 함수 (지연 실행)
function validateRequiredEnvVars() {
  if (isDevelopment) {
    const requiredVars = ['NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_APP_NAME', 'NEXT_PUBLIC_APP_VERSION'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error(`❌ 필수 환경 변수가 누락되었습니다: ${missing.join(', ')}`);
      throw new Error(`필수 환경 변수 누락: ${missing.join(', ')}`);
    }
  }
}

// 환경 변수에 대한 안전한 접근자 함수들
function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) {
    console.warn('⚠️ NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다. 기본값을 사용합니다.');
    return 'http://localhost:8080';
  }
  return value;
}

function getAppName(): string {
  const value = process.env.NEXT_PUBLIC_APP_NAME;
  if (!value) {
    console.warn('⚠️ NEXT_PUBLIC_APP_NAME이 설정되지 않았습니다. 기본값을 사용합니다.');
    return 'ReelNote';
  }
  return value;
}

function getAppVersion(): string {
  const value = process.env.NEXT_PUBLIC_APP_VERSION;
  if (!value) {
    console.warn('⚠️ NEXT_PUBLIC_APP_VERSION이 설정되지 않았습니다. 기본값을 사용합니다.');
    return '0.1.0';
  }
  return value;
}

export const config = {
  // API 설정 (안전한 접근자 사용)
  get apiBaseUrl() { return getApiBaseUrl(); },
  
  // MSW 설정 (개발 환경에서만)
  get enableMSW() { return process.env.NEXT_PUBLIC_ENABLE_MSW === 'true' && isDevelopment; },
  
  // 사용자 설정
  get userSeq() { 
    const value = process.env.NEXT_PUBLIC_USER_SEQ;
    return value ? parseInt(value, 10) : null;
  },
  
  // 앱 설정 (안전한 접근자 사용)
  get appName() { return getAppName(); },
  get appVersion() { return getAppVersion(); },
  
  // 환경 설정
  isDevelopment,
  isProduction,
  isTest,
  environment: process.env.NODE_ENV,
} as const;

/**
 * MSW 활성화 여부 (개발 환경에서만)
 */
export const isMSWEnabled = config.enableMSW;