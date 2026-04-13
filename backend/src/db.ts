import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { IngestPayload, Item } from "../../shared/types/alert";
import type { ProjectRecord } from "../../shared/types/project";
import { db, ensureSchema } from "./db/client";
import { alertsTable, projectsTable } from "./db/schema";
import {
  buildAlertDetail,
  stringifyJson,
  toAlertItem,
  toProjectRecord,
} from "./db-mapper";

// 默认端口
export const DEFAULT_PORT = 8788;
const TRAILING_SLASH_RE = /\/$/;

// 基础址
export function getBaseUrl() {
  const customBase = process.env.BACKEND_BASE_URL?.trim();

  if (customBase) {
    return customBase.replace(TRAILING_SLASH_RE, "");
  }

  const port = Number(process.env.BACKEND_PORT || DEFAULT_PORT);

  return `http://localhost:${port}`;
}

// 链接址
function buildWebhookUrl(webhookId: string, baseUrl?: string) {
  const nextBaseUrl = baseUrl || getBaseUrl();

  return `${nextBaseUrl}/ingest/${webhookId}`;
}

// 存储层
export class BackendDatabase {
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = ensureSchema();
  }

  // 等待库
  private async waitReady() {
    await this.ready;
  }

  // 建项目
  async createProject(name: string, baseUrl?: string): Promise<ProjectRecord> {
    await this.waitReady();
    const now = new Date().toISOString();
    const id = `pj_${randomUUID().replaceAll("-", "")}`;
    const webhookId = `wk_${randomUUID().replaceAll("-", "")}`;
    const project: ProjectRecord = {
      createdAt: now,
      id,
      name,
      updatedAt: now,
      webhookEnabled: true,
      webhookId,
      webhookUrl: buildWebhookUrl(webhookId, baseUrl),
    };
    const rows = await db.insert(projectsTable).values(project).returning();
    const row = rows[0];

    if (!row) {
      throw new Error("Failed to create project.");
    }

    return toProjectRecord(row);
  }

  // 查项目
  async getProjectByWebhookId(
    webhookId: string
  ): Promise<ProjectRecord | null> {
    await this.waitReady();
    const rows = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.webhookId, webhookId))
      .limit(1);
    const row = rows[0];

    return row ? toProjectRecord(row) : null;
  }

  // 查报警
  async listAlerts(projectId: string): Promise<Item[]> {
    await this.waitReady();
    const rows = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.projectId, projectId))
      .orderBy(alertsTable.updatedAt);

    return rows.map(toAlertItem).reverse();
  }

  // 写报警
  async ingestAlert(projectId: string, payload: IngestPayload): Promise<Item> {
    await this.waitReady();
    const rows = await db
      .select()
      .from(alertsTable)
      .where(
        and(
          eq(alertsTable.projectId, projectId),
          eq(alertsTable.groupKey, payload.groupKey)
        )
      )
      .limit(1);
    const row = rows[0];

    if (row) {
      const updatedAt = new Date().toISOString();
      const lastSeenAt =
        new Date(payload.occurredAt).getTime() >
        new Date(row.lastSeenAt).getTime()
          ? payload.occurredAt
          : row.lastSeenAt;
      const nextCount = row.occurrenceCount + payload.count;
      const currentItem = toAlertItem(row);
      const detail = buildAlertDetail(
        {
          count: nextCount,
          environment: payload.environment,
          firstSeenAt: row.firstSeenAt,
          groupKey: payload.groupKey,
          lastSeenAt,
          message: payload.message,
          rawAlert: payload.rawAlert,
          source: payload.source,
          sourceUrl: payload.sourceUrl,
          stack: payload.stack,
        },
        currentItem.detail
      );
      const updatedRows = await db
        .update(alertsTable)
        .set({
          detailJson: stringifyJson(detail),
          environment: payload.environment,
          lastSeenAt,
          message: payload.message,
          occurrenceCount: nextCount,
          priority: payload.priority,
          rawAlertJson: stringifyJson(payload.rawAlert),
          source: payload.source,
          sourceUrl: payload.sourceUrl,
          stack: payload.stack,
          title: payload.title,
          updatedAt,
        })
        .where(eq(alertsTable.id, row.id))
        .returning();
      const updatedRow = updatedRows[0];

      if (!updatedRow) {
        throw new Error("Failed to update alert.");
      }

      return toAlertItem(updatedRow);
    }

    const now = new Date().toISOString();
    const detail = buildAlertDetail({
      count: payload.count,
      environment: payload.environment,
      firstSeenAt: payload.occurredAt,
      groupKey: payload.groupKey,
      lastSeenAt: payload.occurredAt,
      message: payload.message,
      rawAlert: payload.rawAlert,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      stack: payload.stack,
    });
    const alert: typeof alertsTable.$inferInsert = {
      createdAt: now,
      detailJson: stringifyJson(detail),
      environment: payload.environment,
      firstSeenAt: payload.occurredAt,
      groupKey: payload.groupKey,
      id: `al_${randomUUID().replaceAll("-", "")}`,
      isRead: false,
      isSyncedLocal: false,
      lastSeenAt: payload.occurredAt,
      message: payload.message,
      occurrenceCount: payload.count,
      priority: payload.priority,
      projectId,
      rawAlertJson: stringifyJson(payload.rawAlert),
      readAt: null,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      stack: payload.stack,
      status: "backlog",
      syncedAt: null,
      title: payload.title,
      updatedAt: now,
    };
    const insertedRows = await db.insert(alertsTable).values(alert).returning();
    const insertedRow = insertedRows[0];

    if (!insertedRow) {
      throw new Error("Failed to create alert.");
    }

    return toAlertItem(insertedRow);
  }
}
