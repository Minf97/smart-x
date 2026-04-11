// 状态枚举
export const ITEM_STATUS_VALUES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
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
  canceled: "alerts.status.canceled",
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
  environment?: string; // 环境
  firstSeenAt?: string; // 首次
  lastSeenAt?: string; // 最近
  occurrenceCount?: number; // 次数
  source: string; // 来源
  version?: string; // 版本
}

// 错误
export interface ErrorInfo {
  fingerprint?: string; // 指纹
  message: string; // 摘要
  rawPayload?: unknown; // 原始
  stack?: string; // 堆栈
}

// 代码位置
// 实现:
// 1. 解析 stack 里的文件名、函数名、行列号
// 2. 如果有 sourcemap, 先还原到源码位置
// 3. 用文件名、函数名、报错关键词检索仓库
// 4. 读取命中文件前后代码, 生成候选片段
// 5. 按匹配度排序, 返回最可能的位置
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
// 1. 以上一步候选位置作为修复入口
// 2. 继续读取当前函数、调用方、相关类型定义
// 3. 判断是空值保护、状态判断还是边界条件问题
// 4. 生成最小改动的 patch 草案
// 5. 补充风险点和验证步骤, 供用户确认
export interface FixSuggestion {
  patch?: string; // 补丁
  risk?: string; // 风险
  summary: string; // 摘要
  verification?: string; // 验证
}

// 分析结果
export interface Analysis {
  // 实现:
  // 1. 先解析 stack 里的源码线索
  // 2. 再去仓库里检索候选文件
  // 3. 读取候选代码前后文
  // 4. 输出一个或多个候选位置
  codeLocations?: CodeLocation[]; // 位置
  // 实现:
  // 1. 基于候选位置读取更大范围上下文
  // 2. 推理最可能的修复点
  // 3. 生成 patch、风险和验证建议
  // 4. 返回给用户人工确认
  fixSuggestions?: FixSuggestion[]; // 修复
  // 实现:
  // 1. 读取 payload 里的环境、版本、页面路径
  // 2. 读取 userId、sessionId、device、browser 等上下文
  // 3. 用 fingerprint 聚合同类报警
  // 4. 统计近一段时间的出现次数、影响用户数、影响页面
  // 5. 让 LLM 把统计结果整理成影响描述
  impact?: string; // 影响
  // 实现:
  // 1. 读取 error message 和 stack
  // 2. 提取报错类型、调用链、文件线索
  // 3. 对比历史同类报警和已知问题规则
  // 4. 读取相关代码片段作为证据
  // 5. 让 LLM 基于证据输出根因描述
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
  detail: Detail; // 详情
  id: string; // 主键
  priority: ItemPriority; // 优先级
  status: ItemStatus; // 状态
  title: string; // 标题
}
