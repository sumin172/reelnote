-- Setup catalog_db_shadow schema and permissions
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION db_owner_catalog;

ALTER ROLE catalog_app IN DATABASE catalog_db_shadow SET search_path = app, public;

GRANT USAGE, CREATE ON SCHEMA app TO catalog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO catalog_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA app TO catalog_app;

ALTER DEFAULT PRIVILEGES FOR ROLE db_owner_catalog IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO catalog_app;

ALTER DEFAULT PRIVILEGES FOR ROLE db_owner_catalog IN SCHEMA app
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO catalog_app;

-- Create pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

