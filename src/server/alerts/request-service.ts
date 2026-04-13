import type { Item } from "@shared/types/alert";
import type {
  CodeRequest,
  StoredProjectRepoConfig,
} from "@shared/types/project";
import { prepareAlertBranch } from "@/server/projects/git-service";
import {
  closeGithubPullRequest,
  createGithubPullRequest,
  mergeGithubPullRequest,
} from "@/server/projects/github-service";

// 标题转码
function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 32);
}

// 分支名
function buildBranchName(item: Item) {
  const slug = slugifyTitle(item.title) || "alert";
  const stamp = new Date()
    .toISOString()
    .replaceAll(/[^0-9]/g, "")
    .slice(0, 14);
  const nonce = Math.random().toString(36).slice(2, 6);

  return `alert/${item.id.toLowerCase()}-${slug}-${stamp}-${nonce}`;
}

// 请求标题
function buildRequestTitle(item: Item) {
  return `[${item.id}] ${item.title}`;
}

// 请求描述
function buildRequestBody(item: Item) {
  return [`Auto created from alert ${item.id}.`, "", item.title].join("\n");
}

// 平台校验
function ensureGithub(config: StoredProjectRepoConfig) {
  if (config.provider !== "github") {
    throw new Error("GitLab integration is not ready.");
  }

  if (!(config.managedRepoPath && config.token)) {
    throw new Error("Project is not connected yet.");
  }
}

// 创建态
export async function createRequest(
  item: Item,
  config: StoredProjectRepoConfig
): Promise<CodeRequest> {
  ensureGithub(config);
  const now = new Date().toISOString();
  const branchName = buildBranchName(item);
  const title = buildRequestTitle(item);

  await prepareAlertBranch({
    baseBranch: config.baseBranch,
    branchName,
    item,
    repoPath: config.managedRepoPath,
  });

  const remote = await createGithubPullRequest({
    baseBranch: config.baseBranch,
    body: buildRequestBody(item),
    branchName,
    repoName: config.repoName,
    title,
    token: config.token,
  });

  return {
    baseBranch: config.baseBranch,
    branchName,
    createdAt: now,
    provider: config.provider,
    remoteId: remote.remoteId,
    repoName: config.repoName,
    state: "open",
    title,
    updatedAt: now,
    url: remote.url,
  };
}

// 合并态
export async function mergeRequest(
  request: CodeRequest,
  config: StoredProjectRepoConfig
): Promise<CodeRequest> {
  ensureGithub(config);
  await mergeGithubPullRequest({
    remoteId: request.remoteId,
    repoName: request.repoName,
    token: config.token,
  });

  return {
    ...request,
    state: "merged",
    updatedAt: new Date().toISOString(),
  };
}

// 关闭态
export async function closeRequest(
  request: CodeRequest,
  config: StoredProjectRepoConfig
): Promise<CodeRequest> {
  ensureGithub(config);
  await closeGithubPullRequest({
    remoteId: request.remoteId,
    repoName: request.repoName,
    token: config.token,
  });

  return {
    ...request,
    state: "closed",
    updatedAt: new Date().toISOString(),
  };
}
