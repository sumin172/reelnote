export interface MovieSnapshot {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year?: number;
  runtime?: number;
  language?: string;
  country?: string;
  posterPath?: string;
  popularity?: number;
  voteAvg?: number;
  voteCnt?: number;
  syncedAt: Date;
  sourceUpdatedAt?: Date | null;
  sourceHash?: string | null;
  genres: string[];
  keywords: string[];
  rawPayload?: unknown;
}

export class Movie {
  private constructor(private readonly props: MovieSnapshot) {}

  static hydrate(snapshot: MovieSnapshot): Movie {
    return new Movie({ ...snapshot, syncedAt: new Date(snapshot.syncedAt) });
  }

  static create(snapshot: MovieSnapshot): Movie {
    return Movie.hydrate(snapshot);
  }

  get tmdbId(): number {
    return this.props.tmdbId;
  }

  get title(): string {
    return this.props.title;
  }

  get originalTitle(): string {
    return this.props.originalTitle;
  }

  get syncedAt(): Date {
    return new Date(this.props.syncedAt);
  }

  get genres(): string[] {
    return [...this.props.genres];
  }

  get sourceUpdatedAt(): Date | undefined | null {
    return this.props.sourceUpdatedAt ? new Date(this.props.sourceUpdatedAt) : this.props.sourceUpdatedAt ?? undefined;
  }

  get sourceHash(): string | undefined | null {
    return this.props.sourceHash ?? null;
  }

  get keywords(): string[] {
    return [...this.props.keywords];
  }

  isStale(thresholdDays: number, referenceDate: Date = new Date()): boolean {
    const diffMilliseconds = referenceDate.getTime() - this.props.syncedAt.getTime();
    const diffDays = diffMilliseconds / (1000 * 60 * 60 * 24);
    return diffDays > thresholdDays;
  }

  withUpdatedSnapshot(partial: Partial<MovieSnapshot>): Movie {
    const next: MovieSnapshot = {
      ...this.props,
      ...partial,
      syncedAt: partial.syncedAt ? new Date(partial.syncedAt) : this.props.syncedAt,
      genres: partial.genres ?? this.props.genres,
      keywords: partial.keywords ?? this.props.keywords,
    };

    return Movie.hydrate(next);
  }

  toSnapshot(): MovieSnapshot {
    return {
      ...this.props,
      syncedAt: new Date(this.props.syncedAt),
      sourceUpdatedAt: this.props.sourceUpdatedAt ? new Date(this.props.sourceUpdatedAt) : this.props.sourceUpdatedAt ?? undefined,
      genres: [...this.props.genres],
      keywords: [...this.props.keywords],
    };
  }
}


