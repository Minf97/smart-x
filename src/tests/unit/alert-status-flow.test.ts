import type { Item } from "@shared/types/alert";
import type { CodeRequest } from "@shared/types/project";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type * as AlertsRepository from "@/server/alerts/repository";

type OrderByCondition = {
  column: { name: string };
  kind: "asc";
};

type WhereCondition = {
  column: { name: string };
  kind: "eq";
  value: unknown;
};

type TableRow = Record<string, unknown> & {
  id: string;
  position?: number;
};

type FakeDbState = {
  alerts: TableRow[];
  feedbackSignals: TableRow[];
  projects: TableRow[];
};

const testState = vi.hoisted(() => ({
  db: createFakeDb(),
}));

const requestMocks = vi.hoisted(() => ({
  closeRequest: vi.fn(),
  createRequest: vi.fn(),
  mergeRequest: vi.fn(),
}));

// 模拟电壳
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp"),
  },
}));

// 模拟查询
vi.mock("drizzle-orm", () => ({
  // 升序条件
  asc(column: { name: string }) {
    return {
      column,
      kind: "asc",
    } satisfies OrderByCondition;
  },
  // 相等条件
  eq(column: { name: string }, value: unknown) {
    return {
      column,
      kind: "eq",
      value,
    } satisfies WhereCondition;
  },
}));

// 模拟数据库
vi.mock("@/server/db", () => ({
  closeLocalDatabase: vi.fn(),
  getDb: vi.fn(() => testState.db),
}));

// 模拟请求
vi.mock("@/server/alerts/request-service", () => requestMocks);

// 造内存库
function createFakeDb() {
  const state: FakeDbState = {
    alerts: [],
    feedbackSignals: [],
    projects: [],
  };

  // 取表名
  function getTableName(table: object) {
    const key = Object.getOwnPropertySymbols(table).find((symbol) =>
      symbol.description?.includes("drizzle:Name")
    );

    if (!key) {
      throw new Error("Table name not found.");
    }

    return String((table as Record<PropertyKey, unknown>)[key]);
  }

  // 取数据
  function getRows(table: object) {
    const tableName = getTableName(table);

    if (tableName === "alerts") {
      return state.alerts;
    }

    if (tableName === "projects") {
      return state.projects;
    }

    if (tableName === "feedback_signals") {
      return state.feedbackSignals;
    }

    throw new Error(`Unknown table: ${tableName}`);
  }

  // 取副本
  function cloneRow<T extends TableRow>(row: T) {
    return {
      ...row,
    } as T;
  }

  // 取匹配
  function filterRows(rows: TableRow[], where?: WhereCondition) {
    if (!where) {
      return [...rows];
    }

    return rows.filter((row) => row[where.column.name] === where.value);
  }

  // 排序列
  function sortRows(rows: TableRow[], orderBy?: OrderByCondition) {
    if (!orderBy) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      const leftValue = left[orderBy.column.name];
      const rightValue = right[orderBy.column.name];

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return leftValue - rightValue;
      }

      return String(leftValue).localeCompare(String(rightValue));
    });
  }

  return {
    // 插入行
    insert(table: object) {
      const rows = getRows(table);

      return {
        // 写入值
        values(value: TableRow | TableRow[]) {
          const nextRows = Array.isArray(value) ? value : [value];

          return {
            // 执行插入
            run() {
              rows.push(...nextRows.map(cloneRow));
            },
          };
        },
      };
    },
    // 查询行
    select(_selection?: Record<string, unknown>) {
      let table: object | null = null;
      let where: WhereCondition | undefined;
      let orderBy: OrderByCondition | undefined;

      return {
        // 指定表
        from(nextTable: object) {
          table = nextTable;

          return this;
        },
        // 取单行
        get() {
          if (!table) {
            return undefined;
          }

          const rows = sortRows(filterRows(getRows(table), where), orderBy);
          const row = rows[0];

          return row ? cloneRow(row) : undefined;
        },
        // 指定排序
        orderBy(nextOrderBy: OrderByCondition) {
          orderBy = nextOrderBy;

          return this;
        },
        // 指定条件
        where(nextWhere: WhereCondition) {
          where = nextWhere;

          return this;
        },
        // 取列表
        all() {
          if (!table) {
            return [];
          }

          return sortRows(filterRows(getRows(table), where), orderBy).map(
            cloneRow
          );
        },
      };
    },
    // 更新行
    update(table: object) {
      const rows = getRows(table);
      let patch: Partial<TableRow> = {};

      return {
        // 写补丁
        set(nextPatch: Partial<TableRow>) {
          patch = nextPatch;

          return this;
        },
        // 按条件
        where(whereCondition: WhereCondition) {
          return {
            // 执行更新
            run() {
              const row = rows.find(
                (item) => item[whereCondition.column.name] === whereCondition.value
              );

              if (!row) {
                return;
              }

              Object.assign(row, patch);
            },
          };
        },
      };
    },
  };
}

// 构造请求
function buildRequest(item: Pick<Item, "id" | "title">): CodeRequest {
  return {
    baseBranch: "main",
    branchName: `alert/${item.id.toLowerCase()}`,
    createdAt: "2026-05-14T00:00:00.000Z",
    provider: "github",
    remoteId: "1",
    repoName: "demo/client-app",
    state: "open",
    title: `[${item.id}] ${item.title}`,
    updatedAt: "2026-05-14T00:00:00.000Z",
    url: `https://github.com/demo/client-app/pull/${item.id}`,
  };
}

// 载入仓库
async function loadRepository() {
  const repository = await import("@/server/alerts/repository");

  return repository as typeof AlertsRepository;
}

// 查找报警
async function findAlert(
  repository: typeof AlertsRepository,
  alertId: string
) {
  const data = await repository.getDashboardData();
  const alert = data.alerts.find((item) => item.id === alertId);

  if (!alert) {
    throw new Error(`Alert ${alertId} not found.`);
  }

  return alert;
}

// 等进度
async function waitForCreateProgress(
  repository: typeof AlertsRepository,
  sessionId: string
) {
  for (let index = 0; index < 50; index += 1) {
    const progress = repository.getCreateAlertRequestProgress(sessionId);

    if (progress.status !== "pending") {
      return progress;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error("Create request progress did not finish.");
}

describe("alert status flow", () => {
  beforeEach(() => {
    vi.resetModules();
    testState.db = createFakeDb();
    requestMocks.closeRequest.mockReset();
    requestMocks.createRequest.mockReset();
    requestMocks.mergeRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("moves todo alert to in_progress when analysis starts", async () => {
    const repository = await loadRepository();

    await expect(findAlert(repository, "ENG-2380")).resolves.toMatchObject({
      status: "todo",
    });

    const analyzed = await repository.analyzeAlert("ENG-2380");
    const stored = await findAlert(repository, "ENG-2380");

    expect(analyzed.status).toBe("in_progress");
    expect(stored.status).toBe("in_progress");
    expect(requestMocks.createRequest).not.toHaveBeenCalled();
  });

  test("moves analyzed alert to in_review after request creation", async () => {
    requestMocks.createRequest.mockImplementation(async (item: Item) =>
      buildRequest(item)
    );
    const repository = await loadRepository();

    await expect(findAlert(repository, "ENG-2498")).resolves.toMatchObject({
      status: "in_progress",
    });

    const project = await repository.createAlertRequest("ENG-2498");
    const stored = await findAlert(repository, "ENG-2498");

    expect(stored.status).toBe("in_review");
    expect(project.requestMap["ENG-2498"]?.state).toBe("open");
    expect(requestMocks.createRequest).toHaveBeenCalledTimes(1);
  });

  test("moves in_review alert to done after request merge", async () => {
    requestMocks.createRequest.mockImplementation(async (item: Item) =>
      buildRequest(item)
    );
    requestMocks.mergeRequest.mockImplementation(
      async (request: CodeRequest) => ({
        ...request,
        state: "merged",
        updatedAt: "2026-05-14T00:10:00.000Z",
      })
    );
    const repository = await loadRepository();

    await repository.createAlertRequest("ENG-2498");

    const project = await repository.mergeAlertRequest("ENG-2498");
    const stored = await findAlert(repository, "ENG-2498");

    expect(stored.status).toBe("done");
    expect(stored.detail.feedbackSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "merge_request",
          alertId: "ENG-2498",
          groupKey: stored.groupKey,
          reason: null,
        }),
      ])
    );
    expect(project.requestMap["ENG-2498"]?.state).toBe("merged");
    expect(requestMocks.mergeRequest).toHaveBeenCalledTimes(1);
  });

  test("records dismiss feedback when alert is dismissed", async () => {
    const repository = await loadRepository();

    await repository.updateAlertStatus("ENG-2380", "dismiss");
    const stored = await findAlert(repository, "ENG-2380");

    expect(stored.status).toBe("dismiss");
    expect(stored.detail.feedbackSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "dismiss",
          alertId: "ENG-2380",
          groupKey: stored.groupKey,
          reason: null,
        }),
      ])
    );
  });

  test("exposes create request progress session", async () => {
    requestMocks.createRequest.mockImplementation(
      async (
        item: Item,
        _config: unknown,
        options?: {
          onProgress?: (step: string) => void | Promise<void>;
        }
      ) => {
        await options?.onProgress?.("syncBranch");
        await options?.onProgress?.("applyFix");
        await options?.onProgress?.("commitChanges");
        await options?.onProgress?.("createRemoteRequest");

        return buildRequest(item);
      }
    );
    const repository = await loadRepository();

    const started = repository.startCreateAlertRequest("ENG-2498");
    const finished = await waitForCreateProgress(
      repository,
      started.sessionId
    );
    const stored = await findAlert(repository, "ENG-2498");

    expect(started.status).toBe("pending");
    expect(finished.status).toBe("completed");
    expect(finished.step).toBe("done");
    expect(finished.project?.requestMap["ENG-2498"]?.state).toBe("open");
    expect(stored.status).toBe("in_review");
  });
});
