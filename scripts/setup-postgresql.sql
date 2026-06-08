-- =============================================================
-- TRAQQ — PostgreSQL Initial Setup
-- Run as the postgres superuser:
--   sudo -u postgres psql -f scripts/setup-postgresql.sql
-- =============================================================

-- Create the application database
CREATE DATABASE traqq_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Create the application user
-- Replace the password below with the generated value from setup-vps-env.sh
CREATE USER traqq_user WITH
    ENCRYPTED PASSWORD 'Q3SP6ncsT9FshfiICHvxUDjrIaUobcye'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    LOGIN;

-- Grant database-level access
GRANT CONNECT ON DATABASE traqq_db TO traqq_user;
GRANT ALL PRIVILEGES ON DATABASE traqq_db TO traqq_user;

-- Switch to the application database to set schema privileges
\connect traqq_db

-- PostgreSQL 15+ requires explicit schema grants
GRANT ALL ON SCHEMA public TO traqq_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO traqq_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO traqq_user;

-- Ensure future tables/sequences are accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO traqq_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO traqq_user;

-- Verify
\echo '=== Database setup complete ==='
\l traqq_db
\du traqq_user
