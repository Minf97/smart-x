import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { type GithubAuthRow, githubAuthTable } from "@/server/db/schema";
import {
  getGithubViewer,
  listGithubAccessibleRepos,
} from "@/server/projects/github-service";
import type {
  GithubAuthState,
  GithubDeviceFlow,
  GithubDevicePoll,
} from "@/types/github";

interface DeviceCodeResponse {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
}

interface PendingSession {
  deviceCode: string;
  expiresAt: string;
  interval: number;
}

interface TokenPollResponse {
  access_token?: string;
  error?: string;
}

const GITHUB_AUTH_ID = "github";
const pendingSessions = new Map<string, PendingSession>();

// 客户端 ID
function getGithubClientId() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error("Missing GITHUB_OAUTH_CLIENT_ID.");
  }

  return clientId;
}

// 表单体
function buildFormBody(input: Record<string, string>) {
  return new URLSearchParams(input);
}

// 读授权包
async function readGithubAuthJson<T>(response: Response) {
  const data = (await response.json()) as {
    error?: string;
    error_description?: string;
  } & T;

  if (!response.ok) {
    throw new Error(
      data.error_description || data.error || "GitHub auth request failed."
    );
  }

  return data as T & {
    error?: string;
  };
}

// 发授权包
async function requestGithubAuth<T>(
  path: string,
  input: Record<string, string>
) {
  const response = await fetch(`https://github.com${path}`, {
    body: buildFormBody(input),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  return readGithubAuthJson<T>(response);
}

// 查授权行
function getGithubAuthRow() {
  const db = getDb();

  return db
    .select()
    .from(githubAuthTable)
    .where(eq(githubAuthTable.id, GITHUB_AUTH_ID))
    .get();
}

// 存授权行
function saveGithubAuthRow(row: GithubAuthRow) {
  const db = getDb();
  const current = getGithubAuthRow();

  if (current) {
    db.update(githubAuthTable)
      .set(row)
      .where(eq(githubAuthTable.id, GITHUB_AUTH_ID))
      .run();
    return;
  }

  db.insert(githubAuthTable).values(row).run();
}

// 转状态
function toGithubAuth(row: GithubAuthRow | undefined): GithubAuthState {
  if (!row) {
    return {
      avatarUrl: null,
      connected: false,
      login: null,
      name: null,
    };
  }

  return {
    avatarUrl: row.avatarUrl,
    connected: true,
    login: row.login,
    name: row.name || null,
  };
}

// 当前授权
export function getGithubAuthState() {
  return toGithubAuth(getGithubAuthRow());
}

// 当前令牌
export function getGithubAccessToken() {
  const row = getGithubAuthRow();

  if (!row) {
    throw new Error("GitHub is not connected.");
  }

  return row.accessToken;
}

// 启动授权
export async function startGithubDeviceFlow(): Promise<GithubDeviceFlow> {
  const result = await requestGithubAuth<DeviceCodeResponse>(
    "/login/device/code",
    {
      client_id: getGithubClientId(),
      scope: "repo read:user",
    }
  );
  const sessionId = randomUUID();
  const expiresAt = new Date(
    Date.now() + result.expires_in * 1000
  ).toISOString();

  pendingSessions.set(sessionId, {
    deviceCode: result.device_code,
    expiresAt,
    interval: result.interval,
  });

  return {
    expiresAt,
    interval: result.interval,
    sessionId,
    userCode: result.user_code,
    verificationUri: result.verification_uri,
  };
}

// 轮询授权
export async function pollGithubDeviceFlow(
  sessionId: string
): Promise<GithubDevicePoll> {
  const session = pendingSessions.get(sessionId);

  if (!session) {
    throw new Error("GitHub authorization session not found.");
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    pendingSessions.delete(sessionId);
    throw new Error("GitHub authorization expired.");
  }

  const result = await requestGithubAuth<TokenPollResponse>(
    "/login/oauth/access_token",
    {
      client_id: getGithubClientId(),
      device_code: session.deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }
  );

  if (result.error === "authorization_pending") {
    return {
      auth: null,
      interval: session.interval,
      status: "pending",
    };
  }

  if (result.error === "slow_down") {
    session.interval += 5;
    pendingSessions.set(sessionId, session);

    return {
      auth: null,
      interval: session.interval,
      status: "pending",
    };
  }

  if (!result.access_token) {
    pendingSessions.delete(sessionId);
    throw new Error(result.error || "GitHub authorization failed.");
  }

  const auth = await getGithubViewer(result.access_token);

  saveGithubAuthRow({
    accessToken: result.access_token,
    avatarUrl: auth.avatarUrl || "",
    id: GITHUB_AUTH_ID,
    login: auth.login || "",
    name: auth.name || "",
  });
  pendingSessions.delete(sessionId);

  return {
    auth,
    interval: session.interval,
    status: "connected",
  };
}

// 仓库列表
export function listConnectedGithubRepos() {
  return listGithubAccessibleRepos(getGithubAccessToken());
}
