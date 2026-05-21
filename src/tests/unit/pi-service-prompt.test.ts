import type { Item } from "@shared/types/alert";
import { expect, test, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp"),
  },
}));

import { buildFixPrompt } from "@/server/alerts/analysis-contract";

// 构造报警
function createAlert(): Item {
  return {
    createdAt: "2026-05-21T00:00:00.000Z",
    detail: {
      analysis: {
        businessImpact: {
          actualBehavior: "列表区域崩溃",
          affectedSurface: "用户列表",
          affectsUser: true,
          confidence: "high",
          evidence: "堆栈命中渲染函数",
          expectedBehavior: "用户能看到列表 DOM",
        },
        fixDecision: {
          action: "create_request",
          reason: "用户可见功能失败",
        },
        impact: "用户无法查看列表",
        rootCause: "空值未保护",
      },
      error: {
        groupKey: "list-crash",
        message: "Cannot read properties of undefined",
        rawAlert: {},
        stack: "TypeError at UserList",
      },
      summary: {
        occurrenceCount: 1,
        source: "browser",
      },
    },
    groupKey: "list-crash",
    id: "AL-1",
    isRead: false,
    isSyncedLocal: true,
    priority: "P1",
    projectId: "project-1",
    readAt: null,
    status: "in_progress",
    syncedAt: "2026-05-21T00:00:00.000Z",
    title: "List crash",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

test("fix prompt constrains edits around business impact", () => {
  const prompt = buildFixPrompt(createAlert());

  expect(prompt).toContain("analysis.businessImpact");
  expect(prompt).toContain("analysis.fixDecision");
  expect(prompt).toContain("expectedBehavior");
  expect(prompt).toContain("actualBehavior");
  expect(prompt).toContain("focused unit test");
  expect(prompt).toContain("Do not run git commands");
});
