// 连接状态
export interface GithubAuthState {
  avatarUrl: string | null; // 头像
  connected: boolean; // 已连
  login: string | null; // 账号
  name: string | null; // 名称
}

// 启动结果
export interface GithubDeviceFlow {
  expiresAt: string; // 过期
  interval: number; // 轮询
  sessionId: string; // 会话
  userCode: string; // 验证码
  verificationUri: string; // 授权页
}

// 轮询结果
export interface GithubDevicePoll {
  auth: GithubAuthState | null; // 账号
  interval: number; // 轮询
  status: "connected" | "pending"; // 状态
}

// 仓库项
export interface GithubRepoItem {
  defaultBranch: string; // 分支
  fullName: string; // 全名
  id: number; // 主键
  name: string; // 名称
  private: boolean; // 私库
}
