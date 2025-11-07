export type Review = {
  id: number;
  userSeq: number;
  movieId: number;
  rating: number;
  reason: string;
  tags: string[];
  watchedAt: string; // ISO date
  createdAt: string; // ISO date-time
};

export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
