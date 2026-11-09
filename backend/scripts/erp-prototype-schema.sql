-- Schema for sales-service and service-service, in the shared
-- ERP_Prototype Postgres database. Table/column names match what
-- Hibernate's default (Spring) naming strategy expects from the Lead and
-- CaseRecord entities untouched - ddl-auto is set to `validate`, not
-- `update`, so these are NOT auto-created by the apps; run this once
-- against a fresh database before starting them.
--
-- Usage:
--   psql -h <host> -p <port> -U postgres -d ERP_Prototype -f erp-prototype-schema.sql

CREATE TABLE IF NOT EXISTS lead (
    id         VARCHAR(255) PRIMARY KEY,
    name       VARCHAR(255),
    stage      VARCHAR(255),
    amount     NUMERIC,
    converted  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS case_record (
    id            VARCHAR(255) PRIMARY KEY,
    lead_id       VARCHAR(255),
    account_name  VARCHAR(255),
    amount        NUMERIC
);
