import type { Analysis, CodeLocation, Item } from "@shared/types/alert";
import type { ProjectAiConfig } from "@shared/types/project";
import {
  ANALYSIS_SCHEMA,
  type AnalysisPayload,
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
} from "./analysis-contract";

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

const JSON_CODE_FENCE_RE = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
const VERSION_SUFFIX_RE = /\/v\d+$/u;
const AI_REQUEST_TIMEOUT_MS = 60_000;

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
      return new Error(
        "AI service is unreachable. Check AI base URL and network."
      );
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
  aiCodeLocations: AnalysisPayload["codeLocations"]
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
            content: buildAnalysisSystemPrompt(),
            role: "system",
          },
          {
            content: buildAnalysisUserPrompt(item, candidateCodeLocations),
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
    businessImpact: parsed.businessImpact,
    codeLocations: mergeCodeLocations(
      candidateCodeLocations,
      parsed.codeLocations
    ),
    fixDecision: parsed.fixDecision,
    fixSuggestions: parsed.fixSuggestions,
    impact: parsed.impact,
    rootCause: parsed.rootCause,
  };
}
