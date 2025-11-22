-- Revoke public schema creation from PUBLIC
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Create application roles
CREATE ROLE review_app LOGIN PASSWORD 'review_1106'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

CREATE ROLE catalog_app LOGIN PASSWORD 'catalog_1106'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- Create owner roles (non-login)
CREATE ROLE db_owner_review NOLOGIN;
CREATE ROLE db_owner_catalog NOLOGIN;

-- Create review_db database
CREATE DATABASE review_db OWNER db_owner_review;
REVOKE CONNECT ON DATABASE review_db FROM PUBLIC;
GRANT CONNECT ON DATABASE review_db TO review_app;

-- Create catalog_db database
CREATE DATABASE catalog_db OWNER db_owner_catalog;
REVOKE CONNECT ON DATABASE catalog_db FROM PUBLIC;
GRANT CONNECT ON DATABASE catalog_db TO catalog_app;

-- Create catalog_db_shadow database
CREATE DATABASE catalog_db_shadow OWNER db_owner_catalog;
REVOKE CONNECT ON DATABASE catalog_db_shadow FROM PUBLIC;
GRANT CONNECT ON DATABASE catalog_db_shadow TO catalog_app;

