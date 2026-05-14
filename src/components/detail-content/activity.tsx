import type { FeedbackSignalAction, Item } from "@shared/types/alert";
import { useTranslation } from "react-i18next";
import { getLastSeen } from "@/components/dashboard/helpers";

interface DetailActivityProps {
  item: Item;
}

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

// 格式时间
function formatFeedbackTime(createdAt: string) {
  return new Date(createdAt).toLocaleString();
}

export default function DetailActivity({ item }: DetailActivityProps) {
  const { t } = useTranslation();
  const feedbackSignals = item.detail.feedbackSignals ?? [];

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">{t("dashboard.activity")}</h3>
      <div className="space-y-3">
        {feedbackSignals.map((signal) => (
          <div className="flex gap-3 text-sm" key={signal.id}>
            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <div className="flex-1">
              <p>{getFeedbackText(signal.action, t)}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {formatFeedbackTime(signal.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div className="flex gap-3 text-sm">
          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
          <div className="flex-1">
            <p>{t("dashboard.analysisStarted")}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {getLastSeen(item)}
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <div className="flex-1">
            <p>{t("dashboard.contextRetrieved")}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">1 min ago</p>
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
          <div className="flex-1">
            <p>{t("dashboard.fixGenerated")}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">30 secs ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
