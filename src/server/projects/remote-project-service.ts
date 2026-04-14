import type { ProjectRecord } from "@shared/types/project";

const TRAILING_SLASH_RE = /\/$/;

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

// 解析接口错误
async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (data?.message) {
    return data.message;
  }

  return "Remote request failed.";
}

// 创建后端项目
export async function createBackendProject(name: string) {
  const response = await fetch(`${getBackendBaseUrl()}/projects`, {
    body: JSON.stringify({ name }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as ProjectRecord;
}
