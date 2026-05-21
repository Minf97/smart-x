import type { ProjectValidationResult } from "@shared/types/project";
import type { GithubAuthState, GithubRepoItem } from "@/types/github";

const GITHUB_REQUEST_TIMEOUT_MS = 12_000;

interface GithubRepoResponse {
  default_branch: string;
  full_name: string;
  id: number;
  name: string;
  permissions?: {
    push?: boolean;
  };
  private: boolean;
}

interface GithubUserResponse {
  avatar_url: string | null;
  default_branch: string;
  full_name: string;
  login: string;
  name: string | null;
}

interface GithubPullResponse {
  html_url: string;
  number: number;
}

interface GithubRequestOptions {
  body?: unknown;
  method?: string;
  path: string;
  token: string;
}

interface GithubPullInput {
  baseBranch: string;
  body: string;
  branchName: string;
  repoName: string;
  title: string;
  token: string;
}

interface GithubRequestInput {
  remoteId: string;
  repoName: string;
  token: string;
}

// 读结果
async function readGithubJson<T>(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    message?: string;
  } & T;

  if (!response.ok) {
    throw new Error(data?.message || "GitHub request failed.");
  }

  return data as T;
}

// 请求异常
function toGithubRequestError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return new Error("GitHub timed out. Check GitHub network access.");
    }

    if (error.message === "fetch failed") {
      return new Error("GitHub is unreachable. Check GitHub network access.");
    }

    return error;
  }

  return new Error("GitHub request failed.");
}

// 读 GitHub
async function requestGithub<T>(options: GithubRequestOptions) {
  let response: Response;

  try {
    response = await fetch(`https://api.github.com${options.path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${options.token}`,
        "Content-Type": "application/json",
        "User-Agent": "electron-shadcn",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      method: options.method || "GET",
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw toGithubRequestError(error);
  }

  return readGithubJson<T>(response);
}

// 校验仓库
export async function validateGithubProject(
  repoName: string,
  baseBranch: string,
  token: string
): Promise<ProjectValidationResult> {
  const repo = await requestGithub<GithubRepoResponse>({
    path: `/repos/${repoName}`,
    token,
  });

  await requestGithub({
    path: `/repos/${repoName}/branches/${baseBranch}`,
    token,
  });

  return {
    baseBranch,
    instanceUrl: "https://github.com",
    provider: "github",
    repoName: repo.full_name,
  };
}

// 创建 PR
export async function createGithubPullRequest(input: GithubPullInput) {
  const request = await requestGithub<GithubPullResponse>({
    body: {
      base: input.baseBranch,
      body: input.body,
      head: input.branchName,
      title: input.title,
    },
    method: "POST",
    path: `/repos/${input.repoName}/pulls`,
    token: input.token,
  });

  return {
    remoteId: String(request.number),
    url: request.html_url,
  };
}

// 当前账号
export async function getGithubViewer(token: string): Promise<GithubAuthState> {
  const user = await requestGithub<GithubUserResponse>({
    path: "/user",
    token,
  });

  return {
    avatarUrl: user.avatar_url,
    connected: true,
    login: user.login,
    name: user.name,
  };
}

// 仓库列表
export async function listGithubAccessibleRepos(
  token: string
): Promise<GithubRepoItem[]> {
  const repos = await requestGithub<GithubRepoResponse[]>({
    path: "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    token,
  });

  return repos
    .filter((repo) => repo.permissions?.push)
    .map((repo) => ({
      defaultBranch: repo.default_branch,
      fullName: repo.full_name,
      id: repo.id,
      name: repo.name,
      private: repo.private,
    }));
}

// 合并 PR
export async function mergeGithubPullRequest(input: GithubRequestInput) {
  await requestGithub({
    body: {
      merge_method: "merge",
    },
    method: "PUT",
    path: `/repos/${input.repoName}/pulls/${input.remoteId}/merge`,
    token: input.token,
  });
}

// 关闭 PR
export async function closeGithubPullRequest(input: GithubRequestInput) {
  await requestGithub({
    body: {
      state: "closed",
    },
    method: "PATCH",
    path: `/repos/${input.repoName}/pulls/${input.remoteId}`,
    token: input.token,
  });
}
