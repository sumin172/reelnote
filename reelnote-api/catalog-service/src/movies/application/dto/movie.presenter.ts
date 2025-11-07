import { MovieSnapshot } from '../../domain/movie';
import { MovieResponseDto } from '../../dto/movie.dto';

export class MoviePresenter {
  static toResponse(snapshot: MovieSnapshot): MovieResponseDto {
    return {
      tmdbId: snapshot.tmdbId,
      title: snapshot.title,
      originalTitle: snapshot.originalTitle,
      year: snapshot.year,
      runtime: snapshot.runtime,
      language: snapshot.language,
      country: snapshot.country,
      posterPath: snapshot.posterPath,
      popularity: snapshot.popularity,
      voteAvg: snapshot.voteAvg,
      voteCnt: snapshot.voteCnt,
      syncedAt: snapshot.syncedAt,
      genres: [...snapshot.genres],
      keywords: [...snapshot.keywords],
    };
  }
}

