/**
 * OpenAPI 스키마 생성 모드 확인 헬퍼
 *
 * OpenAPI 스키마 생성 시에는 환경 변수 검증, DB 연결 등을 건너뛰어야 합니다.
 * 이 헬퍼를 통해 스키마 생성 모드인지 일관되게 확인할 수 있습니다.
 *
 * ⚠️ 주의: 프로덕션 환경에서는 이 플래그가 절대 설정되지 않아야 합니다.
 * CI/CD 파이프라인에서 이 값이 설정되지 않았는지 확인하세요.
 *
 * @returns 스키마 생성 모드인지 여부
 */
export const isSchemaGeneration = (): boolean => {
  return process.env.SKIP_ENV_VALIDATION === "true";
};
