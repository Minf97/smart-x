import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { IngestPayload, Item } from "../../shared/types/alert";
import type { ProjectRecord } from "../../shared/types/project";
import { ensureSchema, getDb } from "./db/client";
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
  // 等待库
  private async waitReady() {
    await ensureSchema();
  }

  // 建项目
  async createProject(name: string, baseUrl?: string): Promise<ProjectRecord> {
    await this.waitReady();
    const db = getDb();
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
    const db = getDb();
    const rows = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.webhookId, webhookId))
      .limit(1);
    const row = rows[0];

    return row ? toProjectRecord(row) : null;
  }

  // 查报警,目前只返回未同步的报警
  async listAlerts(projectId: string): Promise<Item[]> {
    await this.waitReady();
    const db = getDb();
    const rows = await db
      .select()
      .from(alertsTable)
      .where(
        and(
          eq(alertsTable.projectId, projectId),
          eq(alertsTable.isSyncedLocal, false)
        )
      )
      .orderBy(alertsTable.updatedAt);

    return rows.map(toAlertItem).reverse();
  }

  // 标记已同步
  async markAlertsSynced(projectId: string, alertIds: string[]): Promise<void> {
    await this.waitReady();

    if (alertIds.length === 0) {
      throw new Error("Alert ids are required.");
    }

    const db = getDb();
    const syncedAt = new Date().toISOString();
    await db
      .update(alertsTable)
      .set({
        isSyncedLocal: true,
        syncedAt,
        updatedAt: syncedAt,
      })
      .where(
        and(
          eq(alertsTable.projectId, projectId),
          inArray(alertsTable.id, alertIds)
        )
      );
  }

  // 写报警
  async ingestAlert(projectId: string, payload: IngestPayload): Promise<Item> {
    await this.waitReady();
    const db = getDb();
    const now = new Date().toISOString();
    // TODO: 1.校验 payload 格式，2.如果不符合我们要求的格式，就需要调用 AI 接口进行转换

    // 构建 detail-content 所需要的字段
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
    // 构建入库的报警记录数据结构
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
