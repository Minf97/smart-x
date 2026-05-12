import type { Analysis, CodeLocation, Item } from "@shared/types/alert";
import type { ProjectAiConfig } from "@shared/types/project";
import { z } from "zod";

interface AnalyzeAlertWithAiInput {
  aiConfig: ProjectAiConfig;
  candidateCodeLocations: CodeLocation[];
  item: Item;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            text?: string | null;
            type?: string;
          }>
        | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

const OPTIONAL_POSITIVE_INT = z.preprocess(
  (value) => (value == null ? undefined : value),
  z.number().int().positive().optional()
);
const OPTIONAL_STRING = z.preprocess((value) => {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().trim().min(1).optional());

const ANALYSIS_SCHEMA = z.object({
  codeLocations: z
    .array(
      z.object({
        column: OPTIONAL_POSITIVE_INT,
        filePath: z.string().trim().min(1),
        line: OPTIONAL_POSITIVE_INT,
        reason: OPTIONAL_STRING,
        symbolName: OPTIONAL_STRING,
      })
    )
    .max(3)
    .optional()
    .default([]),
  fixSuggestions: z
    .array(
      z.object({
        patch: OPTIONAL_STRING,
        risk: OPTIONAL_STRING,
        summary: z.string().trim().min(1),
        verification: OPTIONAL_STRING,
      })
    )
    .max(3)
    .optional()
    .default([]),
  impact: z.string().trim().min(1),
  rootCause: z.string().trim().min(1),
});
const JSON_CODE_FENCE_RE = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
const VERSION_SUFFIX_RE = /\/v\d+$/u;
const AI_REQUEST_TIMEOUT_MS = 20_000;

// 取字符串内容
function getMessageContent(data: ChatCompletionResponse) {
  const value = data.choices?.[0]?.message?.content;

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const content = value
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (content) {
      return content;
    }
  }

  throw new Error("AI response content is empty.");
}

// 收窄文本
function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

// 原始报警
function stringifyRawAlert(rawAlert: unknown) {
  try {
    return truncateText(JSON.stringify(rawAlert ?? null, null, 2), 4000);
  } catch {
    return String(rawAlert ?? "");
  }
}

// 上下文包
function buildContextPayload(
  item: Item,
  candidateCodeLocations: CodeLocation[]
) {
  return {
    alert: {
      id: item.id,
      message: item.detail.error.message,
      priority: item.priority,
      source: item.detail.summary.source,
      title: item.title,
    },
    candidateCodeLocations: candidateCodeLocations.map((location) => ({
      column: location.column,
      filePath: location.filePath,
      line: location.line,
      reason: location.reason,
      snippet: location.snippet,
      symbolName: location.symbolName,
    })),
    rawAlert: stringifyRawAlert(item.detail.error.rawAlert),
    summary: {
      environment: item.detail.summary.environment,
      occurrenceCount: item.detail.summary.occurrenceCount,
      sourceUrl: item.detail.summary.sourceUrl,
    },
  };
}

// 系统提示
function buildSystemPrompt() {
  return [
    "You are an expert software incident analyst.",
    "Use only the provided alert and repository context.",
    "Return valid JSON only.",
    "Keep rootCause and impact concise and practical.",
    "Choose at most 3 codeLocations from the provided candidates.",
    "Do not invent files or lines that are not present in the candidates.",
    "Give 1 to 3 minimal fixSuggestions.",
    "You should use Chinese.",
  ].join(" ");
}

// 用户提示
function buildUserPrompt(item: Item, candidateCodeLocations: CodeLocation[]) {
  return [
    "Analyze this alert and return JSON with exactly these keys:",
    "{",
    '  "rootCause": string,',
    '  "impact": string,',
    '  "codeLocations": Array<{ "filePath": string, "line"?: number, "column"?: number, "reason"?: string, "symbolName"?: string }>,',
    '  "fixSuggestions": Array<{ "summary": string, "patch"?: string, "risk"?: string, "verification"?: string }>',
    "}",
    "",
    "Context:",
    JSON.stringify(buildContextPayload(item, candidateCodeLocations), null, 2),
  ].join("\n");
}

// 提取 JSON
function extractJsonText(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(JSON_CODE_FENCE_RE);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || start > end) {
    throw new Error("AI response is not valid JSON.");
  }

  return trimmed.slice(start, end + 1);
}

// 校验 AI 配置
function validateAiConfig(aiConfig: ProjectAiConfig) {
  if (
    !(
      aiConfig.apiKey.trim() &&
      aiConfig.baseUrl.trim() &&
      aiConfig.model.trim()
    )
  ) {
    throw new Error("AI settings are incomplete.");
  }
}

// 请求失败文案
function readErrorMessage(text: string) {
  if (!text) {
    return "AI request failed.";
  }

  try {
    const data = JSON.parse(text) as ChatCompletionResponse;
    return data.error?.message || text;
  } catch {
    return text;
  }
}

// 请求异常
function toAiRequestError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return new Error("AI request timed out. Check AI base URL and network.");
    }

    if (error.message === "fetch failed") {
      return new Error("AI service is unreachable. Check AI base URL and network.");
    }

    return error;
  }

  return new Error("AI request failed.");
}

// 接口地址
function buildChatCompletionUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/g, "");

  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  if (VERSION_SUFFIX_RE.test(normalizedBaseUrl)) {
    return `${normalizedBaseUrl}/chat/completions`;
  }

  return `${normalizedBaseUrl}/v1/chat/completions`;
}

// 解析响应
function parseChatCompletionResponse(text: string) {
  if (!text) {
    throw new Error("AI response body is empty.");
  }

  try {
    return JSON.parse(text) as ChatCompletionResponse;
  } catch {
    throw new Error(`AI response is not valid JSON: ${text.slice(0, 500)}`);
  }
}

// 合并位置
function mergeCodeLocations(
  candidateCodeLocations: CodeLocation[],
  aiCodeLocations: z.infer<typeof ANALYSIS_SCHEMA>["codeLocations"]
) {
  if (aiCodeLocations.length === 0) {
    return candidateCodeLocations;
  }

  return aiCodeLocations.map((location) => {
    const matched = candidateCodeLocations.find(
      (candidate) =>
        candidate.filePath === location.filePath &&
        candidate.line === location.line &&
        candidate.column === location.column
    );

    return {
      ...matched,
      ...location,
    };
  });
}

// AI 分析
export async function analyzeAlertWithAi({
  aiConfig,
  candidateCodeLocations,
  item,
}: AnalyzeAlertWithAiInput): Promise<Analysis> {
  validateAiConfig(aiConfig);
  let response: Response;

  try {
    response = await fetch(buildChatCompletionUrl(aiConfig.baseUrl), {
      body: JSON.stringify({
        messages: [
          {
            content: buildSystemPrompt(),
            role: "system",
          },
          {
            content: buildUserPrompt(item, candidateCodeLocations),
            role: "user",
          },
        ],
        model: aiConfig.model.trim(),
      }),
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw toAiRequestError(error);
  }

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(readErrorMessage(responseText));
  }

  const data = parseChatCompletionResponse(responseText);
  const content = getMessageContent(data);
  const parsed = ANALYSIS_SCHEMA.parse(JSON.parse(extractJsonText(content)));

  return {
    codeLocations: mergeCodeLocations(
      candidateCodeLocations,
      parsed.codeLocations
    ),
    fixSuggestions: parsed.fixSuggestions,
    impact: parsed.impact,
    rootCause: parsed.rootCause,
  };
}
