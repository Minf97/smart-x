import {
  BUSINESS_IMPACT_CONFIDENCE_VALUES,
  type CodeLocation,
  FIX_DECISION_ACTION_VALUES,
  type Item,
} from "@shared/types/alert";
import { z } from "zod";

const MAX_RAW_ALERT_LENGTH = 4000;
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

const BUSINESS_IMPACT_SCHEMA = z.object({
  actualBehavior: z.string().trim().min(1),
  affectedSurface: z.string().trim().min(1),
  affectsUser: z.boolean(),
  confidence: z.enum(BUSINESS_IMPACT_CONFIDENCE_VALUES),
  evidence: z.string().trim().min(1),
  expectedBehavior: z.string().trim().min(1),
});
const FIX_DECISION_SCHEMA = z.object({
  action: z.enum(FIX_DECISION_ACTION_VALUES),
  reason: z.string().trim().min(1),
});

// 分析结构
export const ANALYSIS_SCHEMA = z.object({
  businessImpact: BUSINESS_IMPACT_SCHEMA,
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
  fixDecision: FIX_DECISION_SCHEMA,
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

export type AnalysisPayload = z.infer<typeof ANALYSIS_SCHEMA>;

// 收窄文本
function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

// 原始报警
function stringifyRawAlert(rawAlert: unknown) {
  return truncateText(
    JSON.stringify(rawAlert ?? null, null, 2),
    MAX_RAW_ALERT_LENGTH
  );
}

// 上下文包
function buildAnalysisContextPayload(
  item: Item,
  candidateCodeLocations: CodeLocation[]
): unknown {
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

// 系统提示
export function buildAnalysisSystemPrompt() {
  return [
    "You are an expert software incident analyst.",
    "Use only the provided alert and repository context unless tool access is explicitly available.",
    "Return valid JSON only.",
    "First judge whether the stack context affects real user-visible business behavior.",
    "Compare expected behavior with actual behavior before deciding the root cause.",
    "Use create_request only when evidence shows broken product behavior and a minimal fix is available.",
    "Use keep_backlog when impact is not proven, user behavior is unaffected, or this is monitoring noise.",
    "Keep rootCause, impact, and evidence concise and practical.",
    "Choose at most 3 codeLocations from the provided candidates.",
    "Do not invent files or lines that are not present in the candidates.",
    "Give 1 to 3 minimal fixSuggestions.",
    "Each verification should name a concrete unit test or manual check.",
    "You should use Chinese.",
  ].join(" ");
}

// 分析提示
export function buildAnalysisUserPrompt(
  item: Item,
  candidateCodeLocations: CodeLocation[],
  canInspectRepository = false
) {
  return [
    canInspectRepository
      ? "Inspect relevant repository files with read-only tools before answering."
      : "Use the provided context only.",
    "Analyze this alert and return JSON with exactly these keys:",
    "{",
    '  "businessImpact": { "affectsUser": boolean, "expectedBehavior": string, "actualBehavior": string, "affectedSurface": string, "evidence": string, "confidence": "high" | "medium" | "low" },',
    '  "rootCause": string,',
    '  "impact": string,',
    '  "codeLocations": Array<{ "filePath": string, "line"?: number, "column"?: number, "reason"?: string, "symbolName"?: string }>,',
    '  "fixSuggestions": Array<{ "summary": string, "patch"?: string, "risk"?: string, "verification"?: string }>,',
    '  "fixDecision": { "action": "create_request" | "keep_backlog", "reason": string }',
    "}",
    "",
    "Decision steps:",
    "1. Decide whether this error makes users unable to see a DOM node, complete an interaction, load data, or observe expected UI/business behavior.",
    "2. If the expected behavior still holds, or the alert lacks evidence of user-visible impact, set businessImpact.affectsUser=false and fixDecision.action=keep_backlog.",
    "3. If the expected behavior is broken and a minimal code fix is clear, set businessImpact.affectsUser=true and fixDecision.action=create_request.",
    "4. Root cause must cite the error, stack, or candidate code context.",
    "5. Fix suggestions must be minimal and should include a matching unit test when possible.",
    "",
    "Context:",
    JSON.stringify(
      buildAnalysisContextPayload(item, candidateCodeLocations),
      null,
      2
    ),
  ].join("\n");
}

// 修复上下文
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
      businessImpact: item.detail.analysis?.businessImpact ?? null,
      codeLocations: (item.detail.analysis?.codeLocations ?? []).map(
        (location) => ({
          column: location.column,
          filePath: location.filePath,
          line: location.line,
          reason: location.reason,
          snippet: location.snippet,
          symbolName: location.symbolName,
        })
      ),
      fixDecision: item.detail.analysis?.fixDecision ?? null,
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

// 修复提示
export function buildFixPrompt(item: Item) {
  return [
    "You are fixing an alert inside the local repository.",
    "Inspect the repository before editing files.",
    "First read analysis.businessImpact and analysis.fixDecision.",
    "If analysis.fixDecision.action is not create_request, do not edit files.",
    "Compare expectedBehavior and actualBehavior before choosing the fix.",
    "Apply the smallest coherent production code change that restores expected behavior.",
    "Prefer files from analysis.codeLocations when they are relevant.",
    "Add or update a focused unit test when the repository already has a matching test setup.",
    "Do not swallow errors, hide failures, or return fake success.",
    "Do not run git commands.",
    "Do not create branches, commits, or pull requests.",
    "Keep the final answer short and summarize which files you changed.",
    "",
    "Context:",
    JSON.stringify(buildFixContextPayload(item), null, 2),
  ].join("\n");
}
