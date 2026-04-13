import type { Detail, Item } from "../../shared/types/alert";
import type { ProjectRecord } from "../../shared/types/project";
import type { alertsTable, projectsTable } from "./db/schema";

// 详情参
export interface AlertDetailInput {
  count: number;
  environment: string | null;
  firstSeenAt: string;
  groupKey: string;
  lastSeenAt: string;
  message: string;
  rawAlert: unknown;
  source: string;
  sourceUrl: string | null;
  stack: string | null;
}

// 读JSON
function parseJson<T>(value: string, fallback: T) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// 写JSON
export function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

// 组详情
export function buildAlertDetail(
  input: AlertDetailInput,
  currentDetail?: Detail
): Detail {
  return {
    analysis: currentDetail?.analysis,
    error: {
      groupKey: input.groupKey,
      message: input.message,
      rawAlert: input.rawAlert,
      stack: input.stack,
    },
    summary: {
      environment: input.environment,
      firstSeenAt: input.firstSeenAt,
      lastSeenAt: input.lastSeenAt,
      occurrenceCount: input.count,
      source: input.source,
      sourceUrl: input.sourceUrl,
      version: currentDetail?.summary?.version,
    },
  };
}

// 转报警
export function toAlertItem(row: typeof alertsTable.$inferSelect): Item {
  const rawAlert = parseJson<unknown>(row.rawAlertJson, null);
  const savedDetail = parseJson<Detail>(
    row.detailJson,
    buildAlertDetail({
      count: row.occurrenceCount,
      environment: row.environment,
      firstSeenAt: row.firstSeenAt,
      groupKey: row.groupKey,
      lastSeenAt: row.lastSeenAt,
      message: row.message,
      rawAlert,
      source: row.source,
      sourceUrl: row.sourceUrl,
      stack: row.stack,
    })
  );

  return {
    createdAt: row.createdAt,
    detail: buildAlertDetail(
      {
        count: row.occurrenceCount,
        environment: row.environment,
        firstSeenAt: row.firstSeenAt,
        groupKey: row.groupKey,
        lastSeenAt: row.lastSeenAt,
        message: row.message,
        rawAlert,
        source: row.source,
        sourceUrl: row.sourceUrl,
        stack: row.stack,
      },
      savedDetail
    ),
    groupKey: row.groupKey,
    id: row.id,
    isRead: row.isRead,
    isSyncedLocal: row.isSyncedLocal,
    priority: row.priority,
    projectId: row.projectId,
    readAt: row.readAt,
    status: row.status,
    syncedAt: row.syncedAt,
    title: row.title,
    updatedAt: row.updatedAt,
  };
}

// 转项目
export function toProjectRecord(
  row: typeof projectsTable.$inferSelect
): ProjectRecord {
  return {
    createdAt: row.createdAt,
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
    webhookEnabled: row.webhookEnabled,
    webhookId: row.webhookId,
    webhookUrl: row.webhookUrl,
  };
}
