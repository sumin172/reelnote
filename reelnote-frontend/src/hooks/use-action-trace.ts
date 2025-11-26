"use client";

import { useActionContext } from "@/lib/action/action-context";
import { generateActionId } from "@/lib/action/id-generator";

/**
 * useActionTrace
 *
 * 사용자 액션 단위로 actionId를 관리하는 훅입니다.
 *
 * 사용 예시:
 * ```tsx
 * const { startAction } = useActionTrace();
 *
 * const handleSubmit = async () => {
 *   const actionId = startAction(); // 새 액션 시작
 *   // 이제 이 액션의 모든 API 호출이 같은 actionId 사용
 *   await searchMovies(...);
 *   await createReview(...);
 * };
 * ```
 *
 * 제약사항:
 * - 전역에 "현재 활성 액션 하나"만 관리합니다.
 * - 동시에 여러 액션이 진행되면, 나중에 시작된 액션이 이전 액션의 actionId를 덮어씁니다.
 * - 이는 의도된 동작이며, 현재 UX에서는 동시에 여러 긴 액션을 돌리지 않는다는 전제입니다.
 *
 * @throws {Error} ActionProvider 밖에서 호출된 경우
 */
export function useActionTrace() {
  const { setActionId } = useActionContext();

  return {
    /**
     * 새 사용자 액션을 시작합니다.
     *
     * @returns 새로 생성된 actionId
     */
    startAction: (): string => {
      const newActionId = generateActionId();
      setActionId(newActionId);
      return newActionId;
    },
  };
}
