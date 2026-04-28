import path from "node:path";
import type { Analysis, CodeLocation, Item } from "@shared/types/alert";
import type { ProjectAiConfig } from "@shared/types/project";
import { app } from "electron";
import { z } from "zod";

interface AnalyzeAlertWithPiInput {
  aiConfig: ProjectAiConfig;
  candidateCodeLocations: CodeLocation[];
  item: Item;
  repoPath: string;
}

interface ApplyAlertFixWithPiInput {
  aiConfig: ProjectAiConfig;
  item: Item;
  repoPath: string;
}

interface SessionMessage {
  content?: unknown;
  role?: string;
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
const MAX_RAW_ALERT_LENGTH = 4000;
const PI_PROVIDER_NAME = "project-ai";

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

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function stringifyRawAlert(rawAlert: unknown) {
  try {
    return truncateText(JSON.stringify(rawAlert ?? null, null, 2), MAX_RAW_ALERT_LENGTH);
  } catch {
    return String(rawAlert ?? "");
  }
}

function normalizeProviderBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/g, "");

  // pi provider 需要的是根地址，用户配置里可能已经带了具体 endpoint。
  if (normalized.endsWith("/chat/completions")) {
    return normalized.slice(0, -"/chat/completions".length);
  }

  if (normalized.endsWith("/responses")) {
    return normalized.slice(0, -"/responses".length);
  }

  return normalized;
}

function buildPiAgentDir() {
  try {
    const userDataPath = app.getPath("userData");

    // 正常情况下把 pi 会话状态放在 Electron 用户目录下。
    if (typeof userDataPath === "string" && userDataPath.trim()) {
      return path.join(userDataPath, "pi-agent");
    }
  } catch {}

  // 启动早期或重启阶段拿不到 userData 时，退回当前工作目录。
  return path.join(process.cwd(), ".pi-agent");
}

async function createPiSessionServices(aiConfig: ProjectAiConfig) {
  const sdk = await import("@mariozechner/pi-coding-agent");
  const authStorage = sdk.AuthStorage.inMemory();

  authStorage.setRuntimeApiKey(PI_PROVIDER_NAME, aiConfig.apiKey.trim());

  // 把项目里的 AI 配置桥接成 pi 可识别的 provider。
  const modelRegistry = sdk.ModelRegistry.inMemory(authStorage);
  modelRegistry.registerProvider(PI_PROVIDER_NAME, {
    api: "openai-completions",
    apiKey: aiConfig.apiKey.trim(),
    baseUrl: normalizeProviderBaseUrl(aiConfig.baseUrl),
    models: [
      {
        compat: {
          maxTokensField: "max_tokens",
          supportsDeveloperRole: false,
          supportsStore: false,
        },
        contextWindow: 128000,
        cost: {
          cacheRead: 0,
          cacheWrite: 0,
          input: 0,
          output: 0,
        },
        id: aiConfig.model.trim(),
        input: ["text"],
        maxTokens: 8192,
        name: aiConfig.model.trim(),
        reasoning: false,
      },
    ],
  });

  const model = modelRegistry.find(PI_PROVIDER_NAME, aiConfig.model.trim());

  if (!model) {
    throw new Error("PI model is not available.");
  }

  return {
    ...sdk,
    authStorage,
    model,
    modelRegistry,
    settingsManager: sdk.SettingsManager.inMemory({
      compaction: { enabled: false },
    }),
  };
}

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
      sourceUrl: item.detail.summary.sourceUrl,
      stack: item.detail.error.stack,
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

function buildPiPrompt(item: Item, candidateCodeLocations: CodeLocation[]) {
  return [
    "You are analyzing an alert inside the local repository.",
    "You can inspect the repository with tools before answering.",
    "Use the provided candidateCodeLocations only as hints, not as guaranteed truth.",
    "Return valid JSON only, with exactly these keys:",
    "{",
    '  "rootCause": string,',
    '  "impact": string,',
    '  "codeLocations": Array<{ "filePath": string, "line"?: number, "column"?: number, "reason"?: string, "symbolName"?: string }>,',
    '  "fixSuggestions": Array<{ "summary": string, "patch"?: string, "risk"?: string, "verification"?: string }>',
    "}",
    "Rules:",
    "- Use Chinese.",
    "- Inspect the repo with read-only tools before concluding.",
    "- Choose at most 3 codeLocations.",
    "- Prefer repository-relative filePath values.",
    "- If a field is unknown, omit it instead of using null.",
    "- Keep rootCause and impact concise and practical.",
    "",
    "Context:",
    JSON.stringify(buildContextPayload(item, candidateCodeLocations), null, 2),
  ].join("\n");
}

function buildFixContextPayload(item: Item) {
  return {
    alert: {
      id: item.id,
      message: item.detail.error.message,
      priority: item.priority,
      source: item.detail.summary.source,
      sourceUrl: item.detail.summary.sourceUrl,
      stack: item.detail.error.stack,
      title: item.title,
    },
    analysis: {
      codeLocations: (item.detail.analysis?.codeLocations ?? []).map((location) => ({
        column: location.column,
        filePath: location.filePath,
        line: location.line,
        reason: location.reason,
        snippet: location.snippet,
        symbolName: location.symbolName,
      })),
      fixSuggestions: item.detail.analysis?.fixSuggestions ?? [],
      impact: item.detail.analysis?.impact ?? "",
      rootCause: item.detail.analysis?.rootCause ?? "",
    },
    rawAlert: stringifyRawAlert(item.detail.error.rawAlert),
    summary: {
      environment: item.detail.summary.environment,
      occurrenceCount: item.detail.summary.occurrenceCount,
      sourceUrl: item.detail.summary.sourceUrl,
    },
  };
}

function buildFixPrompt(item: Item) {
  return [
    "You are fixing an alert inside the local repository.",
    "Inspect the repository before editing files.",
    "Apply the smallest coherent production code change that addresses the alert.",
    "Prefer files from analysis.codeLocations when they are relevant.",
    "Do not run git commands.",
    "Do not create branches, commits, or pull requests.",
    "Keep the final answer short and summarize which files you changed.",
    "",
    "Context:",
    JSON.stringify(buildFixContextPayload(item), null, 2),
  ].join("\n");
}

function extractJsonText(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(JSON_CODE_FENCE_RE);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || start > end) {
    throw new Error("PI response is not valid JSON.");
  }

  return trimmed.slice(start, end + 1);
}

function readSessionText(messages: SessionMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "assistant" || !Array.isArray(message.content)) {
      continue;
    }

    const text = message.content
      .map((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          item.type === "text" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return "";
      })
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function mergeCodeLocations(
  repoPath: string,
  candidateCodeLocations: CodeLocation[],
  aiCodeLocations: z.infer<typeof ANALYSIS_SCHEMA>["codeLocations"]
) {
  if (aiCodeLocations.length === 0) {
    return candidateCodeLocations;
  }

  return aiCodeLocations.map((location) => {
    const matched =
      candidateCodeLocations.find(
        (candidate) =>
          candidate.filePath === location.filePath &&
          candidate.line === location.line &&
          candidate.column === location.column
      ) ??
      candidateCodeLocations.find(
        (candidate) =>
          candidate.filePath === location.filePath &&
          candidate.line === location.line
      ) ??
      candidateCodeLocations.find(
        (candidate) => candidate.filePath === location.filePath
      );

    return {
      // 尽量复用本地检索阶段已经拿到的绝对路径和补充字段。
      absolutePath:
        matched?.absolutePath ??
        (path.isAbsolute(location.filePath)
          ? location.filePath
          : path.join(repoPath, location.filePath)),
      ...matched,
      ...location,
    };
  });
}

export async function analyzeAlertWithPi({
  aiConfig,
  candidateCodeLocations,
  item,
  repoPath,
}: AnalyzeAlertWithPiInput): Promise<Analysis> {
  validateAiConfig(aiConfig);

  if (!repoPath.trim()) {
    throw new Error("Local repository path is not configured.");
  }

  const {
    createAgentSession,
    createReadOnlyTools,
    DefaultResourceLoader,
    SessionManager,
    authStorage,
    model,
    modelRegistry,
    settingsManager,
  } = await createPiSessionServices(aiConfig);
  const resourceLoader = new DefaultResourceLoader({
    agentDir: buildPiAgentDir(),
    appendSystemPrompt: [
      "You are an alert-analysis agent embedded in an Electron app.",
      "You may inspect the repository with read-only tools.",
      "Never modify files.",
      "Return JSON only.",
    ],
    cwd: repoPath,
    settingsManager,
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    agentDir: buildPiAgentDir(),
    authStorage,
    cwd: repoPath,
    model,
    modelRegistry,
    resourceLoader,
    sessionManager: SessionManager.inMemory(),
    settingsManager,
    thinkingLevel: "off",
    tools: createReadOnlyTools(repoPath),
  });

  let responseText = "";

  try {
    // 优先收集流式文本；拿不到 delta 时再回退到 session.messages。
    session.subscribe((event) => {
      if (
        event.type === "message_update" &&
        event.assistantMessageEvent.type === "text_delta"
      ) {
        responseText += event.assistantMessageEvent.delta;
      }
    });

    await session.prompt(buildPiPrompt(item, candidateCodeLocations));

    const finalText = responseText.trim() || readSessionText(session.messages);

    if (!finalText) {
      throw new Error("PI response content is empty.");
    }

    const parsed = ANALYSIS_SCHEMA.parse(JSON.parse(extractJsonText(finalText)));

    return {
      codeLocations: mergeCodeLocations(
        repoPath,
        candidateCodeLocations,
        parsed.codeLocations
      ),
      fixSuggestions: parsed.fixSuggestions,
      impact: parsed.impact,
      rootCause: parsed.rootCause,
    };
  } finally {
    session.dispose();
  }
}

export async function applyAlertFixWithPi({
  aiConfig,
  item,
  repoPath,
}: ApplyAlertFixWithPiInput) {
  validateAiConfig(aiConfig);

  if (!repoPath.trim()) {
    throw new Error("Local repository path is not configured.");
  }

  if (!item.detail.analysis) {
    throw new Error("Alert analysis is missing.");
  }

  const {
    createAgentSession,
    createEditTool,
    createFindTool,
    createGrepTool,
    createLsTool,
    createReadTool,
    createWriteTool,
    DefaultResourceLoader,
    SessionManager,
    authStorage,
    model,
    modelRegistry,
    settingsManager,
  } = await createPiSessionServices(aiConfig);

  const resourceLoader = new DefaultResourceLoader({
    agentDir: buildPiAgentDir(),
    appendSystemPrompt: [
      "You are a fix-generation agent embedded in an Electron app.",
      "You may inspect and modify repository files with tools.",
      "Do not run git commands.",
      "Keep changes minimal and consistent with the existing codebase.",
    ],
    cwd: repoPath,
    settingsManager,
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    agentDir: buildPiAgentDir(),
    authStorage,
    cwd: repoPath,
    model,
    modelRegistry,
    resourceLoader,
    sessionManager: SessionManager.inMemory(),
    settingsManager,
    thinkingLevel: "off",
    tools: [
      createReadTool(repoPath),
      createGrepTool(repoPath),
      createFindTool(repoPath),
      createLsTool(repoPath),
      createEditTool(repoPath),
      createWriteTool(repoPath),
    ],
  });

  try {
    await session.prompt(buildFixPrompt(item));
  } finally {
    session.dispose();
  }
}
