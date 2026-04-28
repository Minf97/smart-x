import type { ProjectRecord } from "@shared/types/project";
import { createLogger } from "@shared/logger";

const TRAILING_SLASH_RE = /\/$/;
const logger = createLogger("remote-project-service");

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

// 发后端请求
async function requestBackend(path: string, init?: RequestInit) {
  const method = init?.method || "GET";
  const url = `${getBackendBaseUrl()}${path}`;

  logger.info("request start", {
    body: init?.body,
    method,
    url,
  });

  const response = await fetch(url, init);

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

// 创建后端项目
export async function createBackendProject(name: string) {
  const response = await requestBackend("/projects", {
    body: JSON.stringify({ name }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return (await response.json()) as ProjectRecord;
}
