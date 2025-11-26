"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent, CompositionEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryKeys, searchMovies } from "@/domains/catalog/services";
import type { CatalogMovie, SearchResponse } from "@/domains/catalog/types";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDebouncedValue } from "@/lib/hooks/useDebounce";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { handleError, getUserMessage } from "@/lib/errors/error-utils";
import { ErrorState } from "@/domains/shared/components/state/Error";
import { ApiError } from "@/lib/api/client";

export default function CatalogSearch() {
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [committedQuery, setCommittedQuery] = useState("");
  const debouncedQuery = useDebouncedValue(committedQuery, 400);
  const canSearch = !isComposing && debouncedQuery.trim().length > 0;
  const handleErrorSideEffects = useErrorHandler();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setInputValue(value);
    if (!isComposing) {
      setCommittedQuery(value);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setIsComposing(false);
    setInputValue(value);
    setCommittedQuery(value);
  };

  const { data, isFetching, isError, error, refetch } =
    useQuery<SearchResponse>({
      queryKey: catalogQueryKeys.search({ q: debouncedQuery, page: 1 }),
      queryFn: ({ signal }) => searchMovies(debouncedQuery, 1, { signal }),
      enabled: canSearch,
      staleTime: 1000 * 30,
    });

  // React Query v5에서는 onError가 제거되었으므로 useEffect로 처리
  useEffect(() => {
    if (error) {
      handleErrorSideEffects(error);
    }
  }, [error, handleErrorSideEffects]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">카탈로그 검색</h1>
      <Input
        placeholder="영화 제목을 입력하세요"
        value={inputValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
      {isFetching && (
        <div className="text-sm text-muted-foreground">검색 중...</div>
      )}
      {isError && (
        <>
          {error instanceof ApiError ? (
            (() => {
              const handled = handleError(error);
              return (
                <ErrorState
                  message={handled.message}
                  traceId={handled.traceId}
                  retryable={handled.retryable}
                  onRetryAction={() => refetch()}
                  errorCode={
                    process.env.NODE_ENV !== "production"
                      ? handled.errorCode
                      : undefined
                  }
                />
              );
            })()
          ) : (
            <ErrorState message={getUserMessage(error)} />
          )}
        </>
      )}
      {data && !isError && (
        <div className="space-y-6">
          <SearchSection
            title="카탈로그"
            movies={data.local}
            emptyMessage="로컬 카탈로그에 등록된 결과가 없습니다."
          />
          <SearchSection
            title="TMDB"
            movies={data.tmdb}
            emptyMessage="TMDB에서 일치하는 결과를 찾지 못했습니다."
          />
        </div>
      )}
    </div>
  );
}

type SearchSectionProps = {
  title: string;
  movies: CatalogMovie[];
  emptyMessage: string;
};

function SearchSection({ title, movies, emptyMessage }: SearchSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {movies.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 list-none p-0">
          {movies.map((movie) => (
            <li key={`${title}-${movie.tmdbId}`} className="list-none">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm line-clamp-2">
                    {movie.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    {movie.year ?? "연도 정보 없음"}
                  </CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
