import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Item } from "@shared/types/alert";
import type { RequestProvider } from "@shared/types/project";

interface GitRunOptions {
  cwd?: string;
}

interface CloneRepoOptions {
  baseBranch: string;
  instanceUrl: string;
  provider: RequestProvider;
  repoName: string;
  repoPath: string;
  token: string;
}

interface PrepareBranchOptions {
  baseBranch: string;
  branchName: string;
  repoPath: string;
}

interface UpdateRemoteOptions {
  instanceUrl: string;
  provider: RequestProvider;
  repoName: string;
  repoPath: string;
  token: string;
}

interface SyncBaseBranchOptions extends UpdateRemoteOptions {
  baseBranch: string;
}

type ManagedRepoOptions = CloneRepoOptions;

interface CommitAlertChangesOptions {
  allowEmpty?: boolean;
  item: Item;
  repoPath: string;
}

interface PushBranchOptions {
  branchName: string;
  repoPath: string;
}

// 跑 git
function runGit(args: string[], options: GitRunOptions = {}) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd: options.cwd,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || stdout.trim() || error.message));
          return;
        }

        resolve(stdout.trim());
      }
    );
  });
}

// 整理地址
function normalizeRemoteUrl(instanceUrl: string) {
  return instanceUrl.trim().replace(/\/+$/g, "");
}

// GitHub链
function buildGithubRemoteUrl(
  repoName: string,
  token: string,
  instanceUrl: string
) {
  const url = new URL(`${repoName}.git`, `${normalizeRemoteUrl(instanceUrl)}/`);

  url.username = "x-access-token";
  url.password = token;

  return url.toString();
}

// GitLab链
function buildGitlabRemoteUrl(
  repoName: string,
  token: string,
  instanceUrl: string
) {
  const url = new URL(`${repoName}.git`, `${normalizeRemoteUrl(instanceUrl)}/`);

  url.username = "oauth2";
  url.password = token;

  return url.toString();
}

// 远端链
function buildRemoteUrl(options: {
  instanceUrl: string;
  provider: RequestProvider;
  repoName: string;
  token: string;
}) {
  if (options.provider === "gitlab") {
    return buildGitlabRemoteUrl(
      options.repoName,
      options.token,
      options.instanceUrl
    );
  }

  return buildGithubRemoteUrl(
    options.repoName,
    options.token,
    options.instanceUrl
  );
}

// 提交文案
function buildCommitMessage(item: Item) {
  return `chore(alert): ${item.id} ${item.title}`;
}

// 工作区状态
async function getWorkingTreeStatus(repoPath: string) {
  return runGit(["status", "--short"], {
    cwd: repoPath,
  });
}

// 校验路径
function ensureRepoPath(repoPath: string) {
  if (!repoPath.trim()) {
    throw new Error("Local repository path is not configured.");
  }
}

// 拉取基线
async function pullBaseBranch(repoPath: string, baseBranch: string) {
  await runGit(["fetch", "origin"], {
    cwd: repoPath,
  });
  await runGit(["checkout", baseBranch], {
    cwd: repoPath,
  });
  await runGit(["pull", "--rebase=false", "origin", baseBranch], {
    cwd: repoPath,
  });
}

// 校验 git
export async function ensureGit() {
  await runGit(["--version"]);
}

// 拉取仓库
export async function cloneManagedRepo(options: CloneRepoOptions) {
  await ensureGit();
  ensureRepoPath(options.repoPath);
  await mkdir(path.dirname(options.repoPath), {
    recursive: true,
  });
  await runGit([
    "clone",
    "--branch",
    options.baseBranch,
    buildRemoteUrl(options),
    options.repoPath,
  ]);
}

// 是否仓库
async function isGitRepository(repoPath: string) {
  ensureRepoPath(repoPath);

  try {
    await runGit(["rev-parse", "--is-inside-work-tree"], {
      cwd: repoPath,
    });
    return true;
  } catch {
    return false;
  }
}

// 更新远端
export async function updateManagedRemote(options: UpdateRemoteOptions) {
  await ensureGit();
  ensureRepoPath(options.repoPath);
  await runGit(["remote", "set-url", "origin", buildRemoteUrl(options)], {
    cwd: options.repoPath,
  });
}

// 同步基线
export async function syncManagedRepoBaseBranch(options: SyncBaseBranchOptions) {
  await updateManagedRemote(options);
  await ensureCleanWorkingTree(options.repoPath);
  await pullBaseBranch(options.repoPath, options.baseBranch);
}

// 确保仓库
export async function ensureManagedRepo(options: ManagedRepoOptions) {
  if (!(await isGitRepository(options.repoPath))) {
    await cloneManagedRepo(options);
    return;
  }

  await updateManagedRemote(options);
  await pullBaseBranch(options.repoPath, options.baseBranch);
}

// 校验工作区干净，避免覆盖掉用户还没提交的改动。
export async function ensureCleanWorkingTree(repoPath: string) {
  ensureRepoPath(repoPath);

  const status = await getWorkingTreeStatus(repoPath);

  if (status.trim()) {
    throw new Error("Managed repository has uncommitted changes.");
  }
}

// 准备分支
export async function prepareAlertBranch(options: PrepareBranchOptions) {
  await ensureGit();
  await ensureCleanWorkingTree(options.repoPath);
  await pullBaseBranch(options.repoPath, options.baseBranch);
  await runGit(["checkout", "-B", options.branchName], {
    cwd: options.repoPath,
  });
}

// 提交改动
export async function commitAlertChanges(options: CommitAlertChangesOptions) {
  await runGit(["add", "-A"], {
    cwd: options.repoPath,
  });

  const status = await getWorkingTreeStatus(options.repoPath);

  if (!options.allowEmpty && !status.trim()) {
    throw new Error("No code changes were generated for this alert.");
  }

  await runGit(
    [
      "-c",
      "user.name=Alert Agent",
      "-c",
      "user.email=alert-agent@local",
      "commit",
      ...(options.allowEmpty ? ["--allow-empty"] : []),
      "-m",
      buildCommitMessage(options.item),
    ],
    {
      cwd: options.repoPath,
    }
  );
}

// 推分支
export async function pushAlertBranch(options: PushBranchOptions) {
  await runGit(["push", "-u", "origin", options.branchName], {
    cwd: options.repoPath,
  });
}
