import type {
  FeedbackSignal,
  FeedbackSignalAction,
  Item,
} from "@shared/types/alert";
import type { CodeRequest } from "@shared/types/project";
import {
  Bell,
  CheckCircle2,
  GitMerge,
  GitPullRequest,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/tailwind";

interface DetailActivityProps {
  item: Item;
  request: CodeRequest | null;
}

interface ActivityRecord {
  icon: ComponentType<{ className?: string }>;
  id: string;
  kind: "alert" | "feedback" | "request";
  label: string;
  reason?: string | null;
  time: string;
}

const KIND_LABEL_KEYS = {
  alert: "dashboard.activityKindAlert",
  feedback: "dashboard.activityKindFeedback",
  request: "dashboard.activityKindRequest",
} as const satisfies Record<ActivityRecord["kind"], string>;

const FEEDBACK_ICONS = {
  close_request: XCircle,
  dismiss: MinusCircle,
  done: CheckCircle2,
  duplicate: MinusCircle,
  merge_request: GitMerge,
} as const satisfies Record<FeedbackSignalAction, ComponentType>;

// 反馈文案
function getFeedbackText(
  action: FeedbackSignalAction,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const actionMap = {
    close_request: t("dashboard.feedbackCloseRequest"),
    dismiss: t("dashboard.feedbackDismiss"),
    done: t("dashboard.feedbackDone"),
    duplicate: t("dashboard.feedbackDuplicate"),
    merge_request: t("dashboard.feedbackMergeRequest"),
  } as const satisfies Record<FeedbackSignalAction, string>;

  return actionMap[action];
}

// 报警创建
function buildAlertCreatedRecord(
  item: Item,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  return {
    icon: Bell,
    id: `${item.id}-created`,
    kind: "alert",
    label: t("dashboard.activityAlertCreated"),
    time: item.createdAt,
  } satisfies ActivityRecord;
}

// 请求创建
function buildRequestCreatedRecord(
  request: CodeRequest,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  return {
    icon: GitPullRequest,
    id: `${request.remoteId}-request-created`,
    kind: "request",
    label: t("dashboard.activityRequestCreated", {
      provider: request.provider === "github" ? "GitHub" : "GitLab",
    }),
    time: request.createdAt,
  } satisfies ActivityRecord;
}

// 反馈记录
function buildFeedbackRecord(
  signal: FeedbackSignal,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  return {
    icon: FEEDBACK_ICONS[signal.action],
    id: signal.id,
    kind: "feedback",
    label: getFeedbackText(signal.action, t),
    reason: signal.reason,
    time: signal.createdAt,
  } satisfies ActivityRecord;
}

// 记录排序
function sortActivityRecords(records: ActivityRecord[]) {
  return [...records].sort(
    (left, right) =>
      new Date(right.time).getTime() - new Date(left.time).getTime()
  );
}

// 格式时间
function formatFeedbackTime(createdAt: string) {
  return new Date(createdAt).toLocaleString();
}

// 类型文案
function getKindText(
  kind: ActivityRecord["kind"],
  t: (key: string, options?: Record<string, unknown>) => string
) {
  return t(KIND_LABEL_KEYS[kind]);
}

// 处理时间线
function ActivityTimeline({
  records,
  t,
}: {
  records: ActivityRecord[];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <div className="flex flex-col">
      {records.map((record, index) => {
        const Icon = record.icon;
        const last = index === records.length - 1;

        return (
          <div className="grid grid-cols-[2rem_1fr] gap-3" key={record.id}>
            <div className="relative flex justify-center">
              {!last && (
                <span className="absolute top-7 bottom-0 w-px bg-border" />
              )}
              <span className="relative mt-0.5 flex size-7 items-center justify-center rounded-full border bg-background text-primary shadow-[0_0_0_4px_var(--background)]">
                <Icon className="size-3.5" />
              </span>
            </div>
            <div className={cn("pb-4", last && "pb-0")}>
              <div className="rounded-lg border bg-muted/25 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-sm">{record.label}</p>
                  <Badge variant="outline">{getKindText(record.kind, t)}</Badge>
                </div>
                {record.reason && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {record.reason}
                  </p>
                )}
                <p className="mt-2 font-mono text-muted-foreground text-xs">
                  {formatFeedbackTime(record.time)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DetailActivity({ item, request }: DetailActivityProps) {
  const { t } = useTranslation();
  const records = sortActivityRecords([
    buildAlertCreatedRecord(item, t),
    ...(request ? [buildRequestCreatedRecord(request, t)] : []),
    ...(item.detail.feedbackSignals ?? []).map((signal) =>
      buildFeedbackRecord(signal, t)
    ),
  ]);

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">{t("dashboard.activity")}</h3>
      <ActivityTimeline records={records} t={t} />
    </div>
  );
}
