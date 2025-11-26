/**
 * ActionId 생성 (UUID v4 형식)
 *
 * 사용자 액션 단위로 생성되는 상관관계 ID입니다.
 * traceId와는 별개로, 프론트엔드에서 사용자 액션을 추적하기 위해 사용합니다.
 */
export function generateActionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
