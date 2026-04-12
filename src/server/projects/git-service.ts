import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Item } from "@/types/alert";

interface GitRunOptions {
  cwd?: string;
}

interface GithubCloneOptions {
  baseBranch: string;
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
  repoName: string;
  repoPath: string;
  token: string;
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

// 远端链
function buildGithubRemoteUrl(repoName: string, token: string) {
  const auth = encodeURIComponent(token);

  return `https://x-access-token:${auth}@github.com/${repoName}.git`;
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
export async function cloneGithubRepo(options: GithubCloneOptions) {
  await ensureGit();
  await mkdir(path.dirname(options.repoPath), {
    recursive: true,
  });
  await runGit([
    "clone",
    "--branch",
    options.baseBranch,
    buildGithubRemoteUrl(options.repoName, options.token),
    options.repoPath,
  ]);
}

// 更新远端
export async function updateGithubRemote(options: UpdateRemoteOptions) {
  await ensureGit();
  await runGit(
    [
      "remote",
      "set-url",
      "origin",
      buildGithubRemoteUrl(options.repoName, options.token),
    ],
    {
      cwd: options.repoPath,
    }
  );
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
