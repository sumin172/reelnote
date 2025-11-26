"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { generateActionId } from "./id-generator";

interface ActionContextValue {
  actionId: string;
  setActionId: (id: string) => void;
}

const ActionContext = createContext<ActionContextValue | null>(null);

/**
 * ActionProvider
 *
 * 사용자 액션 단위의 상관관계 ID를 관리하는 Context Provider입니다.
 *
 * 제약사항:
 * - 전역에 "현재 활성 액션 하나"만 관리합니다.
 * - 동시에 여러 액션이 진행되는 복잡한 UX는 커버하지 않습니다.
 * - SSR 환경에서는 사용하지 않습니다 (클라이언트 전용).
 */
export function ActionProvider({ children }: { children: ReactNode }) {
  const [actionId, setActionId] = useState(() => generateActionId());

  return (
    <ActionContext.Provider value={{ actionId, setActionId }}>
      {children}
    </ActionContext.Provider>
  );
}

/**
 * useActionId
 *
 * 현재 활성 actionId를 가져옵니다.
 * ActionProvider 밖에서 호출되면 에러를 발생시킵니다 (fail-fast).
 *
 * @throws {Error} ActionProvider 밖에서 호출된 경우
 */
export function useActionId(): string {
  const ctx = useContext(ActionContext);
  if (!ctx) {
    throw new Error(
      "useActionId must be used within <ActionProvider>. Make sure to wrap your app with <ActionProvider> in app/providers.tsx",
    );
  }
  return ctx.actionId;
}

/**
 * useActionContext
 *
 * ActionContext 전체를 가져옵니다.
 * setActionId를 사용해야 할 때 사용합니다.
 *
 * @throws {Error} ActionProvider 밖에서 호출된 경우
 */
export function useActionContext(): ActionContextValue {
  const ctx = useContext(ActionContext);
  if (!ctx) {
    throw new Error(
      "useActionContext must be used within <ActionProvider>. Make sure to wrap your app with <ActionProvider> in app/providers.tsx",
    );
  }
  return ctx;
}
