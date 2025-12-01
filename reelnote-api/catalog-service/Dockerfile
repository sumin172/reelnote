# Catalog Service Dockerfile
# Node.js 24 LTS 기반 NestJS 서비스
# 모노레포 구조를 고려한 빌드

# 빌드 스테이지
FROM node:24-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@10.22.0

# 루트 package.json과 pnpm-lock.yaml 복사 (모노레포 의존성)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json ./

# Nx 설정 복사
COPY tools/ ./tools/

# TypeScript 설정 파일 복사 (빌드에 필요)
COPY tsconfig.base.json tsconfig.node.json tsconfig.json ./

# Catalog Service 의존성 설치
COPY reelnote-api/catalog-service/package.json ./reelnote-api/catalog-service/
COPY reelnote-api/catalog-service/prisma ./reelnote-api/catalog-service/prisma/
COPY reelnote-api/catalog-service/project.json ./reelnote-api/catalog-service/

# 의존성 설치 (루트에서)
RUN pnpm install --frozen-lockfile

# Prisma 클라이언트 생성
RUN pnpm --filter catalog-service exec prisma generate

# 소스 코드 복사
COPY reelnote-api/catalog-service/ ./reelnote-api/catalog-service/

# 빌드 실행
RUN pnpm nx build catalog-service --configuration=production

# 런타임 스테이지
FROM node:24-alpine AS runtime

WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm@10.22.0

# 빌드된 파일과 의존성만 복사
COPY --from=builder /app/reelnote-api/catalog-service/dist ./dist
COPY --from=builder /app/reelnote-api/catalog-service/package.json ./package.json
COPY --from=builder /app/reelnote-api/catalog-service/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# 포트 노출
EXPOSE 4100

# 헬스체크 (curl 설치)
RUN apk add --no-cache curl

# 실행 - Nx @nx/js:swc executor는 항상 dist/src/main.js로 출력
# 플랫폼 독립적: Windows/Mac/Linux 모두 동일하게 동작
# generatePackageJson: true지만, ESM 모듈이므로 직접 경로 사용이 더 안전
CMD ["node", "dist/src/main.js"]

