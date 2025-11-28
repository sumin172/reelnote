#!/bin/bash
set -euo pipefail

# E2E 테스트용 데이터베이스 설정
# catalog_e2e_db와 review_e2e_db로 분리

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<'EOSQL'
DO
$$
BEGIN
    -- Catalog Service 역할 생성
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'catalog_app') THEN
        CREATE ROLE catalog_app LOGIN PASSWORD 'catalog_app';
    ELSE
        ALTER ROLE catalog_app WITH LOGIN PASSWORD 'catalog_app';
    END IF;

    -- Review Service 역할 생성
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'review_app') THEN
        CREATE ROLE review_app LOGIN PASSWORD 'review_app';
    ELSE
        ALTER ROLE review_app WITH LOGIN PASSWORD 'review_app';
    END IF;
END
$$;

-- Catalog E2E 데이터베이스 생성
SELECT format('CREATE DATABASE %I OWNER catalog_app TEMPLATE template0 ENCODING ''UTF8''', 'catalog_e2e_db')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'catalog_e2e_db');
\gexec

-- Review E2E 데이터베이스 생성
SELECT format('CREATE DATABASE %I OWNER review_app TEMPLATE template0 ENCODING ''UTF8''', 'review_e2e_db')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'review_e2e_db');
\gexec
EOSQL

# catalog_e2e_db 데이터베이스에 스키마 및 권한 설정
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname catalog_e2e_db <<'EOSQL'
-- app 스키마 생성 (확장 설치 전에 먼저 생성)
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_namespace WHERE nspname = 'app') THEN
        CREATE SCHEMA app AUTHORIZATION catalog_app;
    END IF;
END
$$;

-- Vector 확장 설치 (Catalog Service용)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA app;
ALTER EXTENSION vector SET SCHEMA app;

-- 권한 설정
GRANT ALL ON SCHEMA app TO catalog_app;
ALTER ROLE catalog_app SET search_path TO app, public;
ALTER DATABASE catalog_e2e_db SET search_path TO app, public;
GRANT ALL PRIVILEGES ON DATABASE catalog_e2e_db TO catalog_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO catalog_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO catalog_app;

-- 스키마 생성 확인
SELECT 'app 스키마 생성 완료' AS status, nspname AS schema_name
FROM pg_namespace WHERE nspname = 'app';
EOSQL

# review_e2e_db 데이터베이스에 스키마 및 권한 설정
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname review_e2e_db <<'EOSQL'
-- app 스키마 생성
DO
$$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_namespace WHERE nspname = 'app') THEN
        CREATE SCHEMA app AUTHORIZATION review_app;
    END IF;
END
$$;

-- 권한 설정
GRANT ALL ON SCHEMA app TO review_app;
ALTER ROLE review_app SET search_path TO app, public;
ALTER DATABASE review_e2e_db SET search_path TO app, public;
GRANT ALL PRIVILEGES ON DATABASE review_e2e_db TO review_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO review_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO review_app;

-- 스키마 생성 확인
SELECT 'app 스키마 생성 완료' AS status, nspname AS schema_name
FROM pg_namespace WHERE nspname = 'app';
EOSQL

