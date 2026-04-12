import type { Item } from "@/types/alert";
import type { CodeRequest, ProjectRepoConfig } from "@/types/project";

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

// 编号值
function buildRemoteId() {
  return Date.now().toString();
}

// 远端链
function buildRequestUrl(config: ProjectRepoConfig, remoteId: string) {
  if (config.provider === "gitlab") {
    return `https://gitlab.com/${config.repoName}/-/merge_requests/${remoteId}`;
  }

  return `https://github.com/${config.repoName}/pull/${remoteId}`;
}

// 请求标题
function buildRequestTitle(item: Item) {
  return `[${item.id}] ${item.title}`;
}

// 创建态
export function createRequest(
  item: Item,
  config: ProjectRepoConfig
): CodeRequest {
  const now = new Date().toISOString();
  const remoteId = buildRemoteId();

  return rejectMockRequest({
    baseBranch: config.baseBranch,
    branchName: buildBranchName(item),
    createdAt: now,
    provider: config.provider,
    remoteId,
    repoName: config.repoName,
    state: "open",
    title: buildRequestTitle(item),
    updatedAt: now,
    url: buildRequestUrl(config, remoteId),
  });
}

// 拒绝模拟
function rejectMockRequest(_request: CodeRequest): never {
  throw new Error("Real PR/MR integration is not ready.");
}

// 合并态
export function mergeRequest(request: CodeRequest): CodeRequest {
  return {
    ...request,
    state: "merged",
    updatedAt: new Date().toISOString(),
  };
}

// 关闭态
export function closeRequest(request: CodeRequest): CodeRequest {
  return {
    ...request,
    state: "closed",
    updatedAt: new Date().toISOString(),
  };
}
