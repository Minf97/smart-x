import { randomUUID } from "node:crypto";
import type {
  ProjectCreateProgress,
  ProjectCreateStep,
} from "@shared/types/project";

const PROJECT_CREATE_PROGRESS_MAP = {
  cloneManagedRepo: 80,
  createBackendProject: 56,
  done: 100,
  listProjectRows: 12,
  saveProject: 94,
  validateProjectConnection: 34,
} as const satisfies Record<ProjectCreateStep, number>;

const createProjectSessions = new Map<string, ProjectCreateProgress>();

// 启动会话
export function createProjectProgressSession() {
  const sessionId = randomUUID();

  setCreateProjectProgress(sessionId, "listProjectRows");

  return sessionId;
}

// 写进度
export function setCreateProjectProgress(
  sessionId: string,
  step: ProjectCreateStep,
  patch: Partial<Omit<ProjectCreateProgress, "sessionId" | "step">> = {}
) {
  const current = createProjectSessions.get(sessionId);

  createProjectSessions.set(sessionId, {
    errorMessage: current?.errorMessage ?? null,
    progress: PROJECT_CREATE_PROGRESS_MAP[step],
    project: current?.project ?? null,
    sessionId,
    status: current?.status ?? "pending",
    step,
    ...patch,
  });
}

// 查进度
export function getCreateProjectProgress(sessionId: string) {
  const session = createProjectSessions.get(sessionId);

  if (!session) {
    throw new Error("Project creation session not found.");
  }

  return session;
}
