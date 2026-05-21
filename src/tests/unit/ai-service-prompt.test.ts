import type { Item } from "@shared/types/alert";
import { afterEach, expect, test, vi } from "vitest";
import { analyzeAlertWithAi } from "@/server/alerts/ai-service";

// 构造报警
function createAlert(): Item {
  return {
    createdAt: "2026-05-21T00:00:00.000Z",
    detail: {
      error: {
        groupKey: "dom-node-missing",
        message: "Cannot read properties of undefined",
        rawAlert: {},
        stack: "TypeError at UserList (src/UserList.tsx:12:4)",
      },
      summary: {
        occurrenceCount: 1,
        source: "browser",
      },
    },
    groupKey: "dom-node-missing",
    id: "AL-1",
    isRead: false,
    isSyncedLocal: true,
    priority: "P1",
    projectId: "project-1",
    readAt: null,
    status: "backlog",
    syncedAt: "2026-05-21T00:00:00.000Z",
    title: "User list render failed",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("analysis prompt asks for business impact and fix decision", async () => {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as {
      messages: Array<{ content: string; role: string }>;
    };
    const prompt = body.messages.map((message) => message.content).join("\n");

    expect(prompt).toContain("expectedBehavior");
    expect(prompt).toContain("actualBehavior");
    expect(prompt).toContain("fixDecision");
    expect(prompt).toContain("keep_backlog");
    expect(prompt).toContain("real user-visible business behavior");

    return Promise.resolve(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                businessImpact: {
                  actualBehavior: "用户列表无法渲染",
                  affectedSurface: "用户列表",
                  affectsUser: true,
                  confidence: "high",
                  evidence: "堆栈指向 UserList 渲染路径",
                  expectedBehavior: "用户能看到列表 DOM",
                },
                codeLocations: [
                  {
                    filePath: "src/UserList.tsx",
                    line: 12,
                    reason: "堆栈命中渲染入口",
                  },
                ],
                fixDecision: {
                  action: "create_request",
                  reason: "用户可见列表无法渲染",
                },
                fixSuggestions: [
                  {
                    summary: "保护列表数据为空的路径",
                    verification: "补充 UserList 首屏单测",
                  },
                ],
                impact: "用户看不到用户列表",
                rootCause: "列表数据未就绪时直接读取属性",
              }),
            },
          },
        ],
      })
    );
  });

  vi.stubGlobal("fetch", fetchMock);

  const analysis = await analyzeAlertWithAi({
    aiConfig: {
      apiKey: "sk-test",
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
    },
    candidateCodeLocations: [
      {
        filePath: "src/UserList.tsx",
        line: 12,
      },
    ],
    item: createAlert(),
  });

  expect(analysis.businessImpact?.affectsUser).toBe(true);
  expect(analysis.fixDecision?.action).toBe("create_request");
  expect(analysis.codeLocations?.[0]?.reason).toBe("堆栈命中渲染入口");
});
