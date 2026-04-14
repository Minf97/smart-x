// 连接状态
export interface GitlabAuthState {
  avatarUrl: string | null; // 头像
  baseUrl: string | null; // 地址
  clientId: string | null; // 客户端
  connected: boolean; // 已连
  login: string | null; // 账号
  name: string | null; // 名称
}

// 启动结果
export interface GitlabOauthFlow {
  authorizeUrl: string; // 授权页
  expiresAt: string; // 过期
  sessionId: string; // 会话
}

// 轮询结果
export interface GitlabOauthPoll {
  auth: GitlabAuthState | null; // 账号
  status: "connected" | "pending"; // 状态
}

// 仓库项
export interface GitlabRepoItem {
  defaultBranch: string; // 分支
  fullName: string; // 全名
  id: number; // 主键
  name: string; // 名称
  private: boolean; // 私库
}
