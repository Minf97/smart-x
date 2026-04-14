import path from "node:path";
import type {
  Detail,
  Item,
  ItemPriority,
  ItemStatus,
  LocalAlertSyncResult,
} from "@shared/types/alert";
import { ITEM_STATUS_VALUES } from "@shared/types/alert";
import {
  type CodeRequest,
  getDefaultProjectAiConfig,
  type Project,
  type ProjectAiConfig,
  type ProjectInput,
  REQUEST_PROVIDER_VALUES,
  type StoredProjectRepoConfig,
} from "@shared/types/project";
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
  getGitlabAccessToken,
  getGitlabInstanceUrl,
} from "@/server/gitlab/auth-service";
import {
  cloneManagedRepo,
  updateManagedRemote,
} from "@/server/projects/git-service";
import { validateGithubProject } from "@/server/projects/github-service";
import { validateGitlabProject } from "@/server/projects/gitlab-service";
import { createBackendProject } from "@/server/projects/remote-project-service";
import type { DashboardData } from "@/types/dashboard";
import {
  ackBackendAlerts,
  listUnsyncedBackendAlerts,
} from "./remote-alert-service";
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
  aiConfig: z.object({
    apiKey: z.string().trim(),
    baseUrl: z.string().trim(),
    model: z.string().trim(),
  }),
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

const MOCK_CREATED_AT = "2026-04-13T08:00:00.000Z";
const MOCK_UPDATED_AT = "2026-04-13T08:30:00.000Z";

// 项目种子
const defaultProjects = [
  {
    aiConfig: getDefaultProjectAiConfig(),
    createdAt: MOCK_CREATED_AT,
    id: "client",
    name: "Client App",
    repoConfig: {
      baseBranch: "main",
      instanceUrl: "https://github.com",
      managedRepoPath: "",
      provider: "github",
      repoName: "demo/client-app",
      token: "",
    },
    requestMap: {},
    updatedAt: MOCK_UPDATED_AT,
    webhookEnabled: false,
    webhookId: "mock-client",
    webhookUrl: "https://mock.local/ingest/client",
  },
  {
    aiConfig: getDefaultProjectAiConfig(),
    createdAt: MOCK_CREATED_AT,
    id: "server",
    name: "Server API",
    repoConfig: {
      baseBranch: "develop",
      instanceUrl: "https://gitlab.local",
      managedRepoPath: "",
      provider: "gitlab",
      repoName: "demo/server-api",
      token: "",
    },
    requestMap: {},
    updatedAt: MOCK_UPDATED_AT,
    webhookEnabled: false,
    webhookId: "mock-server",
    webhookUrl: "https://mock.local/ingest/server",
  },
] satisfies StoredProject[];

// 造报警
function createMockItem(input: {
  detail: Detail;
  id: string;
  priority: ItemPriority;
  projectId: string;
  status: ItemStatus;
  title: string;
}) {
  const groupKey = input.detail.error.groupKey ?? input.id.toLowerCase();

  return {
    createdAt: MOCK_CREATED_AT,
    detail: {
      ...input.detail,
      error: {
        ...input.detail.error,
        groupKey,
        rawAlert: input.detail.error.rawAlert ?? {
          message: input.detail.error.message,
          stack: input.detail.error.stack ?? null,
        },
      },
      summary: {
        ...input.detail.summary,
        occurrenceCount: input.detail.summary.occurrenceCount ?? 1,
      },
    },
    groupKey,
    id: input.id,
    isRead: false,
    isSyncedLocal: true,
    priority: input.priority,
    projectId: input.projectId,
    readAt: null,
    status: input.status,
    syncedAt: MOCK_UPDATED_AT,
    title: input.title,
    updatedAt: MOCK_UPDATED_AT,
  } satisfies Item;
}

// 默认种子
const defaultAlertInputs = [
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
        groupKey: "home-page-map-undefined",
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
        groupKey: "api-users-timeout",
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
        groupKey: "node-worker-memory-leak",
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
        groupKey: "db-pool-exhausted",
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
        groupKey: "payment-rate-limit",
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
        groupKey: "redis-cache-miss",
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
        groupKey: "s3-upload-timeout",
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
        groupKey: "ws-connection-drops",
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
] satisfies Array<{
  detail: Detail;
  id: string;
  priority: ItemPriority;
  projectId: string;
  status: ItemStatus;
  title: string;
}>;

const defaultAlerts = defaultAlertInputs.map(createMockItem);

// 延迟器
async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// 读JSON
function parseJson<T>(value: string) {
  return JSON.parse(value) as T;
}

// 写JSON
function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

// 转行数据
function toAlertRow(item: Item, position: number): NewAlertRow {
  return {
    createdAt: item.createdAt,
    detailJson: stringifyJson(item.detail),
    environment: item.detail.summary.environment ?? null,
    firstSeenAt: item.detail.summary.firstSeenAt ?? null,
    groupKey: item.groupKey,
    id: item.id,
    isRead: item.isRead,
    isSyncedLocal: item.isSyncedLocal,
    lastSeenAt: item.detail.summary.lastSeenAt ?? null,
    message: item.detail.error.message,
    occurrenceCount: item.detail.summary.occurrenceCount ?? 1,
    position,
    priority: item.priority,
    projectId: item.projectId,
    rawAlertJson: stringifyJson(item.detail.error.rawAlert),
    readAt: item.readAt ?? null,
    source: item.detail.summary.source,
    sourceUrl: item.detail.summary.sourceUrl ?? null,
    status: item.status,
    syncedAt: item.syncedAt ?? null,
    stack: item.detail.error.stack ?? null,
    title: item.title,
    updatedAt: item.updatedAt,
  };
}

// 转项目行
function toProjectRow(project: StoredProject, position: number): NewProjectRow {
  return {
    aiConfigJson: stringifyJson(project.aiConfig),
    createdAt: project.createdAt,
    id: project.id,
    name: project.name,
    position,
    repoConfigJson: stringifyJson(project.repoConfig),
    requestMapJson: stringifyJson(project.requestMap),
    updatedAt: project.updatedAt,
    webhookEnabled: project.webhookEnabled,
    webhookId: project.webhookId,
    webhookUrl: project.webhookUrl,
  };
}

// 转项目入参
function toProjectInput(input: ProjectInput) {
  return {
    aiConfig: {
      apiKey: input.aiConfig.apiKey.trim(),
      baseUrl: input.aiConfig.baseUrl.trim(),
      model: input.aiConfig.model.trim(),
    },
    name: input.name.trim(),
    repoConfig: {
      baseBranch: input.repoConfig.baseBranch.trim(),
      provider: input.repoConfig.provider,
      repoName: input.repoConfig.repoName.trim(),
      token: input.repoConfig.token.trim(),
    },
  } satisfies ProjectInput;
}

// AI配置
function toAiConfig(config: ProjectAiConfig) {
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  } satisfies ProjectAiConfig;
}

// 托管目录
function buildManagedRepoPath(projectId: string) {
  return path.join(app.getPath("userData"), "managed-repos", projectId);
}

// 解析令牌
function resolveGithubToken(token: string) {
  return token || getGithubAccessToken();
}

// 解析凭证
async function resolveProjectConnection(
  input: Pick<ProjectInput["repoConfig"], "provider" | "token">
) {
  if (input.provider === "gitlab") {
    return {
      instanceUrl: getGitlabInstanceUrl(),
      token: await getGitlabAccessToken(),
    };
  }

  return {
    instanceUrl: "https://github.com",
    token: resolveGithubToken(input.token),
  };
}

// 外部配置
function toProjectConfig(config: StoredProjectRepoConfig) {
  return {
    baseBranch: config.baseBranch,
    hasToken: config.token.length > 0,
    instanceUrl: config.instanceUrl,
    managedRepoPath: config.managedRepoPath,
    provider: config.provider,
    repoName: config.repoName,
  } satisfies Project["repoConfig"];
}

// 转报警
function toItem(row: AlertRow): Item {
  const detail = parseJson<Detail>(row.detailJson);

  return {
    createdAt: row.createdAt,
    detail: {
      analysis: detail.analysis,
      error: {
        ...detail.error,
        groupKey: row.groupKey,
        message: row.message,
        rawAlert: parseJson<unknown>(row.rawAlertJson),
        stack: row.stack,
      },
      summary: {
        ...detail.summary,
        environment: row.environment,
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        occurrenceCount: row.occurrenceCount,
        source: row.source,
        sourceUrl: row.sourceUrl,
      },
    },
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
function toProject(row: ProjectRow): Project {
  const project = toStoredProject(row);

  return {
    aiConfig: toAiConfig(project.aiConfig),
    createdAt: project.createdAt,
    id: project.id,
    name: project.name,
    repoConfig: toProjectConfig(project.repoConfig),
    requestMap: project.requestMap,
    updatedAt: project.updatedAt,
    webhookEnabled: project.webhookEnabled,
    webhookId: project.webhookId,
    webhookUrl: project.webhookUrl,
  };
}

// 转存储项目
function toStoredProject(row: ProjectRow): StoredProject {
  return {
    aiConfig: parseJson<ProjectAiConfig>(row.aiConfigJson),
    createdAt: row.createdAt,
    id: row.id,
    name: row.name,
    repoConfig: parseJson<StoredProjectRepoConfig>(row.repoConfigJson),
    requestMap: parseJson<Record<string, CodeRequest>>(row.requestMapJson),
    updatedAt: row.updatedAt,
    webhookEnabled: row.webhookEnabled,
    webhookId: row.webhookId,
    webhookUrl: row.webhookUrl,
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

// 查本地的所有 project
function listProjectRows() {
  const db = getDb();

  return db
    .select()
    .from(projectsTable)
    .orderBy(asc(projectsTable.position))
    .all();
}

// 查报警列
function listAlertRows() {
  const db = getDb();

  return db.select().from(alertsTable).orderBy(asc(alertsTable.position)).all();
}

// 写单条
function updateAlertRow(
  row: AlertRow,
  patch: Partial<Pick<AlertRow, "status" | "updatedAt">>
) {
  const db = getDb();

  db.update(alertsTable).set(patch).where(eq(alertsTable.id, row.id)).run();

  return toItem({
    ...row,
    ...patch,
  });
}

// 写远端报警
function writeRemoteAlert(item: Item, position: number) {
  const db = getDb();
  const row = db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.id, item.id))
    .get();
  const nextRow = toAlertRow(item, row?.position ?? position);

  if (!row) {
    db.insert(alertsTable).values(nextRow).run();
    return "inserted";
  }

  db.update(alertsTable).set(nextRow).where(eq(alertsTable.id, item.id)).run();

  return "updated";
}

// 写项目
function updateProjectRow(
  row: ProjectRow,
  patch: Partial<
    Pick<
      ProjectRow,
      | "aiConfigJson"
      | "name"
      | "repoConfigJson"
      | "requestMapJson"
      | "updatedAt"
      | "webhookEnabled"
      | "webhookId"
      | "webhookUrl"
    >
  >
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
  const connection = await resolveProjectConnection(projectInput.repoConfig);

  if (projectInput.repoConfig.provider === "gitlab") {
    return validateGitlabProject(
      projectInput.repoConfig.repoName,
      projectInput.repoConfig.baseBranch,
      connection.token,
      connection.instanceUrl
    );
  }

  return validateGithubProject(
    projectInput.repoConfig.repoName,
    projectInput.repoConfig.baseBranch,
    connection.token
  );
}

// 面板数据
export async function getDashboardData(): Promise<DashboardData> {
  ensureSeeded();
  await delay(120);

  const alertRows = listAlertRows();
  const projectRows = listProjectRows();

  return {
    alerts: alertRows.map(toItem),
    projects: projectRows.map(toProject),
  };
}

// 同步远端报警
export async function syncRemoteAlerts(): Promise<LocalAlertSyncResult> {
  ensureSeeded();

  const projects = listProjectRows()
    .map(toStoredProject)
    // TODO： 这个webhookEnabled 暂时留空，没想好有什么用
    .filter((project) => project.webhookEnabled);
  let acknowledgedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let nextPosition = listAlertRows().length;

  for (const project of projects) {
    const data = await listUnsyncedBackendAlerts(project.id);
    const alertIds = data.alerts.map((item) => item.id);

    if (alertIds.length === 0) {
      continue;
    }

    for (const item of data.alerts) {
      const result = writeRemoteAlert(item, nextPosition);

      if (result === "inserted") {
        insertedCount += 1;
        nextPosition += 1;
      } else {
        updatedCount += 1;
      }
    }

    await ackBackendAlerts(project.id, alertIds);
    acknowledgedCount += alertIds.length;
  }

  return {
    acknowledgedCount,
    insertedCount,
    projectCount: projects.length,
    updatedCount,
  };
}

// 更新状态
export async function updateAlertStatus(id: string, status: ItemStatus) {
  ensureSeeded();
  await delay(360);

  return updateAlertRow(getAlertRow(id), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

// 创建项目
export async function createProject(input: ProjectInput) {
  ensureSeeded();
  await delay(240);

  const db = getDb();
  const rows = listProjectRows();
  const projectInput = toProjectInput(input);
  const connection = await resolveProjectConnection(projectInput.repoConfig);
  const validated = await validateProjectConnection(projectInput);
  const remoteProject = await createBackendProject(projectInput.name);
  const storedProject = {
    aiConfig: projectInput.aiConfig,
    createdAt: remoteProject.createdAt,
    id: remoteProject.id,
    name: remoteProject.name,
    repoConfig: {
      baseBranch: validated.baseBranch,
      instanceUrl: validated.instanceUrl,
      managedRepoPath: buildManagedRepoPath(remoteProject.id),
      provider: validated.provider,
      repoName: validated.repoName,
      token: connection.token,
    },
    requestMap: {},
    updatedAt: remoteProject.updatedAt,
    webhookEnabled: remoteProject.webhookEnabled,
    webhookId: remoteProject.webhookId,
    webhookUrl: remoteProject.webhookUrl,
  } satisfies StoredProject;

  await cloneManagedRepo({
    baseBranch: storedProject.repoConfig.baseBranch,
    instanceUrl: storedProject.repoConfig.instanceUrl,
    provider: storedProject.repoConfig.provider,
    repoName: storedProject.repoConfig.repoName,
    repoPath: storedProject.repoConfig.managedRepoPath,
    token: storedProject.repoConfig.token,
  });

  db.insert(projectsTable)
    .values(toProjectRow(storedProject, rows.length))
    .run();

  return {
    aiConfig: storedProject.aiConfig,
    createdAt: storedProject.createdAt,
    id: storedProject.id,
    name: storedProject.name,
    repoConfig: toProjectConfig(storedProject.repoConfig),
    requestMap: storedProject.requestMap,
    updatedAt: storedProject.updatedAt,
    webhookEnabled: storedProject.webhookEnabled,
    webhookId: storedProject.webhookId,
    webhookUrl: storedProject.webhookUrl,
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
    projectInput.repoConfig.token || currentProject.repoConfig.token;

  if (projectInput.repoConfig.provider !== currentProject.repoConfig.provider) {
    throw new Error("Provider change is not supported yet.");
  }

  if (projectInput.repoConfig.repoName !== currentProject.repoConfig.repoName) {
    throw new Error("Repository change is not supported yet.");
  }

  const connection = await resolveProjectConnection({
    provider: currentProject.repoConfig.provider,
    token: nextToken,
  });

  if (currentProject.repoConfig.provider === "gitlab") {
    await validateGitlabProject(
      projectInput.repoConfig.repoName,
      projectInput.repoConfig.baseBranch,
      connection.token,
      connection.instanceUrl
    );
  } else {
    await validateGithubProject(
      projectInput.repoConfig.repoName,
      projectInput.repoConfig.baseBranch,
      connection.token
    );
  }

  if (currentProject.repoConfig.managedRepoPath) {
    await updateManagedRemote({
      instanceUrl: connection.instanceUrl,
      provider: currentProject.repoConfig.provider,
      repoName: currentProject.repoConfig.repoName,
      repoPath: currentProject.repoConfig.managedRepoPath,
      token: connection.token,
    });
  }

  return updateProjectRow(row, {
    aiConfigJson: JSON.stringify(projectInput.aiConfig),
    name: projectInput.name,
    repoConfigJson: JSON.stringify({
      ...currentProject.repoConfig,
      baseBranch: projectInput.repoConfig.baseBranch,
      instanceUrl: connection.instanceUrl,
      token: connection.token,
    } satisfies StoredProjectRepoConfig),
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
  });
}
