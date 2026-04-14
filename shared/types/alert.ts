// 状态枚举
export const ITEM_STATUS_VALUES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "dismiss",
  "duplicate",
] as const;

// 状态类型
export type ItemStatus = (typeof ITEM_STATUS_VALUES)[number];

// i18n key
export const ITEM_STATUS_I18N_KEYS = {
  backlog: "alerts.status.backlog",
  todo: "alerts.status.todo",
  in_progress: "alerts.status.in_progress",
  in_review: "alerts.status.in_review",
  done: "alerts.status.done",
  dismiss: "alerts.status.dismiss",
  duplicate: "alerts.status.duplicate",
} as const satisfies Record<ItemStatus, `alerts.status.${ItemStatus}`>;

// 优先级枚举
export const ITEM_PRIORITY_VALUES = ["P0", "P1", "P2"] as const;

// 优先级类型
export type ItemPriority = (typeof ITEM_PRIORITY_VALUES)[number];

// i18n key
export const ITEM_PRIORITY_I18N_KEYS = {
  P0: "alerts.priority.P0",
  P1: "alerts.priority.P1",
  P2: "alerts.priority.P2",
} as const satisfies Record<ItemPriority, `alerts.priority.${ItemPriority}`>;

// 颜色占位
export const ITEM_PRIORITY_TONES = {
  P0: "red",
  P1: "yellow",
  P2: "green",
} as const satisfies Record<ItemPriority, "green" | "red" | "yellow">;

// 概要
export interface Summary {
  environment?: string | null; // 环境
  firstSeenAt?: string | null; // 首次
  lastSeenAt?: string | null; // 最近
  occurrenceCount?: number; // 次数
  source: string; // 来源
  sourceUrl?: string | null; // 链接
  version?: string; // 版本
}

// 错误
export interface ErrorInfo {
  groupKey?: string; // 分组
  message: string; // 摘要
  rawAlert?: unknown; // 原始
  stack?: string | null; // 堆栈
}

// 代码位置
// 实现:
// A. 先解析 stack 里的文件、函数、行列号
// B. 再结合 sourcemap 还原到源码位置
// C. 再按文件名、函数名、报错词检索仓库
// D. 再读取命中文件前后代码生成候选片段
// E. 最后按匹配度排序返回候选位置
export interface CodeLocation {
  column?: number; // 列号
  filePath: string; // 文件
  line?: number; // 行号
  reason?: string; // 原因
  snippet?: string; // 片段
  symbolName?: string; // 符号
}

// 修复方案
// 实现:
// A. 先以上一步候选位置作为修复入口
// B. 再读取当前函数、调用方、相关类型定义
// C. 再判断是空值、状态还是边界问题
// D. 再生成最小改动 patch 草案
// E. 最后补充风险点和验证步骤
export interface FixSuggestion {
  patch?: string; // 补丁
  risk?: string; // 风险
  summary: string; // 摘要
  verification?: string; // 验证
}

// 分析结果
export interface Analysis {
  // 实现:
  // A. 先解析 stack 里的源码线索
  // B. 再去仓库里检索候选文件
  // C. 再读取候选代码前后文
  // D. 再输出一个或多个候选位置
  codeLocations?: CodeLocation[]; // 位置
  // 实现:
  // A. 先基于候选位置读取更大范围上下文
  // B. 再推理最可能的修复点
  // C. 再生成 patch、风险和验证建议
  // D. 最后返回给用户人工确认
  fixSuggestions?: FixSuggestion[]; // 修复
  // 实现:
  // A. 先读取环境、版本、页面路径
  // B. 再读取 userId、sessionId、设备、浏览器
  // C. 再用 groupKey 聚合同类报警
  // D. 再统计次数、用户数、影响页面
  // E. 最后让 LLM 整理影响描述
  impact?: string; // 影响
  // 实现:
  // A. 先读取 error message 和 stack
  // B. 再提取报错类型、调用链、文件线索
  // C. 再对比历史同类报警和规则
  // D. 再读取相关代码片段作为证据
  // E. 最后让 LLM 输出根因描述
  rootCause?: string; // 根因
}

// 详情
export interface Detail {
  analysis?: Analysis; // 分析
  error: ErrorInfo; // 错误
  summary: Summary; // 概要
}

// 列表项
export interface Item {
  createdAt: string; // 创建
  detail: Detail; // 详情
  groupKey: string; // 分组
  id: string; // 主键
  isRead: boolean; // 已读
  isSyncedLocal: boolean; // 已同步
  priority: ItemPriority; // 优先级
  projectId: string; // 项目
  readAt?: string | null; // 已读时
  status: ItemStatus; // 状态
  syncedAt?: string | null; // 同步时
  title: string; // 标题
  updatedAt: string; // 更新
}

// 入库包
export interface IngestPayload {
  count: number; // 次数
  environment: string | null; // 环境
  groupKey: string; // 分组
  message: string; // 摘要
  occurredAt: string; // 时间
  priority: ItemPriority; // 优先级
  rawAlert: unknown; // 原始
  source: string; // 来源
  sourceUrl: string | null; // 链接
  stack: string | null; // 堆栈
  title: string; // 标题
}

// 列表返回
export interface AlertListResponse {
  alerts: Item[]; // 列表
}

// 回执入参
export interface AlertSyncAckInput {
  alertIds: string[]; // 主键
}

// 同步结果
export interface LocalAlertSyncResult {
  acknowledgedCount: number; // 回执数
  insertedCount: number; // 新增数
  projectCount: number; // 项目数
  updatedCount: number; // 更新数
}
