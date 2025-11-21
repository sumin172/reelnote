import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. 장르 데이터 (TMDB 기본 장르 목록)
  // ⚠️ 중요: id는 넣지 않고 name만 넣음 (autoincrement 사용)
  const genreNames = [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Music",
    "Mystery",
    "Romance",
    "Science Fiction",
    "TV Movie",
    "Thriller",
    "War",
    "Western",
  ];

  console.log("📝 Seeding genres...");
  for (const name of genreNames) {
    await prisma.genre.upsert({
      where: { name }, // name으로 조회 (id 아님)
      update: {}, // 이미 있으면 업데이트 안 함
      create: { name }, // 없으면 생성
    });
  }
  console.log(`✅ Seeded ${genreNames.length} genres`);

  // 2. 언어 코드 데이터 (주요 언어만)
  // NOTE: 현재 스키마에 언어 테이블이 없다면, 필요시 추가
  // 예: ISO 639-1 코드 테이블 추가 후 여기서 seeding

  console.log("✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
