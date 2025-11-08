"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryKeys, searchMovies } from "@/domains/catalog/services";
import type { CatalogMovie } from "@/domains/catalog/types";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CatalogSearch() {
  const [q, setQ] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: catalogQueryKeys.search(q, 1),
    queryFn: () => searchMovies(q, 1),
    enabled: q.length > 0,
  });

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">카탈로그 검색</h1>
      <Input
        placeholder="영화 제목을 입력하세요"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {isFetching && (
        <div className="text-sm text-muted-foreground">검색 중...</div>
      )}
      {data && (
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
