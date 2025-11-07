"use client";

type EmptyStateProps = {
  message?: string;
};

export function EmptyState({
  message = "데이터가 없습니다.",
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
