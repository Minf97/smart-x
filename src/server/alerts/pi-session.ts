import path from "node:path";
import type { ProjectAiConfig } from "@shared/types/project";
import { app } from "electron";

interface SessionMessage {
  content?: unknown;
  role?: string;
}

const PI_PROVIDER_NAME = "project-ai";

// 校验配置
export function validatePiAiConfig(aiConfig: ProjectAiConfig) {
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

// 规范地址
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

// agent 目录
export function buildPiAgentDir() {
  const userDataPath = app.getPath("userData");

  if (typeof userDataPath === "string" && userDataPath.trim()) {
    return path.join(userDataPath, "pi-agent");
  }

  throw new Error("Electron userData path is not available.");
}

// 创建会话依赖
export async function createPiSessionServices(aiConfig: ProjectAiConfig) {
  const sdk = await import("@mariozechner/pi-coding-agent");
  const authStorage = sdk.AuthStorage.inMemory();

  authStorage.setRuntimeApiKey(PI_PROVIDER_NAME, aiConfig.apiKey.trim());

  // 桥接项目配置
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
        contextWindow: 128_000,
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

// 读取回复
export function readSessionText(messages: SessionMessage[]) {
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
