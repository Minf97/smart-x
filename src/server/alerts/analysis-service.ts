import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { CodeLocation, Item } from "@shared/types/alert";

interface LocateAlertLocationsInput {
  item: Item;
  repoPath: string;
}

interface SearchTerm {
  score: number;
  value: string;
}

interface LocationCandidate extends CodeLocation {
  score: number;
}

const CONTEXT_RADIUS = 3;
const CAPITAL_LETTER_RE = /[A-Z]/;
const MAX_FILE_BYTES = 800_000;
const MAX_LOCATIONS = 3;
const MAX_SOURCE_FILES = 4000;
const LINE_SPLIT_RE = /\r?\n/;
const PATH_TOKEN_RE = /\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/g;
const WORD_TOKEN_RE = /[A-Za-z_$][A-Za-z0-9_$.-]{2,}/g;
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".vue",
  ".svelte",
]);
const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);
const STOP_WORDS = new Set([
  "api",
  "app",
  "cannot",
  "client",
  "error",
  "failed",
  "frontend",
  "message",
  "null",
  "production",
  "server",
  "source",
  "timeout",
  "typeerror",
  "undefined",
]);

// 是否有效文本
function isUsefulText(value: string) {
  return value.length >= 4 && value.length <= 240;
}

// 是否存在
async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 转相对路径
function toRelativePath(repoPath: string, filePath: string) {
  return path.relative(repoPath, filePath).replaceAll(path.sep, "/");
}

// 是否源码
function isSourceFile(filePath: string) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

// 收集原始文本
function collectRawTexts(texts: string[], value: unknown, depth: number): void {
  if (depth > 3 || value === null) {
    return;
  }

  if (typeof value === "string") {
    if (isUsefulText(value)) {
      texts.push(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const itemValue of value.slice(0, 20)) {
      collectRawTexts(texts, itemValue, depth + 1);
    }
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, itemValue] of Object.entries(value)) {
    if (key.toLowerCase().includes("stack")) {
      continue;
    }

    collectRawTexts(texts, itemValue, depth + 1);
  }
}

// 列本地源码文件
async function listSourceFiles(repoPath: string) {
  const result: string[] = [];

  async function walk(currentPath: string) {
    if (result.length >= MAX_SOURCE_FILES) {
      return;
    }

    const entries = await readdir(currentPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(absolutePath);
        }
        continue;
      }

      if (entry.isFile() && isSourceFile(entry.name)) {
        result.push(toRelativePath(repoPath, absolutePath));
      }
    }
  }

  await walk(repoPath);

  return result;
}

// 收集报警文本
function collectAlertTexts(item: Item) {
  const texts = [
    item.title,
    item.detail.error.message,
    item.detail.summary.source,
    item.detail.summary.sourceUrl,
  ].filter(Boolean) as string[];
  collectRawTexts(texts, item.detail.error.rawAlert, 0);

  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}

// 加搜索词
function addTerm(terms: Map<string, SearchTerm>, value: string, score: number) {
  const normalized = value.trim();
  const key = normalized.toLowerCase();

  if (normalized.length < 4 || STOP_WORDS.has(key)) {
    return;
  }

  const current = terms.get(key);

  if (!(current && current.score >= score)) {
    terms.set(key, {
      score,
      value: normalized,
    });
  }
}

// 提取搜索词
function buildSearchTerms(item: Item) {
  const terms = new Map<string, SearchTerm>();

  for (const text of collectAlertTexts(item)) {
    if (text.length >= 12 && text.length <= 100) {
      addTerm(terms, text, 40);
    }

    for (const match of text.matchAll(PATH_TOKEN_RE)) {
      addTerm(terms, match[0], 36);
    }

    for (const match of text.matchAll(WORD_TOKEN_RE)) {
      const token = match[0];
      const score = CAPITAL_LETTER_RE.test(token[0]) ? 24 : 14;

      addTerm(terms, token, score);
    }
  }

  return [...terms.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 40);
}

// 代码片段
function buildSnippet(lines: string[], line: number) {
  const start = Math.max(1, line - CONTEXT_RADIUS);
  const end = Math.min(lines.length, line + CONTEXT_RADIUS);

  return lines
    .slice(start - 1, end)
    .map((text, index) => {
      const lineNumber = start + index;
      const marker = lineNumber === line ? ">" : " ";

      return `${marker} ${String(lineNumber).padStart(4, " ")} | ${text}`;
    })
    .join("\n");
}

// 命中行
function findLine(lines: string[], term: string) {
  const lowerTerm = term.toLowerCase();

  for (const [index, line] of lines.entries()) {
    const column = line.toLowerCase().indexOf(lowerTerm);

    if (column !== -1) {
      return {
        column: column + 1,
        line: index + 1,
      };
    }
  }

  return null;
}

// 搜单文件
async function searchFile(
  repoPath: string,
  filePath: string,
  terms: SearchTerm[]
) {
  const absolutePath = path.join(repoPath, filePath);
  let content = "";

  try {
    content = await readFile(absolutePath, "utf8");
  } catch {
    return null;
  }

  if (content.length > MAX_FILE_BYTES) {
    return null;
  }

  const lowerContent = content.toLowerCase();
  const pathText = filePath.toLowerCase();
  const matches = terms.filter((term) => {
    const lowerTerm = term.value.toLowerCase();

    return lowerContent.includes(lowerTerm) || pathText.includes(lowerTerm);
  });

  if (matches.length === 0) {
    return null;
  }

  const lines = content.split(LINE_SPLIT_RE);
  const bestTerm = matches.sort((left, right) => right.score - left.score)[0];
  const hit = findLine(lines, bestTerm.value) ?? { column: undefined, line: 1 };
  const score =
    matches.reduce((total, term) => total + term.score, 0) +
    (pathText.includes(bestTerm.value.toLowerCase()) ? 12 : 0);

  return {
    absolutePath,
    column: hit.column,
    filePath,
    line: hit.line,
    reason: `Matched alert keyword: ${bestTerm.value}`,
    score,
    snippet: buildSnippet(lines, hit.line),
  } satisfies LocationCandidate;
}

// 报警位置
export async function locateAlertCodeLocations({
  item,
  repoPath,
}: LocateAlertLocationsInput): Promise<CodeLocation[]> {
  if (!repoPath.trim()) {
    throw new Error("Local repository path is not configured.");
  }

  if (!(await exists(repoPath))) {
    throw new Error("Local repository path does not exist.");
  }

  const terms = buildSearchTerms(item);

  if (terms.length === 0) {
    return [];
  }

  const candidates: LocationCandidate[] = [];

  for (const filePath of await listSourceFiles(repoPath)) {
    const candidate = await searchFile(repoPath, filePath, terms);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_LOCATIONS)
    .map(({ score: _score, ...location }) => location);
}
