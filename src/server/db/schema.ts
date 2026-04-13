import type { ItemPriority, ItemStatus } from "@shared/types/alert";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 认证表
export const githubAuthTable = sqliteTable("github_auth", {
  accessToken: text("access_token").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  id: text("id").primaryKey(),
  login: text("login").notNull(),
  name: text("name").notNull(),
});

// 项目表
export const projectsTable = sqliteTable("projects", {
  createdAt: text("created_at").notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  repoConfigJson: text("repo_config_json").notNull(),
  requestMapJson: text("request_map_json").notNull(),
  updatedAt: text("updated_at").notNull(),
  webhookEnabled: integer("webhook_enabled", { mode: "boolean" }).notNull(),
  webhookId: text("webhook_id").notNull(),
  webhookUrl: text("webhook_url").notNull(),
});

// 报警表
export const alertsTable = sqliteTable("alerts", {
  createdAt: text("created_at").notNull(),
  detailJson: text("detail_json").notNull(),
  environment: text("environment"),
  firstSeenAt: text("first_seen_at"),
  groupKey: text("group_key").notNull(),
  id: text("id").primaryKey(),
  isRead: integer("is_read", { mode: "boolean" }).notNull(),
  isSyncedLocal: integer("is_synced_local", { mode: "boolean" }).notNull(),
  lastSeenAt: text("last_seen_at"),
  message: text("message").notNull(),
  occurrenceCount: integer("occurrence_count").notNull(),
  position: integer("position").notNull(),
  priority: text("priority").$type<ItemPriority>().notNull(),
  projectId: text("project_id").notNull(),
  rawAlertJson: text("raw_alert_json").notNull(),
  readAt: text("read_at"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  status: text("status").$type<ItemStatus>().notNull(),
  syncedAt: text("synced_at"),
  stack: text("stack"),
  title: text("title").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type AlertRow = typeof alertsTable.$inferSelect;
export type NewAlertRow = typeof alertsTable.$inferInsert;
export type GithubAuthRow = typeof githubAuthTable.$inferSelect;
export type NewGithubAuthRow = typeof githubAuthTable.$inferInsert;
export type ProjectRow = typeof projectsTable.$inferSelect;
export type NewProjectRow = typeof projectsTable.$inferInsert;
