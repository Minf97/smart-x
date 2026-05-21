import path from "node:path";
import type { Analysis, CodeLocation, Item } from "@shared/types/alert";
import type { ProjectAiConfig } from "@shared/types/project";
import {
  ANALYSIS_SCHEMA,
  type AnalysisPayload,
  buildAnalysisUserPrompt,
  buildFixPrompt,
} from "./analysis-contract";
import {
  buildPiAgentDir,
  createPiSessionServices,
  readSessionText,
  validatePiAiConfig,
} from "./pi-session";

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

const JSON_CODE_FENCE_RE = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

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
    throw new Error("PI response is not valid JSON.");
  }

  return trimmed.slice(start, end + 1);
}

// 合并位置
function mergeCodeLocations(
  repoPath: string,
  candidateCodeLocations: CodeLocation[],
  aiCodeLocations: AnalysisPayload["codeLocations"]
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
  validatePiAiConfig(aiConfig);

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

    await session.prompt(
      buildAnalysisUserPrompt(item, candidateCodeLocations, true)
    );

    const finalText = responseText.trim() || readSessionText(session.messages);

    if (!finalText) {
      throw new Error("PI response content is empty.");
    }

    const parsed = ANALYSIS_SCHEMA.parse(
      JSON.parse(extractJsonText(finalText))
    );

    return {
      businessImpact: parsed.businessImpact,
      codeLocations: mergeCodeLocations(
        repoPath,
        candidateCodeLocations,
        parsed.codeLocations
      ),
      fixDecision: parsed.fixDecision,
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
  validatePiAiConfig(aiConfig);

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
