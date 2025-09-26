/**
 * 개발 환경에서만 사용되는 유틸리티
 * 프로덕션 번들에서 제외됨
 */

import { config, isMSWEnabled } from './index';

/**
 * 환경 변수 정보 출력 (개발 환경에서만)
 */
export function logEnvInfo() {
  if (config.isDevelopment) {
    console.group('🔧 환경 변수 정보');
    console.log('📱 앱 이름:', config.appName);
    console.log('🏷️ 버전:', config.appVersion);
    console.log('🌍 환경:', config.environment);
    console.log('🔗 API URL:', config.apiBaseUrl);
    console.log('🎭 MSW 활성화:', isMSWEnabled ? '✅' : '❌');
    console.log('👤 사용자 SEQ:', config.userSeq || '없음');
    console.groupEnd();
  }
}

/**
 * 환경별 설정 검증 (개발 환경에서만)
 */
export function validateEnvConfig() {
  if (!config.isDevelopment) return;

  const issues: string[] = [];
  
  if (!config.apiBaseUrl) issues.push('API URL이 설정되지 않았습니다');
  if (!config.appName) issues.push('앱 이름이 설정되지 않았습니다');
  if (!config.appVersion) issues.push('앱 버전이 설정되지 않았습니다');
  
  if (issues.length > 0) {
    console.warn('⚠️ 환경 설정 문제:', issues);
  } else {
    console.log('✅ 환경 설정이 올바르게 구성되었습니다');
  }
}