// 平台枚举
export const REQUEST_PROVIDER_VALUES = ["github", "gitlab"] as const;

// 平台类型
export type RequestProvider = (typeof REQUEST_PROVIDER_VALUES)[number];

// 平台文案
export const REQUEST_PROVIDER_LABELS = {
  github: "GitHub",
  gitlab: "GitLab",
} as const satisfies Record<RequestProvider, string>;

// 请求枚举
export const REQUEST_STATE_VALUES = ["open", "merged", "closed"] as const;

// 请求类型
export type RequestState = (typeof REQUEST_STATE_VALUES)[number];

// i18n key
export const REQUEST_STATE_I18N_KEYS = {
  closed: "alerts.requestState.closed",
  merged: "alerts.requestState.merged",
  open: "alerts.requestState.open",
} as const satisfies Record<
  RequestState,
  `alerts.requestState.${RequestState}`
>;

// PR信息
// 实现:
// 1. 先读项目设置里的仓库配置
// 2. 再生成报警唯一分支名
// 3. 再推送代码到目标仓库
// 4. 再调平台创建 PR/MR
// 5. 最后回写远端状态和链接
export interface CodeRequest {
  baseBranch: string; // 基线
  branchName: string; // 分支
  createdAt: string; // 创建
  provider: RequestProvider; // 平台
  remoteId: string; // 远端
  repoName: string; // 仓库
  state: RequestState; // 状态
  title: string; // 标题
  updatedAt: string; // 更新
  url: string; // 链接
}

// 仓库配置
// 实现:
// 1. 用户在设置页选择 provider
// 2. 再拉托管仓库
// 3. 保存本地配置
// 4. 创建 PR 时读取
export interface ProjectRepoConfig {
  baseBranch: string; // 基线
  hasToken: boolean; // 凭证
  managedRepoPath: string; // 路径
  provider: RequestProvider; // 平台
  repoName: string; // 仓库
}

// 存储配置
export interface StoredProjectRepoConfig {
  baseBranch: string; // 基线
  managedRepoPath: string; // 路径
  provider: RequestProvider; // 平台
  repoName: string; // 仓库
  token: string; // 令牌
}

// 项目入参
export interface ProjectInput {
  name: string; // 名称
  repoConfig: {
    baseBranch: string; // 基线
    provider: RequestProvider; // 平台
    repoName: string; // 仓库
    token: string; // 令牌
  }; // 配置
}

// 校验结果
export interface ProjectValidationResult {
  baseBranch: string; // 基线
  provider: RequestProvider; // 平台
  repoName: string; // 仓库
}

// 项目类型
export interface Project {
  id: string; // 主键
  name: string; // 名称
  repoConfig: ProjectRepoConfig; // 配置
  requestMap: Record<string, CodeRequest>; // 请求表
}
