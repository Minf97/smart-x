import { randomUUID } from "node:crypto";
import type {
  CodeRequestCreateProgress,
  CodeRequestCreateStep,
} from "@shared/types/project";

const CODE_REQUEST_PROGRESS_MAP = {
  applyFix: 44,
  commitChanges: 66,
  createRemoteRequest: 84,
  done: 100,
  loadAlert: 8,
  syncBranch: 24,
} as const satisfies Record<CodeRequestCreateStep, number>;

const codeRequestSessions = new Map<string, CodeRequestCreateProgress>();

// 启动会话
export function createCodeRequestProgressSession() {
  const sessionId = randomUUID();

  setCodeRequestProgress(sessionId, "loadAlert");

  return sessionId;
}

// 写进度
export function setCodeRequestProgress(
  sessionId: string,
  step: CodeRequestCreateStep,
  patch: Partial<Omit<CodeRequestCreateProgress, "sessionId" | "step">> = {}
) {
  const current = codeRequestSessions.get(sessionId);

  codeRequestSessions.set(sessionId, {
    errorMessage: current?.errorMessage ?? null,
    progress: CODE_REQUEST_PROGRESS_MAP[step],
    project: current?.project ?? null,
    sessionId,
    status: current?.status ?? "pending",
    step,
    ...patch,
  });
}

// 查进度
export function getCodeRequestProgress(sessionId: string) {
  const session = codeRequestSessions.get(sessionId);

  if (!session) {
    throw new Error("Code request creation session not found.");
  }

  return session;
}
