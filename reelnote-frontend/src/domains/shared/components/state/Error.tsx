"use client";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  message: string; // 필수 (이미 가공된 메시지)
  traceId?: string; // 사용자 문의용으로 표시
  retryable?: boolean;
  onRetryAction?: () => void;
  errorCode?: string; // 개발 환경에서만 표시
};

export function ErrorState({
  message,
  traceId,
  retryable = false,
  onRetryAction,
  errorCode,
}: ErrorStateProps) {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="text-center">
        <p className="text-sm text-destructive">{message}</p>
        {traceId && (
          <p className="mt-2 text-xs text-muted-foreground">
            문제가 계속되면 아래 오류 ID와 함께 문의해 주세요:{" "}
            <span className="font-mono">{traceId}</span>
          </p>
        )}
        {isDevelopment && errorCode && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono">[DEV] Error Code: {errorCode}</span>
          </p>
        )}
      </div>
      {retryable && onRetryAction && (
        <Button variant="outline" size="sm" onClick={onRetryAction}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
