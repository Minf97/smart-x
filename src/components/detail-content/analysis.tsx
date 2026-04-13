import type { Item } from "@shared/types/alert";
import { useTranslation } from "react-i18next";
import {
  getFixPatch,
  getFixSummary,
  getRootCause,
} from "@/components/dashboard/helpers";

interface DetailAnalysisProps {
  item: Item;
}

export default function DetailAnalysis({ item }: DetailAnalysisProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">{t("dashboard.analysis")}</h3>
      <div className="space-y-3">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <h4 className="mb-2 font-medium text-sm">
            {t("dashboard.rootCause")}
          </h4>
          <p className="text-muted-foreground text-sm">{getRootCause(item)}</p>
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
  );
}
