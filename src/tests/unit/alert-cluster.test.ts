import type { ItemPriority } from "@shared/types/alert";
import { describe, expect, test } from "vitest";
import { buildClusteredAlertPatch } from "../../../backend/src/alert-cluster";
import type { alertsTable } from "../../../backend/src/db/schema";

type AlertRow = typeof alertsTable.$inferSelect;

// 构造行
function buildRow(patch: Partial<AlertRow> = {}): AlertRow {
  return {
    createdAt: "2026-05-20T00:00:00.000Z",
    detailJson: JSON.stringify({
      analysis: {
        rootCause: "saved analysis",
      },
      error: {
        groupKey: "same-error",
        message: "old message",
        rawAlert: {
          old: true,
        },
        stack: "old stack",
      },
      summary: {
        environment: "production",
        firstSeenAt: "2026-05-20T00:00:00.000Z",
        lastSeenAt: "2026-05-20T00:00:00.000Z",
        occurrenceCount: 2,
        source: "web",
        sourceUrl: null,
      },
    }),
    environment: "production",
    firstSeenAt: "2026-05-20T00:00:00.000Z",
    groupKey: "same-error",
    id: "al_existing",
    isRead: true,
    isSyncedLocal: true,
    lastSeenAt: "2026-05-20T00:00:00.000Z",
    message: "old message",
    occurrenceCount: 2,
    priority: "P2" as ItemPriority,
    projectId: "pj_1",
    rawAlertJson: JSON.stringify({
      old: true,
    }),
    readAt: "2026-05-20T00:10:00.000Z",
    source: "web",
    sourceUrl: null,
    stack: "old stack",
    status: "in_review",
    syncedAt: "2026-05-20T00:11:00.000Z",
    title: "Old title",
    updatedAt: "2026-05-20T00:11:00.000Z",
    ...patch,
  };
}

describe("alert cluster", () => {
  test("merges same group alert into one update patch", () => {
    const patch = buildClusteredAlertPatch(
      buildRow(),
      {
        count: 3,
        environment: "staging",
        groupKey: "same-error",
        message: "new message",
        occurredAt: "2026-05-21T00:00:00.000Z",
        priority: "P0",
        rawAlert: {
          next: true,
        },
        source: "browser",
        sourceUrl: "https://app.local/error",
        stack: "new stack",
        title: "New title",
      },
      "2026-05-21T00:01:00.000Z"
    );
    const detail = JSON.parse(String(patch.detailJson));

    expect(patch).toMatchObject({
      firstSeenAt: "2026-05-20T00:00:00.000Z",
      isSyncedLocal: false,
      lastSeenAt: "2026-05-21T00:00:00.000Z",
      occurrenceCount: 5,
      priority: "P0",
      syncedAt: null,
      title: "New title",
    });
    expect(detail.analysis.rootCause).toBe("saved analysis");
    expect(detail.summary.occurrenceCount).toBe(5);
    expect(detail.error.rawAlert).toEqual({
      next: true,
    });
  });
});
