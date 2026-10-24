-- Silent SOS Initial Database Migration
-- PostgreSQL DDL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS "emergency_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "relationship" VARCHAR(100) DEFAULT 'Other',
    "is_sos_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_contact_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_contacts_user_id" ON "emergency_contacts"("user_id");

-- 3. SOS Settings Table
CREATE TABLE IF NOT EXISTS "sos_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL UNIQUE,
    "countdown" INTEGER NOT NULL DEFAULT 5,
    "practice_mode" BOOLEAN NOT NULL DEFAULT false,
    "custom_message" TEXT,
    "region" VARCHAR(10) NOT NULL DEFAULT 'US',
    "include_location" BOOLEAN NOT NULL DEFAULT true,
    "include_audio" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. SOS Emergency History Table
CREATE TABLE IF NOT EXISTS "sos_history" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "trigger_method" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "status" VARCHAR(50) NOT NULL DEFAULT 'sent',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_history_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_history_user_id" ON "sos_history"("user_id");
CREATE INDEX IF NOT EXISTS "idx_history_timestamp" ON "sos_history"("timestamp");

-- 5. Support Resources Table
CREATE TABLE IF NOT EXISTS "support_resources" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'hotline',
    "region" VARCHAR(10) NOT NULL DEFAULT 'US',
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_resources_region" ON "support_resources"("region");

-- 6. User Sessions Table
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL UNIQUE,
    "ip_address" VARCHAR(100),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "user_sessions"("user_id");
