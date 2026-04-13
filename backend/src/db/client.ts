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

type DatabaseClient = ReturnType<
  typeof drizzle<{
    alertsTable: typeof alertsTable;
    projectsTable: typeof projectsTable;
  }>
>;

let db: DatabaseClient | null = null;
let schemaReady: Promise<void> | null = null;

// 环境标记
export function hasDatabaseUrl() {
  return !!process.env.DATABASE_URL?.trim();
}

// 取实例
export function getDb() {
  if (db) {
    return db;
  }

  const client = postgres(getDatabaseUrl(), {
    max: 5,
  });

  db = drizzle(client, {
    schema: {
      alertsTable,
      projectsTable,
    },
  });

  return db;
}

// 建表
export function ensureSchema() {
  if (schemaReady) {
    return schemaReady;
  }

  schemaReady = (async () => {
    const db = getDb();

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
      DROP INDEX IF EXISTS idx_alerts_project_group_key;
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_project_group_key
      ON alerts(project_id, group_key);
    `);
  })();

  return schemaReady;
}
