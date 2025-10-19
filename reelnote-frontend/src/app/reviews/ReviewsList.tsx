"use client";

import { useQuery } from '@tanstack/react-query';
import { reviewQueryKeys, fetchReviews } from '@/domains/review/services';
import { LoadingState } from '@/domains/shared/components/state/Loading';
import { ErrorState } from '@/domains/shared/components/state/Error';
import { EmptyState } from '@/domains/shared/components/state/Empty';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReviewsList() {
  // Client component for demo simplicity
  // In real app, consider Server Components with React Query hydration when needed
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data, isLoading, isError } = useQuery({
    queryKey: reviewQueryKeys.list({ page: 0, size: 10 }),
    queryFn: () => fetchReviews({ page: 0, size: 10 }),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;

  const hasReviews = data && data.content.length > 0;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">리뷰 목록</h1>
        <Button asChild>
          <Link href="/reviews/new">새 리뷰 작성</Link>
        </Button>
      </div>
      
      {hasReviews ? (
        <div className="space-y-3">
          {data?.content.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">영화 ID: {r.movieId}</CardTitle>
                <CardDescription>#{r.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm font-medium">평점: {r.rating}</div>
                  <div className="text-sm text-muted-foreground">{r.reason}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="아직 작성된 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!" />
      )}
    </div>
  );
}
