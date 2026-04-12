import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import { alertsTable } from "./schema";

function createDb(connection: Database.Database) {
  return drizzle(connection, {
    schema: {
      alertsTable,
    },
  });
}

type LocalDb = ReturnType<typeof createDb>;

let connection: Database.Database | null = null;
let db: LocalDb | null = null;

// 库路径
function getDbPath() {
  return path.join(app.getPath("userData"), "alerts.sqlite");
}

// 建表句
function getSchemaSql() {
  return `
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      position INTEGER NOT NULL,
      detail_json TEXT NOT NULL
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
