import { createHash } from "node:crypto";
import type { IngestPayload, ItemPriority } from "../../shared/types/alert";

// 文本值
function pickText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

// 对象值
function pickObject(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

// 时间串
function toIsoString(value?: string | null) {
  if (!value) {
    return new Date().toISOString();
  }

  const nextDate = new Date(value);

  if (Number.isNaN(nextDate.getTime())) {
    return new Date().toISOString();
  }

  return nextDate.toISOString();
}

// 优先级
function mapPriority(input: Record<string, unknown>): ItemPriority {
  const rawPriority = pickText(input.priority).toUpperCase();

  if (rawPriority === "P0" || rawPriority === "P1" || rawPriority === "P2") {
    return rawPriority;
  }

  const severity = pickText(input.severity).toLowerCase();

  if (severity === "critical" || severity === "fatal") {
    return "P0";
  }

  if (severity === "error" || severity === "high") {
    return "P1";
  }

  return "P2";
}

// 分组键
function buildGroupKey(input: {
  message: string;
  stack: string;
  title: string;
}) {
  const key = [input.title, input.message, input.stack.split("\n")[0] || ""]
    .join("|")
    .trim();

  return createHash("sha1").update(key).digest("hex");
}

// 标准化
export function normalizePayload(body: unknown): IngestPayload {
  const input = pickObject(body);
  const error = pickObject(input.error);
  const title =
    pickText(input.title) ||
    pickText(input.event) ||
    pickText(input.name) ||
    pickText(input.message) ||
    pickText(error.message) ||
    "Untitled alert";
  const message = pickText(input.message) || pickText(error.message) || title;
  const stack = pickText(input.stack) || pickText(error.stack);
  const source =
    pickText(input.source) ||
    pickText(input.app) ||
    pickText(input.service) ||
    "custom";
  const occurredAt = toIsoString(
    pickText(input.occurredAt) ||
      pickText(input.reportedAt) ||
      pickText(input.timestamp)
  );
  const rawCount =
    typeof input.count === "number"
      ? input.count
      : Number.parseInt(pickText(input.count), 10);
  const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
  const sourceUrl =
    pickText(input.sourceUrl) ||
    pickText(input.url) ||
    pickText(input.link) ||
    null;
  const environment =
    pickText(input.environment) || pickText(input.env) || null;
  const groupKey =
    pickText(input.groupKey) ||
    buildGroupKey({
      message,
      stack,
      title,
    });

  return {
    count,
    environment,
    groupKey,
    message,
    occurredAt,
    priority: mapPriority(input),
    rawAlert: body,
    source,
    sourceUrl,
    stack: stack || null,
    title,
  };
}
