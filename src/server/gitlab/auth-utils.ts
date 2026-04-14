import { createHash, randomBytes } from "node:crypto";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
}

const GITLAB_CALLBACK_PATH = "/oauth/gitlab/callback";

// 整理地址
export function normalizeGitlabBaseUrl(baseUrl: string) {
  const value = baseUrl.trim();

  if (!value) {
    throw new Error("Missing GitLab base URL.");
  }

  try {
    return new URL(value).toString().replace(/\/+$/g, "");
  } catch {
    throw new Error("Invalid GitLab base URL.");
  }
}

// 整理客户端
export function normalizeGitlabClientId(clientId: string) {
  const value = clientId.trim();

  if (!value) {
    throw new Error("Missing GitLab client ID.");
  }

  return value;
}

// 回调端口
export function getGitlabCallbackPort() {
  const value = process.env.GITLAB_OAUTH_CALLBACK_PORT?.trim();

  if (!value) {
    return 45_913;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Invalid GITLAB_OAUTH_CALLBACK_PORT.");
  }

  return port;
}

// 回调路径
export function getGitlabCallbackPath() {
  return GITLAB_CALLBACK_PATH;
}

// 回调地址
export function getGitlabRedirectUri() {
  return `http://127.0.0.1:${getGitlabCallbackPort()}${GITLAB_CALLBACK_PATH}`;
}

// 表单体
function buildFormBody(input: Record<string, string>) {
  return new URLSearchParams(input);
}

// 授权页址
export function buildAuthorizeUrl(
  baseUrl: string,
  clientId: string,
  state: string,
  codeChallenge: string
) {
  const url = new URL("oauth/authorize", `${normalizeGitlabBaseUrl(baseUrl)}/`);

  url.searchParams.set("client_id", normalizeGitlabClientId(clientId));
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("redirect_uri", getGitlabRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "api read_user");
  url.searchParams.set("state", state);

  return url.toString();
}

// 回调页HTML
export function buildCallbackHtml(title: string, description: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body {
        align-items: center;
        background: #09090b;
        color: #fafafa;
        display: flex;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
      }
      main {
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        max-width: 420px;
        padding: 24px;
        text-align: center;
      }
      p {
        color: rgba(250, 250, 250, 0.72);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${description}</p>
    </main>
  </body>
</html>`;
}

// 造校验码
export function createCodeVerifier() {
  return randomBytes(48).toString("base64url");
}

// 转挑战码
export function createCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

// 读授权包
async function readGitlabAuthJson<T>(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    error_description?: string;
    message?: string;
  } & T;

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.message ||
        data?.error ||
        "GitLab auth request failed."
    );
  }

  return data as T;
}

// 发授权包
export async function requestGitlabToken(
  baseUrl: string,
  input: Record<string, string>
) {
  const response = await fetch(
    new URL("oauth/token", `${normalizeGitlabBaseUrl(baseUrl)}/`),
    {
      body: buildFormBody(input),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    }
  );

  return readGitlabAuthJson<TokenResponse>(response);
}
