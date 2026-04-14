import path from "node:path";
import { getDefaultProjectAiConfig } from "@shared/types/project";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import { alertsTable, githubAuthTable, projectsTable } from "./schema";

function createDb(connection: Database.Database) {
  return drizzle(connection, {
    schema: {
      alertsTable,
      githubAuthTable,
      projectsTable,
    },
  });
}

type LocalDb = ReturnType<typeof createDb>;
interface TableInfoRow {
  name: string;
}

let connection: Database.Database | null = null;
let db: LocalDb | null = null;

// 库路径
function getDbPath() {
  return path.join(app.getPath("userData"), "alerts-mock-v6.sqlite");
}

// 建表句
function getSchemaSql() {
  const aiConfig = JSON.stringify(getDefaultProjectAiConfig());

  return `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      ai_config_json TEXT NOT NULL DEFAULT '${aiConfig}',
      repo_config_json TEXT NOT NULL,
      request_map_json TEXT NOT NULL,
      webhook_id TEXT NOT NULL,
      webhook_url TEXT NOT NULL,
      webhook_enabled INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      position INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      group_key TEXT NOT NULL,
      source_url TEXT,
      message TEXT NOT NULL,
      stack TEXT,
      raw_alert_json TEXT NOT NULL,
      source TEXT NOT NULL,
      environment TEXT,
      first_seen_at TEXT,
      last_seen_at TEXT,
      occurrence_count INTEGER NOT NULL,
      is_read INTEGER NOT NULL,
      read_at TEXT,
      is_synced_local INTEGER NOT NULL,
      synced_at TEXT,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS github_auth (
      id TEXT PRIMARY KEY NOT NULL,
      access_token TEXT NOT NULL,
      login TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL
    );
  `;
}

// 补字段
function ensureProjectColumns(connection: Database.Database) {
  const rows = connection
    .prepare("PRAGMA table_info(projects)")
    .all() as TableInfoRow[];
  const hasAiConfig = rows.some((row) => row.name === "ai_config_json");

  if (hasAiConfig) {
    return;
  }

  const aiConfig = JSON.stringify(getDefaultProjectAiConfig());

  connection.exec(`
    ALTER TABLE projects
    ADD COLUMN ai_config_json TEXT NOT NULL DEFAULT '${aiConfig}'
  `);
}

// 初始化库
export function initLocalDatabase() {
  if (db) {
    return db;
  }

  connection = new Database(getDbPath());
  connection.pragma("journal_mode = WAL");
  connection.exec(getSchemaSql());
  ensureProjectColumns(connection);
  db = createDb(connection);

  return db;
}

// 获取库
export function getDb() {
  if (!db) {
    return initLocalDatabase();
  }

  return db;
}

// 关闭库
export function closeLocalDatabase() {
  connection?.close();
  connection = null;
  db = null;
}
