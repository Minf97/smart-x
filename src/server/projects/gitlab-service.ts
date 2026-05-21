import type { ProjectValidationResult } from "@shared/types/project";
import type { GitlabAuthState, GitlabRepoItem } from "@/types/gitlab";

const GITLAB_REQUEST_TIMEOUT_MS = 12_000;

interface GitlabProjectResponse {
  default_branch: string | null;
  id: number;
  name: string;
  path_with_namespace: string;
  visibility: string;
}

interface GitlabMergeResponse {
  iid: number;
  web_url: string;
}

interface GitlabRequestOptions {
  baseUrl: string;
  body?: Record<string, string>;
  method?: string;
  path: string;
  token: string;
}

interface GitlabMergeInput {
  baseBranch: string;
  baseUrl: string;
  body: string;
  branchName: string;
  repoId?: string; // 项目 ID（优先使用）
  repoName: string;
  title: string;
  token: string;
}

interface GitlabRequestInput {
  baseUrl: string;
  remoteId: string;
  repoId?: string; // 项目 ID（优先使用）
  repoName: string;
  token: string;
}

interface GitlabUserResponse {
  avatar_url: string | null;
  name: string | null;
  username: string;
}

// 整理地址
function normalizeGitlabUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/g, "");
}

// 拼接口址
function buildGitlabUrl(baseUrl: string, path: string) {
  return new URL(path, `${normalizeGitlabUrl(baseUrl)}/`).toString();
}

// 读响应包
async function readGitlabJson<T>(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
    message?: string | string[];
  } & T;

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message;

    throw new Error(message || data?.error || "GitLab request failed.");
  }

  return data as T;
}

// 请求异常
function toGitlabRequestError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return new Error("GitLab timed out. Check GitLab URL and network.");
    }

    if (error.message === "fetch failed") {
      return new Error("GitLab is unreachable. Check GitLab URL and network.");
    }

    return error;
  }

  return new Error("GitLab request failed.");
}

// 发GitLab包
async function requestGitlab<T>(options: GitlabRequestOptions) {
  let response: Response;

  try {
    response = await fetch(buildGitlabUrl(options.baseUrl, options.path), {
      body: options.body ? new URLSearchParams(options.body) : undefined,
      headers: {
        Authorization: `Bearer ${options.token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: options.method || "GET",
      signal: AbortSignal.timeout(GITLAB_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw toGitlabRequestError(error);
  }

  return readGitlabJson<T>(response);
}

// 校验仓库
export async function validateGitlabProject(
  _repoName: string,
  baseBranch: string,
  token: string,
  baseUrl: string,
  repoId: string
): Promise<ProjectValidationResult> {
  const branchId = encodeURIComponent(baseBranch);
  const repo = await requestGitlab<GitlabProjectResponse>({
    baseUrl,
    path: `api/v4/projects/${repoId}`,
    token,
  });

  await requestGitlab({
    baseUrl,
    path: `api/v4/projects/${repoId}/repository/branches/${branchId}`,
    token,
  });

  return {
    baseBranch,
    instanceUrl: normalizeGitlabUrl(baseUrl),
    provider: "gitlab",
    repoName: repo.path_with_namespace,
  };
}

// 创建MR
export async function createGitlabMergeRequest(input: GitlabMergeInput) {
  if (!input.repoId) {
    throw new Error("GitLab repoId is required");
  }

  const request = await requestGitlab<GitlabMergeResponse>({
    baseUrl: input.baseUrl,
    body: {
      description: input.body,
      source_branch: input.branchName,
      target_branch: input.baseBranch,
      title: input.title,
    },
    method: "POST",
    path: `api/v4/projects/${input.repoId}/merge_requests`,
    token: input.token,
  });

  return {
    remoteId: String(request.iid),
    url: request.web_url,
  };
}

// 当前账号
export async function getGitlabViewer(
  token: string,
  baseUrl: string,
  clientId?: string
): Promise<GitlabAuthState> {
  const user = await requestGitlab<GitlabUserResponse>({
    baseUrl,
    path: "api/v4/user",
    token,
  });

  return {
    avatarUrl: user.avatar_url,
    baseUrl: normalizeGitlabUrl(baseUrl),
    clientId: clientId || null,
    connected: true,
    login: user.username,
    name: user.name,
  };
}

// 仓库列表
export async function listGitlabAccessibleRepos(
  token: string,
  baseUrl: string
): Promise<GitlabRepoItem[]> {
  const repos = await requestGitlab<GitlabProjectResponse[]>({
    baseUrl,
    path: "api/v4/projects?membership=true&min_access_level=30&order_by=last_activity_at&per_page=100&simple=true&sort=desc",
    token,
  });

  return repos
    .filter((repo) => repo.default_branch)
    .map((repo) => ({
      defaultBranch: repo.default_branch || "main",
      fullName: repo.path_with_namespace,
      id: repo.id,
      name: repo.name,
      private: repo.visibility !== "public",
    }));
}

// 合并MR
export async function mergeGitlabMergeRequest(input: GitlabRequestInput) {
  if (!input.repoId) {
    throw new Error("GitLab repoId is required");
  }

  const requestId = encodeURIComponent(input.remoteId);

  await requestGitlab({
    baseUrl: input.baseUrl,
    method: "PUT",
    path: `api/v4/projects/${input.repoId}/merge_requests/${requestId}/merge`,
    token: input.token,
  });
}

// 关闭MR
export async function closeGitlabMergeRequest(input: GitlabRequestInput) {
  if (!input.repoId) {
    throw new Error("GitLab repoId is required");
  }

  const requestId = encodeURIComponent(input.remoteId);

  await requestGitlab({
    baseUrl: input.baseUrl,
    body: {
      state_event: "close",
    },
    method: "PUT",
    path: `api/v4/projects/${input.repoId}/merge_requests/${requestId}`,
    token: input.token,
  });
}
