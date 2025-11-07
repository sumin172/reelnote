import { Injectable } from '@nestjs/common';
import { TmdbService } from '../../../tmdb/tmdb.service';
import { MovieExternalPort } from '../../domain/ports/movie-external.port';
import { TmdbMoviePayload } from '../../domain/movie.factory';

@Injectable()
export class TmdbMovieGateway extends MovieExternalPort {
  constructor(private readonly tmdbService: TmdbService) {
    super();
  }

  fetchMovieDetail(tmdbId: number, language: string): Promise<TmdbMoviePayload> {
    return this.tmdbService.getMovieDetail(tmdbId, language) as Promise<TmdbMoviePayload>;
  }
}


