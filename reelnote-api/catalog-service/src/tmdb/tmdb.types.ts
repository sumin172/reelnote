export interface TmdbMovieSummary {
  id: number;
}

export interface TmdbMovieListResponse {
  results?: TmdbMovieSummary[];
}
