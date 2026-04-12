import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ItemPriority, ItemStatus } from "@/types/alert";

// 项目表
export const projectsTable = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  repoConfigJson: text("repo_config_json").notNull(),
  requestMapJson: text("request_map_json").notNull(),
});

// 报警表
export const alertsTable = sqliteTable("alerts", {
  detailJson: text("detail_json").notNull(),
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  priority: text("priority").$type<ItemPriority>().notNull(),
  projectId: text("project_id").notNull(),
  status: text("status").$type<ItemStatus>().notNull(),
  title: text("title").notNull(),
});

export type AlertRow = typeof alertsTable.$inferSelect;
export type NewAlertRow = typeof alertsTable.$inferInsert;
export type ProjectRow = typeof projectsTable.$inferSelect;
export type NewProjectRow = typeof projectsTable.$inferInsert;
