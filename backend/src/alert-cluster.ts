import type { IngestPayload, ItemPriority } from "../../shared/types/alert";
import type { alertsTable } from "./db/schema";
import { buildAlertDetail, stringifyJson, toAlertItem } from "./db-mapper";

type AlertRow = typeof alertsTable.$inferSelect;

const PRIORITY_WEIGHT = {
  P0: 3,
  P1: 2,
  P2: 1,
} as const satisfies Record<ItemPriority, number>;

// 较早时间
function pickEarlierTime(current: string, next: string) {
  return next < current ? next : current;
}

// 较晚时间
function pickLaterTime(current: string, next: string) {
  return next > current ? next : current;
}

// 最高优先
function pickHigherPriority(current: ItemPriority, next: ItemPriority) {
  return PRIORITY_WEIGHT[next] > PRIORITY_WEIGHT[current] ? next : current;
}

// 合并同组
export function buildClusteredAlertPatch(
  row: AlertRow,
  payload: IngestPayload,
  updatedAt: string
) {
  const occurrenceCount = row.occurrenceCount + payload.count;
  const firstSeenAt = pickEarlierTime(row.firstSeenAt, payload.occurredAt);
  const lastSeenAt = pickLaterTime(row.lastSeenAt, payload.occurredAt);
  const priority = pickHigherPriority(row.priority, payload.priority);
  const currentDetail = toAlertItem(row).detail;
  const detail = buildAlertDetail(
    {
      count: occurrenceCount,
      environment: payload.environment,
      firstSeenAt,
      groupKey: row.groupKey,
      lastSeenAt,
      message: payload.message,
      rawAlert: payload.rawAlert,
      source: payload.source,
      sourceUrl: payload.sourceUrl,
      stack: payload.stack,
    },
    currentDetail
  );

  return {
    detailJson: stringifyJson(detail),
    environment: payload.environment,
    firstSeenAt,
    isSyncedLocal: false,
    lastSeenAt,
    message: payload.message,
    occurrenceCount,
    priority,
    rawAlertJson: stringifyJson(payload.rawAlert),
    source: payload.source,
    sourceUrl: payload.sourceUrl,
    stack: payload.stack,
    syncedAt: null,
    title: payload.title,
    updatedAt,
  } satisfies Partial<AlertRow>;
}
