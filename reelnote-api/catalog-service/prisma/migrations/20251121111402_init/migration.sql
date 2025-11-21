-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "movie" (
    "tmdb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "original_title" TEXT NOT NULL,
    "year" INTEGER,
    "runtime" INTEGER,
    "language" TEXT,
    "country" TEXT,
    "poster_path" TEXT,
    "popularity" DOUBLE PRECISION,
    "vote_avg" DOUBLE PRECISION,
    "vote_cnt" INTEGER,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_json" JSONB NOT NULL,
    "source_hash" TEXT,
    "source_updated_at" TIMESTAMP(3),

    CONSTRAINT "movie_pkey" PRIMARY KEY ("tmdb_id")
);

-- CreateTable
CREATE TABLE "genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_genre" (
    "tmdb_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "movie_genre_pkey" PRIMARY KEY ("tmdb_id","genre_id")
);

-- CreateTable
CREATE TABLE "keyword" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_keyword" (
    "tmdb_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,

    CONSTRAINT "movie_keyword_pkey" PRIMARY KEY ("tmdb_id","keyword_id")
);

-- CreateTable
CREATE TABLE "person" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tmdb_person_id" INTEGER,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_cast" (
    "tmdb_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "character" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "movie_cast_pkey" PRIMARY KEY ("tmdb_id","person_id")
);

-- CreateTable
CREATE TABLE "movie_crew" (
    "tmdb_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "job" TEXT NOT NULL,
    "department" TEXT,

    CONSTRAINT "movie_crew_pkey" PRIMARY KEY ("tmdb_id","person_id","job")
);

-- CreateTable
CREATE TABLE "movie_feature" (
    "tmdb_id" INTEGER NOT NULL,
    "tags_weight" JSONB,
    "embedding" vector,
    "sentiment_stats" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_feature_pkey" PRIMARY KEY ("tmdb_id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "user_id" TEXT NOT NULL,
    "tag_pref" JSONB,
    "embedding" vector,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genre_name_key" ON "genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_name_key" ON "keyword"("name");

-- CreateIndex
CREATE UNIQUE INDEX "person_tmdb_person_id_key" ON "person"("tmdb_person_id");

-- AddForeignKey
ALTER TABLE "movie_genre" ADD CONSTRAINT "movie_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_genre" ADD CONSTRAINT "movie_genre_tmdb_id_fkey" FOREIGN KEY ("tmdb_id") REFERENCES "movie"("tmdb_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_keyword" ADD CONSTRAINT "movie_keyword_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_keyword" ADD CONSTRAINT "movie_keyword_tmdb_id_fkey" FOREIGN KEY ("tmdb_id") REFERENCES "movie"("tmdb_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_tmdb_id_fkey" FOREIGN KEY ("tmdb_id") REFERENCES "movie"("tmdb_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_crew" ADD CONSTRAINT "movie_crew_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_crew" ADD CONSTRAINT "movie_crew_tmdb_id_fkey" FOREIGN KEY ("tmdb_id") REFERENCES "movie"("tmdb_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_feature" ADD CONSTRAINT "movie_feature_tmdb_id_fkey" FOREIGN KEY ("tmdb_id") REFERENCES "movie"("tmdb_id") ON DELETE CASCADE ON UPDATE CASCADE;
