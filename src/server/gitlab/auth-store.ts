import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { type GitlabAuthRow, gitlabAuthTable } from "@/server/db/schema";
import type { GitlabAuthState } from "@/types/gitlab";

export interface PendingSession {
  auth: GitlabAuthState | null;
  baseUrl: string;
  clientId: string;
  codeVerifier: string;
  errorMessage: string | null;
  expiresAt: string;
  state: string;
  status: "connected" | "failed" | "pending";
}

const GITLAB_AUTH_ID = "gitlab";
const pendingSessions = new Map<string, PendingSession>();
const pendingStates = new Map<string, string>();

// 查授权行
export function getGitlabAuthRow() {
  const db = getDb();

  return db
    .select()
    .from(gitlabAuthTable)
    .where(eq(gitlabAuthTable.id, GITLAB_AUTH_ID))
    .get();
}

// 存授权行
export function saveGitlabAuthRow(row: GitlabAuthRow) {
  const db = getDb();
  const current = getGitlabAuthRow();

  if (current) {
    db.update(gitlabAuthTable)
      .set(row)
      .where(eq(gitlabAuthTable.id, GITLAB_AUTH_ID))
      .run();
    return;
  }

  db.insert(gitlabAuthTable).values(row).run();
}

// 转连接态
export function toGitlabAuth(row: GitlabAuthRow | undefined): GitlabAuthState {
  if (!row) {
    return {
      avatarUrl: null,
      baseUrl: null,
      clientId: null,
      connected: false,
      login: null,
      name: null,
    };
  }

  return {
    avatarUrl: row.avatarUrl,
    baseUrl: row.baseUrl,
    clientId: row.clientId,
    connected: true,
    login: row.login,
    name: row.name || null,
  };
}

// 当前状态
export function getGitlabAuthState() {
  return toGitlabAuth(getGitlabAuthRow());
}

// 写会话态
export function setPendingSession(sessionId: string, session: PendingSession) {
  pendingSessions.set(sessionId, session);
}

// 读会话态
export function getPendingSession(sessionId: string) {
  return pendingSessions.get(sessionId);
}

// 删会话态
export function deletePendingSession(sessionId: string) {
  pendingSessions.delete(sessionId);
}

// 绑状态码
export function bindPendingState(state: string, sessionId: string) {
  pendingStates.set(state, sessionId);
}

// 查状态码
export function getSessionIdByState(state: string) {
  return pendingStates.get(state);
}

// 删状态码
export function deletePendingState(state: string) {
  pendingStates.delete(state);
}

// 清会话态
export function clearPendingStore() {
  pendingSessions.clear();
  pendingStates.clear();
}
