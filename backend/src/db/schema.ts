import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

// 项目表
export const projectsTable = pgTable("projects", {
  createdAt: text("created_at").notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  updatedAt: text("updated_at").notNull(),
  webhookEnabled: boolean("webhook_enabled").notNull(),
  webhookId: text("webhook_id").notNull().unique(),
  webhookUrl: text("webhook_url").notNull(),
});

// 报警表
export const alertsTable = pgTable("alerts", {
  createdAt: text("created_at").notNull(),
  detailJson: text("detail_json").notNull(),
  environment: text("environment"),
  firstSeenAt: text("first_seen_at").notNull(),
  groupKey: text("group_key").notNull(),
  id: text("id").primaryKey(),
  isRead: boolean("is_read").notNull(),
  isSyncedLocal: boolean("is_synced_local").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  message: text("message").notNull(),
  occurrenceCount: integer("occurrence_count").notNull(),
  priority: text("priority", {
    enum: ["P0", "P1", "P2"],
  }).notNull(),
  projectId: text("project_id").notNull(),
  rawAlertJson: text("raw_alert_json").notNull(),
  readAt: text("read_at"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  syncedAt: text("synced_at"),
  stack: text("stack"),
  status: text("status", {
    enum: [
      "backlog",
      "todo",
      "in_progress",
      "in_review",
      "done",
      "dismiss",
      "duplicate",
    ],
  }).notNull(),
  title: text("title").notNull(),
  updatedAt: text("updated_at").notNull(),
});
