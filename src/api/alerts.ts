import { ipc } from "@/ipc/manager";
import type { Item, ItemStatus } from "@/types/alert";
import type { DashboardData } from "@/types/dashboard";
import type { Project } from "@/types/project";

let apiOriginPromise: Promise<string> | null = null;

// 请求错
class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

// 服务址
function getApiOrigin() {
  if (!apiOriginPromise) {
    apiOriginPromise = ipc.client.app.alertsApiOrigin().catch((error) => {
      apiOriginPromise = null;
      throw error;
    });
  }

  return apiOriginPromise;
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
