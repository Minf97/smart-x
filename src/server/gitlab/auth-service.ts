import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  getGitlabViewer,
  listGitlabAccessibleRepos,
} from "@/server/projects/gitlab-service";
import type { GitlabOauthFlow, GitlabOauthPoll } from "@/types/gitlab";
import {
  bindPendingState,
  clearPendingStore,
  deletePendingSession,
  deletePendingState,
  getGitlabAuthRow,
  getPendingSession,
  getSessionIdByState,
  getGitlabAuthState as readGitlabAuthState,
  saveGitlabAuthRow,
  setPendingSession,
} from "./auth-store";
import {
  buildAuthorizeUrl,
  buildCallbackHtml,
  createCodeChallenge,
  createCodeVerifier,
  getGitlabCallbackPath,
  getGitlabCallbackPort,
  getGitlabRedirectUri,
  normalizeGitlabBaseUrl,
  normalizeGitlabClientId,
  requestGitlabToken,
} from "./auth-utils";

let callbackServer: Server | null = null;

// 写连接态
async function saveConnectedAuth(input: {
  accessToken: string;
  baseUrl: string;
  clientId: string;
  expiresIn: number;
  refreshToken: string;
}) {
  const expiresAt = new Date(Date.now() + input.expiresIn * 1000).toISOString();
  const auth = await getGitlabViewer(input.accessToken, input.baseUrl);

  saveGitlabAuthRow({
    accessToken: input.accessToken,
    avatarUrl: auth.avatarUrl || "",
    baseUrl: input.baseUrl,
    clientId: input.clientId,
    expiresAt,
    id: "gitlab",
    login: auth.login || "",
    name: auth.name || "",
    refreshToken: input.refreshToken,
  });

  return auth;
}

// 刷新令牌
async function refreshGitlabAuth() {
  const row = getGitlabAuthRow();

  if (!row) {
    throw new Error("GitLab is not connected.");
  }

  if (!row.refreshToken) {
    throw new Error("GitLab refresh token is missing.");
  }

  const result = await requestGitlabToken(row.baseUrl, {
    client_id: row.clientId,
    grant_type: "refresh_token",
    redirect_uri: getGitlabRedirectUri(),
    refresh_token: row.refreshToken,
  });

  if (!(result.access_token && result.refresh_token && result.expires_in)) {
    throw new Error("Failed to refresh GitLab token.");
  }

  await saveConnectedAuth({
    accessToken: result.access_token,
    baseUrl: row.baseUrl,
    clientId: row.clientId,
    expiresIn: result.expires_in,
    refreshToken: result.refresh_token,
  });

  return result.access_token;
}

// 写回调页
function writeCallbackPage(
  response: ServerResponse,
  status: number,
  title: string,
  description: string
) {
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(buildCallbackHtml(title, description));
}

// 读回调态
function resolveCallbackSession(url: URL) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const sessionId = state ? getSessionIdByState(state) : null;

  if (!(state && code && sessionId)) {
    throw new Error("Invalid callback payload.");
  }

  const session = getPendingSession(sessionId);

  if (!session) {
    throw new Error("Authorization session not found.");
  }

  return {
    code,
    session,
    sessionId,
    state,
  };
}

// 完成授权
async function finishCallbackSession(url: URL) {
  const { code, session, sessionId, state } = resolveCallbackSession(url);

  try {
    const result = await requestGitlabToken(session.baseUrl, {
      client_id: session.clientId,
      code,
      code_verifier: session.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: getGitlabRedirectUri(),
    });

    if (!(result.access_token && result.refresh_token && result.expires_in)) {
      throw new Error("GitLab authorization failed.");
    }

    const auth = await saveConnectedAuth({
      accessToken: result.access_token,
      baseUrl: session.baseUrl,
      clientId: session.clientId,
      expiresIn: result.expires_in,
      refreshToken: result.refresh_token,
    });

    setPendingSession(sessionId, {
      ...session,
      auth,
      errorMessage: null,
      status: "connected",
    });
    deletePendingState(state);

    return {
      description: "Authorization is complete. You can return to the app.",
      status: 200,
      title: "GitLab Connected",
    };
  } catch (error) {
    setPendingSession(sessionId, {
      ...session,
      errorMessage:
        error instanceof Error ? error.message : "GitLab authorization failed.",
      status: "failed",
    });
    deletePendingState(state);

    return {
      description:
        error instanceof Error ? error.message : "Authorization failed.",
      status: 400,
      title: "GitLab Error",
    };
  }
}

// 处理回调
async function handleGitlabCallbackRequest(
  request: IncomingMessage,
  response: ServerResponse
) {
  if (!request.url) {
    writeCallbackPage(response, 400, "GitLab Error", "Missing callback URL.");
    return;
  }

  const url = new URL(request.url, getGitlabRedirectUri());

  if (url.pathname !== getGitlabCallbackPath()) {
    writeCallbackPage(response, 404, "Not Found", "Invalid callback path.");
    return;
  }

  const page = await finishCallbackSession(url);

  writeCallbackPage(response, page.status, page.title, page.description);
}

// 启回调服
async function ensureGitlabCallbackServer() {
  if (callbackServer) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const server = createServer((request, response) => {
      handleGitlabCallbackRequest(request, response).catch((error) => {
        writeCallbackPage(
          response,
          500,
          "GitLab Error",
          error instanceof Error ? error.message : "Authorization failed."
        );
      });
    });

    server.once("error", reject);
    server.listen(getGitlabCallbackPort(), "127.0.0.1", () => {
      callbackServer = server;
      resolve();
    });
  });
}

// 当前状态
export function getGitlabAuthState() {
  return readGitlabAuthState();
}

// 当前令牌
export function getGitlabAccessToken() {
  const row = getGitlabAuthRow();

  if (!row) {
    throw new Error("GitLab is not connected.");
  }

  const expiresAt = new Date(row.expiresAt).getTime();

  if (Date.now() < expiresAt - 60_000) {
    return Promise.resolve(row.accessToken);
  }

  return refreshGitlabAuth();
}

// 当前实例址
export function getGitlabInstanceUrl() {
  const row = getGitlabAuthRow();

  if (!row) {
    throw new Error("GitLab is not connected.");
  }

  return row.baseUrl;
}

// 启动授权
export async function startGitlabOauthFlow(
  baseUrl: string,
  clientId: string
): Promise<GitlabOauthFlow> {
  await ensureGitlabCallbackServer();
  const sessionId = randomUUID();
  const state = randomUUID();
  const codeVerifier = createCodeVerifier();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const normalizedBaseUrl = normalizeGitlabBaseUrl(baseUrl);
  const normalizedClientId = normalizeGitlabClientId(clientId);

  setPendingSession(sessionId, {
    auth: null,
    baseUrl: normalizedBaseUrl,
    clientId: normalizedClientId,
    codeVerifier,
    errorMessage: null,
    expiresAt,
    state,
    status: "pending",
  });
  bindPendingState(state, sessionId);

  return {
    authorizeUrl: buildAuthorizeUrl(
      normalizedBaseUrl,
      normalizedClientId,
      state,
      createCodeChallenge(codeVerifier)
    ),
    expiresAt,
    sessionId,
  };
}

// 轮询授权
export function pollGitlabOauthFlow(sessionId: string): GitlabOauthPoll {
  const session = getPendingSession(sessionId);

  if (!session) {
    throw new Error("GitLab authorization session not found.");
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    deletePendingSession(sessionId);
    deletePendingState(session.state);
    throw new Error("GitLab authorization expired.");
  }

  if (session.status === "failed") {
    deletePendingSession(sessionId);
    deletePendingState(session.state);
    throw new Error(session.errorMessage || "GitLab authorization failed.");
  }

  if (session.status !== "connected") {
    return {
      auth: null,
      status: "pending",
    };
  }

  return {
    auth: session.auth,
    status: "connected",
  };
}

// 仓库列表
export async function listConnectedGitlabRepos() {
  const row = getGitlabAuthRow();

  if (!row) {
    throw new Error("GitLab is not connected.");
  }

  const token = await getGitlabAccessToken();

  return listGitlabAccessibleRepos(token, row.baseUrl);
}

// 停回调服
export function stopGitlabCallbackServer() {
  callbackServer?.close();
  callbackServer = null;
  clearPendingStore();
}
