'use client';

import React, { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  // QueryClient를 컴포넌트 내부에서 생성하여 확실히 클라이언트에서만 실행되도록 함
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  React.useEffect(() => {
    // MSW 초기화 (에러가 발생해도 애플리케이션에 영향을 주지 않음)
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/msw')
        .then(({ initializeMSW, createHandlers }) => initializeMSW(createHandlers()))
        .catch((error) => console.warn('MSW 초기화 실패:', error));
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}


