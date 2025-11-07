export type Movie = {
  id: number;
  title: string;
  posterPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
};

export type SearchResponse = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: Movie[];
};
