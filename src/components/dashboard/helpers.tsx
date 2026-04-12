import type { TFunction } from "i18next";
import { Check, Circle } from "lucide-react";
import {
  ITEM_PRIORITY_I18N_KEYS,
  ITEM_STATUS_I18N_KEYS,
  type Item,
  type ItemPriority,
  type ItemStatus,
} from "@/types/alert";
import {
  REQUEST_PROVIDER_LABELS,
  REQUEST_STATE_I18N_KEYS,
  type RequestProvider,
  type RequestState,
} from "@/types/project";

// 状态图标
export function getStatusIcon(status: ItemStatus) {
  switch (status) {
    case "done":
      return <Check className="h-3.5 w-3.5 text-green-500" />;
    case "in_progress":
      return <Circle className="h-3.5 w-3.5 fill-blue-500 text-blue-500" />;
    case "in_review":
      return <Circle className="h-3.5 w-3.5 fill-violet-500 text-violet-500" />;
    case "todo":
      return <Circle className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />;
    case "duplicate":
      return <Circle className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />;
    case "dismiss":
      return <Circle className="h-3.5 w-3.5 fill-zinc-500 text-zinc-500" />;
    case "backlog":
      return <Circle className="h-3.5 w-3.5 fill-gray-400 text-gray-400" />;
    default:
      return <Circle className="h-3.5 w-3.5 fill-gray-400 text-gray-400" />;
  }
}

// 优先级色
export function getPriorityColor(priority: ItemPriority) {
  const colors = {
    P0: "border-red-500/20 bg-red-500/10 text-red-500",
    P1: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
    P2: "border-green-500/20 bg-green-500/10 text-green-500",
  };

  return colors[priority];
}

// 状态色
export function getStatusColor(status: ItemStatus) {
  const colors = {
    backlog: "bg-gray-500/10 text-gray-500",
    dismiss: "bg-zinc-500/10 text-zinc-500",
    done: "bg-green-500/10 text-green-500",
    duplicate: "bg-orange-500/10 text-orange-500",
    in_progress: "bg-blue-500/10 text-blue-500",
    in_review: "bg-violet-500/10 text-violet-500",
    todo: "bg-yellow-500/10 text-yellow-500",
  };

  return colors[status];
}

// 状态文案
export function getStatusLabel(t: TFunction, status: ItemStatus) {
  return t(ITEM_STATUS_I18N_KEYS[status]);
}

// 优先文案
export function getPriorityLabel(t: TFunction, priority: ItemPriority) {
  return t(ITEM_PRIORITY_I18N_KEYS[priority]);
}

// 平台文案
export function getProviderLabel(provider: RequestProvider) {
  return REQUEST_PROVIDER_LABELS[provider];
}

// 请求色
export function getRequestStateColor(state: RequestState) {
  const colors = {
    closed: "bg-zinc-500/10 text-zinc-500",
    merged: "bg-green-500/10 text-green-500",
    open: "bg-blue-500/10 text-blue-500",
  };

  return colors[state];
}

// 请求文案
export function getRequestStateLabel(t: TFunction, state: RequestState) {
  return t(REQUEST_STATE_I18N_KEYS[state]);
}

// 最近时间
export function getLastSeen(item: Item) {
  return (
    item.detail.summary.lastSeenAt ?? item.detail.summary.firstSeenAt ?? "-"
  );
}

// 根因文案
export function getRootCause(item: Item) {
  return item.detail.analysis?.rootCause ?? "-";
}

// 修复摘要
export function getFixSummary(item: Item) {
  return item.detail.analysis?.fixSuggestions?.[0]?.summary ?? "-";
}

// 修复补丁
export function getFixPatch(item: Item) {
  return item.detail.analysis?.fixSuggestions?.[0]?.patch ?? "-";
}

// 堆栈文案
export function getStack(item: Item) {
  return item.detail.error.stack ?? item.detail.error.message;
}
