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

// Webhook配置
export interface ProjectWebhookConfig {
  webhookEnabled: boolean; // 启用
  webhookId: string; // 标识
  webhookUrl: string; // 地址
}

// AI配置
export interface ProjectAiConfig {
  apiKey: string; // 密钥
  baseUrl: string; // 地址
  model: string; // 模型
}

// 默认AI
export function getDefaultProjectAiConfig(): ProjectAiConfig {
  return {
    apiKey: "",
    baseUrl: "",
    model: "",
  };
}

// PR信息
// 实现:
// A. 先读取项目设置里的仓库配置
// B. 再生成报警唯一分支名
// C. 再推送代码到目标仓库
// D. 再调平台创建 PR 或 MR
// E. 最后回写项目下的请求状态
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
// A. 用户先连接代码平台账号
// B. 再选择目标仓库和默认基线分支
// C. 再把托管仓库拉到本地工作目录
// D. 最后在创建 PR 时读取这份配置
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
  aiConfig: ProjectAiConfig; // AI
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

// 远端项目
export interface ProjectRecord extends ProjectWebhookConfig {
  createdAt: string; // 创建
  id: string; // 主键
  name: string; // 名称
  updatedAt: string; // 更新
}

// 项目类型
export interface Project extends ProjectRecord {
  aiConfig: ProjectAiConfig; // AI
  repoConfig: ProjectRepoConfig; // 配置
  requestMap: Record<string, CodeRequest>; // 请求表
}
