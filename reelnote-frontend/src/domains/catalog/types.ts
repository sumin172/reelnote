export type SearchResponse = {
  page: number;
  query: string;
  local: CatalogMovie[];
  tmdb: CatalogMovie[];
};

export type CatalogMovie = {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  posterPath?: string | null;
  year?: number | null;
  source: "local" | "tmdb";
};
