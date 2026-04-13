import type { Item, ItemStatus } from "@shared/types/alert";
import type { Project, ProjectInput } from "@shared/types/project";
import { ipc } from "@/ipc/manager";
import type { DashboardData } from "@/types/dashboard";
import type {
  GithubAuthState,
  GithubDeviceFlow,
  GithubDevicePoll,
  GithubRepoItem,
} from "@/types/github";

// 请求错
class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

// 服务址
function getApiOrigin() {
  return ipc.client.app.alertsApiOrigin();
}

// 拼地址
async function buildApiUrl(path: string) {
  const origin = await getApiOrigin();

  return new URL(path, origin).toString();
}

// 读结果
async function readJson<T>(response: Response) {
  const data = (await response.json()) as T | { message?: string };

  if (!response.ok) {
    const message = getErrorMessage(data);

    throw new RequestError(message);
  }

  return data as T;
}

// 错误文案
function getErrorMessage(data: TErrorPayload | unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return "Request failed.";
}

interface TErrorPayload {
  message?: string;
}

// 列表请求
export async function listAlerts() {
  const url = await buildApiUrl("/alerts");
  const response = await fetch(url);

  return readJson<DashboardData>(response);
}

// 更新状态
export async function updateAlertStatus(id: string, status: ItemStatus) {
  const url = await buildApiUrl(`/alerts/${id}/status`);
  const response = await fetch(url, {
    body: JSON.stringify({ status }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  return readJson<Item>(response);
}

// 创建PR
export async function createAlertRequest(id: string) {
  const url = await buildApiUrl(`/alerts/${id}/request`);
  const response = await fetch(url, {
    method: "POST",
  });

  return readJson<Project>(response);
}

// 合并PR
export async function mergeAlertRequest(id: string) {
  const url = await buildApiUrl(`/alerts/${id}/request/merge`);
  const response = await fetch(url, {
    method: "POST",
  });

  return readJson<Project>(response);
}

// 关闭PR
export async function closeAlertRequest(id: string) {
  const url = await buildApiUrl(`/alerts/${id}/request/close`);
  const response = await fetch(url, {
    method: "POST",
  });

  return readJson<Project>(response);
}

// GitHub状态
export async function getGithubAuth() {
  const url = await buildApiUrl("/github/auth");
  const response = await fetch(url);

  return readJson<GithubAuthState>(response);
}

// 启动GitHub
export async function startGithubDeviceFlow() {
  const url = await buildApiUrl("/github/device/start");
  const response = await fetch(url, {
    method: "POST",
  });

  return readJson<GithubDeviceFlow>(response);
}

// 轮询GitHub
export async function pollGithubDeviceFlow(sessionId: string) {
  const url = await buildApiUrl(`/github/device/${sessionId}/poll`);
  const response = await fetch(url, {
    method: "POST",
  });

  return readJson<GithubDevicePoll>(response);
}

// GitHub仓库
export async function listGithubRepos() {
  const url = await buildApiUrl("/github/repos");
  const response = await fetch(url);

  return readJson<GithubRepoItem[]>(response);
}

// 创建项目
export async function createProject(input: ProjectInput) {
  const url = await buildApiUrl("/projects");
  const response = await fetch(url, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return readJson<Project>(response);
}

// 更新项目
export async function updateProject(id: string, input: ProjectInput) {
  const url = await buildApiUrl(`/projects/${id}`);
  const response = await fetch(url, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  return readJson<Project>(response);
}
