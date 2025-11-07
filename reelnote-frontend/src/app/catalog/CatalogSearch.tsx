"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryKeys, searchMovies } from "@/domains/catalog/services";
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
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 list-none p-0">
        {data?.results?.map((m) => (
          <li key={m.id} className="list-none">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{m.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs">
                  {m.releaseDate}
                </CardDescription>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
