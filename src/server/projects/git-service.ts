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
  item: Item;
  repoPath: string;
}

interface UpdateRemoteOptions {
  instanceUrl: string;
  provider: RequestProvider;
  repoName: string;
  repoPath: string;
  token: string;
}

type ManagedRepoOptions = CloneRepoOptions;

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

// 校验 git
export async function ensureGit() {
  await runGit(["--version"]);
}

// 拉取仓库
export async function cloneManagedRepo(options: CloneRepoOptions) {
  await ensureGit();
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
  await runGit(["remote", "set-url", "origin", buildRemoteUrl(options)], {
    cwd: options.repoPath,
  });
}

// 确保仓库
export async function ensureManagedRepo(options: ManagedRepoOptions) {
  if (!(await isGitRepository(options.repoPath))) {
    await cloneManagedRepo(options);
    return;
  }

  await updateManagedRemote(options);
  await runGit(["fetch", "origin"], {
    cwd: options.repoPath,
  });
  await runGit(["checkout", options.baseBranch], {
    cwd: options.repoPath,
  });
  await runGit(["pull", "--ff-only", "origin", options.baseBranch], {
    cwd: options.repoPath,
  });
}

// 准备分支
export async function prepareAlertBranch(options: PrepareBranchOptions) {
  await ensureGit();
  await runGit(["fetch", "origin"], {
    cwd: options.repoPath,
  });
  await runGit(["checkout", options.baseBranch], {
    cwd: options.repoPath,
  });
  await runGit(["pull", "--ff-only", "origin", options.baseBranch], {
    cwd: options.repoPath,
  });
  await runGit(["checkout", "-B", options.branchName], {
    cwd: options.repoPath,
  });
  await runGit(
    [
      "-c",
      "user.name=Alert Agent",
      "-c",
      "user.email=alert-agent@local",
      "commit",
      "--allow-empty",
      "-m",
      buildCommitMessage(options.item),
    ],
    {
      cwd: options.repoPath,
    }
  );
  await runGit(["push", "-u", "origin", options.branchName], {
    cwd: options.repoPath,
  });
}
