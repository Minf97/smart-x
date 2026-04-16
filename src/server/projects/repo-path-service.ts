import path from "node:path";
import type { ProjectInput } from "@shared/types/project";
import { app } from "electron";

const REPO_NAME_SPLIT_RE = /[\\/]+/;
const INVALID_PATH_CHARS = new Set(["<", ">", ":", '"', "|", "?", "*"]);

// 清理片段
function sanitizePathSegment(segment: string) {
  const safe = Array.from(segment.trim(), (char) => {
    if (char.charCodeAt(0) < 32 || INVALID_PATH_CHARS.has(char)) {
      return "-";
    }

    return char;
  })
    .join("")
    .replace(/[. ]+$/g, "");

  if (!safe || safe === "." || safe === "..") {
    return "repo";
  }

  return safe;
}

// 拆仓库名
function splitRepoName(repoName: string) {
  const segments = repoName
    .split(REPO_NAME_SPLIT_RE)
    .map(sanitizePathSegment)
    .filter(Boolean);

  return segments.length > 0 ? segments : ["repo"];
}

// 默认路径
function buildManagedRepoPath(
  provider: ProjectInput["repoConfig"]["provider"],
  repoName: string
) {
  return path.join(
    app.getPath("documents"),
    "workspace",
    "managed-repos",
    provider,
    ...splitRepoName(repoName)
  );
}

// 解析路径
export function resolveManagedRepoPath(input: {
  provider: ProjectInput["repoConfig"]["provider"];
  repoName: string;
  repoPath?: string;
}) {
  return (
    input.repoPath?.trim() ||
    buildManagedRepoPath(input.provider, input.repoName)
  );
}
