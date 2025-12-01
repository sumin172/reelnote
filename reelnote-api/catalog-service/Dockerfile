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

# 실행 스크립트 생성 (마이그레이션 실행 후 애플리케이션 시작)
# 런타임 스테이지에는 prisma 폴더가 복사되어 있으므로 직접 실행 가능
# node_modules/.bin/prisma 또는 npx를 통해 실행
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'echo "Running Prisma migrations..."' >> /app/entrypoint.sh && \
    echo 'if [ -f "/app/node_modules/.bin/prisma" ]; then' >> /app/entrypoint.sh && \
    echo '  /app/node_modules/.bin/prisma migrate deploy || echo "Migration failed or already applied"' >> /app/entrypoint.sh && \
    echo 'else' >> /app/entrypoint.sh && \
    echo '  npx prisma migrate deploy || echo "Migration failed or already applied"' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo 'echo "Starting application..."' >> /app/entrypoint.sh && \
    echo 'exec node dist/src/main.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# 실행 - 마이그레이션 후 애플리케이션 시작
CMD ["/app/entrypoint.sh"]

