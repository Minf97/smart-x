import type { AlertListResponse, AlertSyncAckInput } from "@shared/types/alert";
import { createLogger } from "@shared/logger";

const TRAILING_SLASH_RE = /\/$/;
const REMOTE_REQUEST_TIMEOUT_MS = 12_000;
const logger = createLogger("remote-alert-service");

interface ErrorPayload {
  message?: string;
}

// 读取后端地址
function getBackendBaseUrl() {
  const baseUrl = process.env.ALERTS_BACKEND_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("ALERTS_BACKEND_BASE_URL is required.");
  }

  return baseUrl.replace(TRAILING_SLASH_RE, "");
}

// 读取响应文本
async function readResponseText(response: Response) {
  try {
    return await response.clone().text();
  } catch {
    return "";
  }
}

// 解析接口错误
async function readError(response: Response) {
  const text = await readResponseText(response);

  if (text) {
    try {
      const data = JSON.parse(text) as ErrorPayload;

      if (data?.message) {
        return data.message;
      }
    } catch {
      return text;
    }

    return text;
  }

  return "Remote request failed.";
}

// 请求异常
function toBackendRequestError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return new Error(
        "Remote alerts backend timed out. Check ALERTS_BACKEND_BASE_URL and network."
      );
    }

    if (error.message === "fetch failed") {
      return new Error(
        "Remote alerts backend is unreachable. Check ALERTS_BACKEND_BASE_URL and network."
      );
    }

    return error;
  }

  return new Error("Remote request failed.");
}

// 发后端请求
async function requestBackend(path: string, init?: RequestInit) {
  const method = init?.method || "GET";
  const url = `${getBackendBaseUrl()}${path}`;

  logger.info("request start", {
    body: init?.body,
    method,
    url,
  });

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REMOTE_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw toBackendRequestError(error);
  }

  if (!response.ok) {
    logger.warn("request failed", {
      method,
      response: await readResponseText(response),
      status: response.status,
      url,
    });
    throw new Error(await readError(response));
  }

  logger.info("request success", {
    method,
    status: response.status,
    url,
  });

  return response;
}

// 拉未同步报警
export async function listUnsyncedBackendAlerts(projectId: string) {
  const response = await requestBackend(`/projects/${projectId}/alerts`);

  return (await response.json()) as AlertListResponse;
}

// 确认已同步
export async function ackBackendAlerts(projectId: string, alertIds: string[]) {
  const input = {
    alertIds,
  } satisfies AlertSyncAckInput;
  await requestBackend(`/projects/${projectId}/alerts/sync-ack`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}
