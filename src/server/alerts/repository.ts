import { randomUUID } from "node:crypto";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { app } from "electron";
import { z } from "zod";
import { getDb } from "@/server/db";
import {
  type AlertRow,
  alertsTable,
  type NewAlertRow,
  type NewProjectRow,
  type ProjectRow,
  projectsTable,
} from "@/server/db/schema";
import { getGithubAccessToken } from "@/server/github/auth-service";
import {
  cloneGithubRepo,
  updateGithubRemote,
} from "@/server/projects/git-service";
import { validateGithubProject } from "@/server/projects/github-service";
import type { Detail, Item, ItemStatus } from "@/types/alert";
import { ITEM_STATUS_VALUES } from "@/types/alert";
import type { DashboardData } from "@/types/dashboard";
import {
  type CodeRequest,
  type Project,
  type ProjectInput,
  REQUEST_PROVIDER_VALUES,
  type StoredProjectRepoConfig,
} from "@/types/project";
import { closeRequest, createRequest, mergeRequest } from "./request-service";

interface StoredProject extends Omit<Project, "repoConfig"> {
  repoConfig: StoredProjectRepoConfig;
}

// 状态校验
export const updateStatusSchema = z.object({
  status: z.enum(ITEM_STATUS_VALUES),
});

// 项目校验
const projectSchema = z.object({
  name: z.string().trim().min(1),
  repoConfig: z.object({
    baseBranch: z.string().trim().min(1),
    provider: z.enum(REQUEST_PROVIDER_VALUES),
    repoName: z.string().trim().min(1),
    token: z.string().trim(),
  }),
});

export const validateProjectSchema = projectSchema.extend({
  repoConfig: projectSchema.shape.repoConfig.extend({
    token: z.string().trim(),
  }),
});

export const createProjectSchema = projectSchema;
export const updateProjectSchema = projectSchema;

// 项目种子
const defaultProjects = [
  {
    id: "client",
    name: "Client App",
    repoConfig: {
      baseBranch: "main",
      managedRepoPath: "",
      provider: "github",
      repoName: "demo/client-app",
      token: "",
    },
    requestMap: {},
  },
  {
    id: "server",
    name: "Server API",
    repoConfig: {
      baseBranch: "develop",
      managedRepoPath: "",
      provider: "gitlab",
      repoName: "demo/server-api",
      token: "",
    },
    requestMap: {},
  },
] satisfies StoredProject[];

// 默认种子
const defaultAlerts = [
  {
    detail: {
      analysis: {
        codeLocations: [
          {
            column: 12,
            filePath: "src/pages/HomePage.tsx",
            line: 45,
            reason: "Stack trace points to the first map call.",
            snippet: "{data?.items?.map(item => ...)}",
            symbolName: "HomePage.render",
          },
        ],
        fixSuggestions: [
          {
            patch: "{data?.items?.map(item => ...) ?? null}",
            risk: "Low risk, but verify empty-state rendering.",
            summary: "Guard against empty data before rendering the list.",
            verification: "Test first render before API data resolves.",
          },
        ],
        impact:
          "This issue affects the home page in production and can block page rendering for users who hit this request path.",
        rootCause:
          "The component reads list data before the request is ready, so the map call receives undefined.",
      },
      error: {
        fingerprint: "home-page-map-undefined",
        message: "TypeError: Cannot read property 'map' of undefined",
        stack: `TypeError: Cannot read property 'map' of undefined
at HomePage.render (src/pages/HomePage.tsx:45:12)
at renderComponent (react-dom.js:234:45)
at updateComponent (react-dom.js:456:23)`,
      },
      summary: {
        environment: "production",
        firstSeenAt: "10 mins ago",
        lastSeenAt: "2 mins ago",
        occurrenceCount: 24,
        source: "Frontend App",
        version: "1.8.2",
      },
    },
    id: "ENG-2498",
    priority: "P0",
    projectId: "client",
    status: "in_progress",
    title: "TypeError: Cannot read property 'map' of undefined",
  },
  {
    detail: {
      analysis: {
        impact:
          "User profile and admin list views may fail to load for active sessions.",
        rootCause:
          "The users endpoint exceeds the gateway timeout under heavy query load.",
      },
      error: {
        fingerprint: "api-users-timeout",
        message: "API Timeout /api/users endpoint",
        stack: "TimeoutError: request timed out at GET /api/users",
      },
      summary: {
        environment: "production",
        firstSeenAt: "18 mins ago",
        lastSeenAt: "5 mins ago",
        occurrenceCount: 11,
        source: "Backend API",
        version: "2.3.0",
      },
    },
    id: "ENG-2380",
    priority: "P1",
    projectId: "server",
    status: "todo",
    title: "API Timeout /api/users endpoint",
  },
  {
    detail: {
      error: {
        fingerprint: "node-worker-memory-leak",
        message: "Memory leak detected in Node worker process",
        stack: "WorkerHeapWarning: retained objects keep growing",
      },
      summary: {
        environment: "staging",
        firstSeenAt: "25 mins ago",
        lastSeenAt: "15 mins ago",
        occurrenceCount: 3,
        source: "Node Service",
        version: "0.9.1",
      },
    },
    id: "ENG-2039",
    priority: "P2",
    projectId: "server",
    status: "in_review",
    title: "Memory leak detected in Node worker process",
  },
  {
    detail: {
      error: {
        fingerprint: "db-pool-exhausted",
        message: "Database connection pool exhausted",
        stack: "PoolError: no connections available",
      },
      summary: {
        environment: "production",
        firstSeenAt: "3 hours ago",
        lastSeenAt: "1 hour ago",
        occurrenceCount: 6,
        source: "PostgreSQL",
        version: "2.3.0",
      },
    },
    id: "ENG-2076",
    priority: "P0",
    projectId: "server",
    status: "backlog",
    title: "Database connection pool exhausted",
  },
  {
    detail: {
      error: {
        fingerprint: "payment-rate-limit",
        message: "Rate limit exceeded on payment gateway",
        stack: "GatewayError: too many payment requests",
      },
      summary: {
        environment: "production",
        firstSeenAt: "4 hours ago",
        lastSeenAt: "2 hours ago",
        occurrenceCount: 42,
        source: "API Gateway",
        version: "2.3.0",
      },
    },
    id: "ENG-2108",
    priority: "P1",
    projectId: "server",
    status: "duplicate",
    title: "Rate limit exceeded on payment gateway",
  },
  {
    detail: {
      error: {
        fingerprint: "redis-cache-miss",
        message: "Redis cache miss rate above threshold",
        stack: "MonitorNotice: cache miss rate > 40%",
      },
      summary: {
        environment: "staging",
        firstSeenAt: "5 hours ago",
        lastSeenAt: "3 hours ago",
        occurrenceCount: 7,
        source: "Redis Cluster",
        version: "2.2.7",
      },
    },
    id: "ENG-2143",
    priority: "P2",
    projectId: "client",
    status: "dismiss",
    title: "Redis cache miss rate above threshold",
  },
  {
    detail: {
      error: {
        fingerprint: "s3-upload-timeout",
        message: "S3 upload timeout for large files",
        stack: "UploadTimeout: multipart upload timed out",
      },
      summary: {
        environment: "production",
        firstSeenAt: "8 hours ago",
        lastSeenAt: "5 hours ago",
        occurrenceCount: 2,
        source: "Storage Service",
        version: "2.3.0",
      },
    },
    id: "ENG-2187",
    priority: "P1",
    projectId: "client",
    status: "done",
    title: "S3 upload timeout for large files",
  },
  {
    detail: {
      error: {
        fingerprint: "ws-connection-drops",
        message: "WebSocket connection drops frequently",
        stack: "SocketError: connection closed unexpectedly",
      },
      summary: {
        environment: "production",
        firstSeenAt: "10 hours ago",
        lastSeenAt: "6 hours ago",
        occurrenceCount: 17,
        source: "Real-time Service",
        version: "1.5.4",
      },
    },
    id: "ENG-2219",
    priority: "P0",
    projectId: "client",
    status: "todo",
    title: "WebSocket connection drops frequently",
  },
] satisfies Item[];

// 延迟器
async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// 转行数据
function toAlertRow(item: Item, position: number): NewAlertRow {
  return {
    detailJson: JSON.stringify(item.detail),
    id: item.id,
    position,
    priority: item.priority,
    projectId: item.projectId,
    status: item.status,
    title: item.title,
  };
}

// 转项目行
function toProjectRow(project: StoredProject, position: number): NewProjectRow {
  return {
    id: project.id,
    name: project.name,
    position,
    repoConfigJson: JSON.stringify(project.repoConfig),
    requestMapJson: JSON.stringify(project.requestMap),
  };
}

// 转项目入参
function toProjectInput(input: ProjectInput) {
  return {
    name: input.name.trim(),
    repoConfig: {
      baseBranch: input.repoConfig.baseBranch.trim(),
      provider: input.repoConfig.provider,
      repoName: input.repoConfig.repoName.trim(),
      token: input.repoConfig.token.trim(),
    },
  } satisfies ProjectInput;
}

// 托管目录
function buildManagedRepoPath(projectId: string) {
  return path.join(app.getPath("userData"), "managed-repos", projectId);
}

// 解析令牌
function resolveGithubToken(token: string) {
  return token || getGithubAccessToken();
}

// 外部配置
function toProjectConfig(config: StoredProjectRepoConfig) {
  return {
    baseBranch: config.baseBranch,
    hasToken: config.token.length > 0,
    managedRepoPath: config.managedRepoPath,
    provider: config.provider,
    repoName: config.repoName,
  } satisfies Project["repoConfig"];
}

// 转报警
function toItem(row: AlertRow): Item {
  return {
    detail: JSON.parse(row.detailJson) as Detail,
    id: row.id,
    priority: row.priority,
    projectId: row.projectId,
    status: row.status,
    title: row.title,
  };
}

// 转项目
function toProject(row: ProjectRow): Project {
  const project = toStoredProject(row);

  return {
    id: project.id,
    name: project.name,
    repoConfig: toProjectConfig(project.repoConfig),
    requestMap: project.requestMap,
  };
}

// 转存储项目
function toStoredProject(row: ProjectRow): StoredProject {
  return {
    id: row.id,
    name: row.name,
    repoConfig: JSON.parse(row.repoConfigJson) as StoredProjectRepoConfig,
    requestMap: JSON.parse(row.requestMapJson) as Record<string, CodeRequest>,
  };
}

// 查单条
function getAlertRow(id: string) {
  const db = getDb();
  const row = db.select().from(alertsTable).where(eq(alertsTable.id, id)).get();

  if (!row) {
    throw new Error("Alert not found.");
  }

  return row;
}

// 查项目
function getProjectRow(id: string) {
  const db = getDb();
  const row = db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .get();

  if (!row) {
    throw new Error("Project not found.");
  }

  return row;
}

// 查项目列
function listProjectRows() {
  const db = getDb();

  return db
    .select()
    .from(projectsTable)
    .orderBy(asc(projectsTable.position))
    .all();
}

// 写单条
function updateAlertRow(
  row: AlertRow,
  patch: Partial<Pick<AlertRow, "status">>
) {
  const db = getDb();

  db.update(alertsTable).set(patch).where(eq(alertsTable.id, row.id)).run();

  return toItem({
    ...row,
    ...patch,
  });
}

// 写项目
function updateProjectRow(
  row: ProjectRow,
  patch: Partial<Pick<ProjectRow, "name" | "repoConfigJson" | "requestMapJson">>
) {
  const db = getDb();

  db.update(projectsTable).set(patch).where(eq(projectsTable.id, row.id)).run();

  return toProject({
    ...row,
    ...patch,
  });
}

// 初始化种子
function ensureSeeded() {
  const db = getDb();
  const firstRow = db.select({ id: alertsTable.id }).from(alertsTable).get();

  if (firstRow) {
    return;
  }

  db.insert(projectsTable)
    .values(
      defaultProjects.map((project, index) => toProjectRow(project, index))
    )
    .run();

  db.insert(alertsTable)
    .values(defaultAlerts.map((item, index) => toAlertRow(item, index)))
    .run();
}

// 校验项目
export async function validateProjectConnection(input: ProjectInput) {
  ensureSeeded();
  await delay(180);

  const projectInput = toProjectInput(input);

  if (projectInput.repoConfig.provider !== "github") {
    throw new Error("GitLab integration is not ready.");
  }

  const token = resolveGithubToken(projectInput.repoConfig.token);

  return validateGithubProject(
    projectInput.repoConfig.repoName,
    projectInput.repoConfig.baseBranch,
    token
  );
}

// 面板数据
export async function getDashboardData(): Promise<DashboardData> {
  ensureSeeded();
  await delay(120);

  const db = getDb();
  const alertRows = db
    .select()
    .from(alertsTable)
    .orderBy(asc(alertsTable.position))
    .all();
  const projectRows = db
    .select()
    .from(projectsTable)
    .orderBy(asc(projectsTable.position))
    .all();

  return {
    alerts: alertRows.map(toItem),
    projects: projectRows.map(toProject),
  };
}

// 更新状态
export async function updateAlertStatus(id: string, status: ItemStatus) {
  ensureSeeded();
  await delay(360);

  return updateAlertRow(getAlertRow(id), { status });
}

// 创建项目
export async function createProject(input: ProjectInput) {
  ensureSeeded();
  await delay(240);

  const db = getDb();
  const rows = listProjectRows();
  const projectInput = toProjectInput(input);
  const token = resolveGithubToken(projectInput.repoConfig.token);
  const validated = await validateProjectConnection(projectInput);
  const projectId = randomUUID();
  const storedProject = {
    id: projectId,
    name: projectInput.name,
    repoConfig: {
      baseBranch: validated.baseBranch,
      managedRepoPath: buildManagedRepoPath(projectId),
      provider: validated.provider,
      repoName: validated.repoName,
      token,
    },
    requestMap: {},
  } satisfies StoredProject;

  await cloneGithubRepo({
    baseBranch: storedProject.repoConfig.baseBranch,
    repoName: storedProject.repoConfig.repoName,
    repoPath: storedProject.repoConfig.managedRepoPath,
    token: storedProject.repoConfig.token,
  });

  db.insert(projectsTable)
    .values(toProjectRow(storedProject, rows.length))
    .run();

  return {
    id: storedProject.id,
    name: storedProject.name,
    repoConfig: toProjectConfig(storedProject.repoConfig),
    requestMap: storedProject.requestMap,
  } satisfies Project;
}

// 更新项目
export async function updateProject(id: string, input: ProjectInput) {
  ensureSeeded();
  await delay(240);

  const row = getProjectRow(id);
  const currentProject = toStoredProject(row);
  const projectInput = toProjectInput(input);
  const nextToken =
    projectInput.repoConfig.token ||
    currentProject.repoConfig.token ||
    getGithubAccessToken();

  if (projectInput.repoConfig.provider !== currentProject.repoConfig.provider) {
    throw new Error("Provider change is not supported yet.");
  }

  if (currentProject.repoConfig.provider !== "github") {
    throw new Error("GitLab integration is not ready.");
  }

  if (projectInput.repoConfig.repoName !== currentProject.repoConfig.repoName) {
    throw new Error("Repository change is not supported yet.");
  }

  if (!nextToken) {
    throw new Error("Token is required.");
  }

  await validateGithubProject(
    projectInput.repoConfig.repoName,
    projectInput.repoConfig.baseBranch,
    nextToken
  );

  if (projectInput.repoConfig.token) {
    await updateGithubRemote({
      repoName: currentProject.repoConfig.repoName,
      repoPath: currentProject.repoConfig.managedRepoPath,
      token: projectInput.repoConfig.token,
    });
  }

  return updateProjectRow(row, {
    name: projectInput.name,
    repoConfigJson: JSON.stringify({
      ...currentProject.repoConfig,
      baseBranch: projectInput.repoConfig.baseBranch,
      token: nextToken,
    } satisfies StoredProjectRepoConfig),
  });
}

// 创建PR
export async function createAlertRequest(id: string) {
  ensureSeeded();
  await delay(480);

  const item = toItem(getAlertRow(id));
  const row = getProjectRow(item.projectId);
  const project = toStoredProject(row);
  const request = project.requestMap[item.id];

  if (request) {
    return toProject(row);
  }

  return updateProjectRow(row, {
    requestMapJson: JSON.stringify({
      ...project.requestMap,
      [item.id]: await createRequest(item, project.repoConfig),
    }),
  });
}

// 合并PR
export async function mergeAlertRequest(id: string) {
  ensureSeeded();
  await delay(360);

  const item = toItem(getAlertRow(id));
  const row = getProjectRow(item.projectId);
  const project = toStoredProject(row);
  const request = project.requestMap[item.id];

  if (!request) {
    throw new Error("PR/MR not found.");
  }

  if (request.state !== "open") {
    return toProject(row);
  }

  return updateProjectRow(row, {
    requestMapJson: JSON.stringify({
      ...project.requestMap,
      [item.id]: await mergeRequest(request, project.repoConfig),
    }),
  });
}

// 关闭PR
export async function closeAlertRequest(id: string) {
  ensureSeeded();
  await delay(360);

  const item = toItem(getAlertRow(id));
  const row = getProjectRow(item.projectId);
  const project = toStoredProject(row);
  const request = project.requestMap[item.id];

  if (!request) {
    throw new Error("PR/MR not found.");
  }

  if (request.state !== "open") {
    return toProject(row);
  }

  return updateProjectRow(row, {
    requestMapJson: JSON.stringify({
      ...project.requestMap,
      [item.id]: await closeRequest(request, project.repoConfig),
    }),
  });
}
