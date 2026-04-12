import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ItemPriority, ItemStatus } from "@/types/alert";

// 报警表
export const alertsTable = sqliteTable("alerts", {
  detailJson: text("detail_json").notNull(),
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  priority: text("priority").$type<ItemPriority>().notNull(),
  status: text("status").$type<ItemStatus>().notNull(),
  title: text("title").notNull(),
});

export type AlertRow = typeof alertsTable.$inferSelect;
export type NewAlertRow = typeof alertsTable.$inferInsert;
