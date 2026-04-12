import path from "node:path";
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

let connection: Database.Database | null = null;
let db: LocalDb | null = null;

// 库路径
function getDbPath() {
  return path.join(app.getPath("userData"), "alerts-mock-v5.sqlite");
}

// 建表句
function getSchemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      repo_config_json TEXT NOT NULL,
      request_map_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      position INTEGER NOT NULL,
      project_id TEXT NOT NULL,
      detail_json TEXT NOT NULL
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

// 初始化库
export function initLocalDatabase() {
  if (db) {
    return db;
  }

  connection = new Database(getDbPath());
  connection.pragma("journal_mode = WAL");
  connection.exec(getSchemaSql());
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
