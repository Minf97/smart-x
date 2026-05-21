import { beforeEach, expect, test, vi } from "vitest";

type WhereCondition =
  | {
      column: { name: string };
      kind: "eq";
      value: unknown;
    }
  | {
      column: { name: string };
      kind: "inArray";
      values: unknown[];
    };

type TableRow = Record<string, unknown> & {
  id: string;
};

interface FakeDbState {
  alerts: TableRow[];
  feedbackSignals: TableRow[];
  projects: TableRow[];
}

const rmMock = vi.hoisted(() => vi.fn(async () => undefined));
const existsSyncMock = vi.hoisted(() => vi.fn(() => true));
const testState = vi.hoisted(() => ({
  db: createFakeDb(),
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: existsSyncMock,
  },
  existsSync: existsSyncMock,
}));

vi.mock("node:fs/promises", () => ({
  default: {
    rm: rmMock,
  },
  rm: rmMock,
}));

// 模拟电壳
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/Users/test/Documents"),
  },
}));

// 模拟查询
vi.mock("drizzle-orm", () => ({
  // 相等条件
  eq(column: { name: string }, value: unknown) {
    return {
      column,
      kind: "eq",
      value,
    } satisfies WhereCondition;
  },
  // 包含条件
  inArray(column: { name: string }, values: unknown[]) {
    return {
      column,
      kind: "inArray",
      values,
    } satisfies WhereCondition;
  },
}));

// 模拟数据库
vi.mock("@/server/db", () => ({
  getDb: vi.fn(() => testState.db),
}));

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

  // 匹配条件
  function matches(row: TableRow, where?: WhereCondition) {
    if (!where) {
      return true;
    }

    if (where.kind === "eq") {
      return row[where.column.name] === where.value;
    }

    return where.values.includes(row[where.column.name]);
  }

  return {
    state,
    // 删除行
    delete(table: object) {
      const rows = getRows(table);

      return {
        // 按条件
        where(where: WhereCondition) {
          return {
            // 执行删除
            run() {
              const nextRows = rows.filter((row) => !matches(row, where));
              rows.splice(0, rows.length, ...nextRows);
            },
          };
        },
      };
    },
    // 查询行
    select() {
      let table: object | null = null;
      let where: WhereCondition | undefined;

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

          return getRows(table).find((row) => matches(row, where));
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

          return getRows(table).filter((row) => matches(row, where));
        },
      };
    },
  };
}

// 构造项目
function addProject(id: string, managedRepoPath: string) {
  testState.db.state.projects.push({
    id,
    repoConfigJson: JSON.stringify({
      managedRepoPath,
    }),
  });
  testState.db.state.alerts.push(
    {
      id: "alert-client",
      project_id: id,
    },
    {
      id: "alert-server",
      project_id: "server",
    }
  );
  testState.db.state.feedbackSignals.push(
    {
      alert_id: "alert-client",
      id: "signal-client",
    },
    {
      alert_id: "alert-server",
      id: "signal-server",
    }
  );
}

beforeEach(() => {
  vi.resetModules();
  testState.db = createFakeDb();
  rmMock.mockClear();
  existsSyncMock.mockClear();
  existsSyncMock.mockReturnValue(true);
});

test("deletes project records and managed repo", async () => {
  const repoPath =
    "/Users/test/Documents/workspace/managed-repos/github/demo/client";
  addProject("client", repoPath);
  const { deleteProject } = await import(
    "@/server/projects/delete-project-service"
  );

  await deleteProject("client");

  expect(rmMock).toHaveBeenCalledWith(repoPath, {
    recursive: true,
  });
  expect(testState.db.state.projects).toHaveLength(0);
  expect(testState.db.state.alerts).toEqual([
    expect.objectContaining({ id: "alert-server" }),
  ]);
  expect(testState.db.state.feedbackSignals).toEqual([
    expect.objectContaining({ id: "signal-server" }),
  ]);
});

test("keeps custom repo path on project deletion", async () => {
  addProject("client", "/Users/test/custom/client");
  const { deleteProject } = await import(
    "@/server/projects/delete-project-service"
  );

  await deleteProject("client");

  expect(rmMock).not.toHaveBeenCalled();
  expect(testState.db.state.projects).toHaveLength(0);
});
