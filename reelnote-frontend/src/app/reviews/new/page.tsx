"use client";

import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewCreateSchema, type ReviewCreateInput } from '@/domains/review/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReview, reviewQueryKeys } from '@/domains/review/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type FormValues = {
  movieId: number;
  rating: number;
  reason: string;
  tags: string[];
  watchedAt: string;
};

export default function ReviewCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolver = zodResolver(reviewCreateSchema) as unknown as Resolver<FormValues>;
  const form = useForm<FormValues>({
    resolver,
    defaultValues: { movieId: 0, rating: 5, reason: '', tags: [], watchedAt: '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ReviewCreateInput) => createReview(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all as unknown as any });
      router.push('/reviews');
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => mutate(data as ReviewCreateInput);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>리뷰 작성</CardTitle>
          <CardDescription>새로운 영화 리뷰를 작성해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="movieId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>영화 ID</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>평점 (1~5)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="5" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>리뷰 내용</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="watchedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>감상일 (YYYY-MM-DD)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? '등록 중...' : '등록'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


