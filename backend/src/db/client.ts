import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { alertsTable, projectsTable } from "./schema";

// 读取地址
function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.");
  }

  return databaseUrl;
}

// 建客户端
const client = postgres(getDatabaseUrl(), {
  max: 5,
});

export const db = drizzle(client, {
  schema: {
    alertsTable,
    projectsTable,
  },
});

// 建表
export async function ensureSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      webhook_id TEXT NOT NULL UNIQUE,
      webhook_url TEXT NOT NULL,
      webhook_enabled BOOLEAN NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      group_key TEXT NOT NULL,
      source_url TEXT,
      message TEXT NOT NULL,
      stack TEXT,
      raw_alert_json TEXT NOT NULL,
      source TEXT NOT NULL,
      environment TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL,
      is_read BOOLEAN NOT NULL,
      read_at TEXT,
      is_synced_local BOOLEAN NOT NULL,
      synced_at TEXT,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await db.execute(sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS raw_alert_json TEXT;
  `);

  await db.execute(sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
  `);

  await db.execute(sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS read_at TEXT;
  `);

  await db.execute(sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS is_synced_local BOOLEAN DEFAULT FALSE;
  `);

  await db.execute(sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS synced_at TEXT;
  `);

  await db.execute(sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS detail_json TEXT;
  `);

  await db.execute(sql`
    UPDATE alerts
    SET raw_alert_json = COALESCE(raw_alert_json, '{}');
  `);

  await db.execute(sql`
    UPDATE alerts
    SET is_read = COALESCE(is_read, FALSE);
  `);

  await db.execute(sql`
    UPDATE alerts
    SET is_synced_local = COALESCE(is_synced_local, FALSE);
  `);

  await db.execute(sql`
    UPDATE alerts
    SET detail_json = COALESCE(detail_json, '{}');
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_alerts_project_id
    ON alerts(project_id);
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_project_group_key
    ON alerts(project_id, group_key);
  `);
}
