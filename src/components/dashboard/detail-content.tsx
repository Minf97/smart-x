import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Item } from "@/types/alert";
import {
  getFixPatch,
  getFixSummary,
  getLastSeen,
  getRootCause,
  getStack,
} from "./helpers";

interface DetailContentProps {
  error: string | null;
  item: Item | null;
  loading: boolean;
  onRetry: () => void;
}

// 加载态
function LoadingView() {
  return (
    <div className="max-w-4xl space-y-4 p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function DetailContent({
  error,
  item,
  loading,
  onRetry,
}: DetailContentProps) {
  const { t } = useTranslation();

  if (loading) {
    return <LoadingView />;
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6">
        <p className="font-semibold text-sm">{t("dashboard.loadFailed")}</p>
        <p className="mt-2 text-muted-foreground text-sm">{error}</p>
        <Button className="mt-4" onClick={onRetry} size="sm">
          {t("dashboard.retry")}
        </Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-4xl p-6">
        <p className="font-semibold text-sm">{t("dashboard.emptyTitle")}</p>
        <p className="mt-2 text-muted-foreground text-sm">
          {t("dashboard.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t("dashboard.source")}</span>
          <p className="mt-1 font-medium">{item.detail.summary.source}</p>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("dashboard.reported")}
          </span>
          <p className="mt-1 font-medium">{getLastSeen(item)}</p>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 font-semibold text-sm">
          {t("dashboard.stackTrace")}
        </h3>
        <div className="rounded-lg border bg-muted/30 p-4 font-mono text-xs">
          <pre className="whitespace-pre-wrap text-muted-foreground">
            {getStack(item)}
          </pre>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 font-semibold text-sm">
          {t("dashboard.analysis")}
        </h3>
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <h4 className="mb-2 font-medium text-sm">
              {t("dashboard.rootCause")}
            </h4>
            <p className="text-muted-foreground text-sm">
              {getRootCause(item)}
            </p>
          </div>

          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <h4 className="mb-2 font-medium text-sm">
              {t("dashboard.suggestedFix")}
            </h4>
            <p className="mb-3 text-muted-foreground text-sm">
              {getFixSummary(item)}
            </p>
            <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs">
              <pre className="whitespace-pre-wrap">{getFixPatch(item)}</pre>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 font-semibold text-sm">
          {t("dashboard.activity")}
        </h3>
        <div className="space-y-3">
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
              <p className="mt-0.5 text-muted-foreground text-xs">
                30 secs ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
