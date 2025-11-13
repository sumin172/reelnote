export type SearchQuery = {
  query: string;
  page?: number;
  language?: string;
};

export type SearchMovieResult = {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  posterPath?: string | null;
  year?: number | null;
  source: "local" | "tmdb";
};

export type SearchResult = {
  query: string;
  page: number;
  local: SearchMovieResult[];
  tmdb: SearchMovieResult[];
};

export abstract class SearchReadPort {
  abstract search(query: SearchQuery): Promise<SearchResult>;
}
