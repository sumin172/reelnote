'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type AppProvidersProps = {
  children: React.ReactNode;
};

// Create a single QueryClient instance per app load
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      // React Query의 재시도 로직을 apiFetch와 조화롭게 설정
      retry: (failureCount, error: any) => {
        // 인증 에러(401, 403)는 재시도하지 않음
        if (error?.status === 401 || error?.status === 403) return false;
        // 클라이언트 에러(4xx)는 재시도하지 않음
        if (error?.status >= 400 && error?.status < 500) return false;
        // 서버 에러(5xx)는 최대 3번까지 재시도
        if (error?.status >= 500) return failureCount < 3;
        // 네트워크 에러 등은 1번만 재시도
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export function AppProviders({ children }: AppProvidersProps) {
  const [mswReady, setMswReady] = React.useState<boolean>(true);

  React.useEffect(() => {
    // 개발 환경에서만 MSW 초기화
    if (process.env.NODE_ENV === 'development') {
      let cancelled = false;
      (async () => {
        try {
          const { initializeMSW, createHandlers } = await import('@/lib/msw');
          await initializeMSW(createHandlers());
        } catch (error) {
          console.warn('MSW 초기화 실패:', error);
        }
        if (!cancelled) setMswReady(true);
      })();
      return () => {
        cancelled = true;
      };
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}


