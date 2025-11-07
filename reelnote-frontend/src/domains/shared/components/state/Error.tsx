"use client";

type ErrorStateProps = {
  message?: string;
};

export function ErrorState({
  message = "오류가 발생했습니다.",
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-destructive">
      {message}
    </div>
  );
}
