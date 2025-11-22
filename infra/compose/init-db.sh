#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
until psql -U postgres -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "PostgreSQL is up - executing setup script"

# Execute main setup SQL (creates databases and roles)
psql -U postgres -f /docker-entrypoint-initdb.d/01-init-roles-databases.sql

# Setup review_db
psql -U postgres -d review_db -f /docker-entrypoint-initdb.d/02-setup-review-db.sql

# Setup catalog_db
psql -U postgres -d catalog_db -f /docker-entrypoint-initdb.d/03-setup-catalog-db.sql

# Setup catalog_db_shadow
psql -U postgres -d catalog_db_shadow -f /docker-entrypoint-initdb.d/04-setup-catalog-shadow-db.sql

>&2 echo "Database setup completed"
