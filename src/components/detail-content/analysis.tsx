import type { Item } from "@shared/types/alert";
import { useTranslation } from "react-i18next";
import {
  getFixPatch,
  getFixSummary,
  getImpact,
  getRootCause,
} from "@/components/dashboard/helpers";

interface DetailAnalysisProps {
  item: Item;
}

export default function DetailAnalysis({ item }: DetailAnalysisProps) {
  const { t } = useTranslation();
  const analysis = item.detail.analysis;
  const businessImpact = analysis?.businessImpact;
  const fixDecision = analysis?.fixDecision;

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">{t("dashboard.analysis")}</h3>
      <div className="space-y-3">
        {(businessImpact || fixDecision) && (
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
            <h4 className="mb-2 font-medium text-sm">
              {t("dashboard.businessImpact")}
            </h4>
            <div className="space-y-2 text-muted-foreground text-sm">
              {businessImpact && (
                <>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("dashboard.businessImpactResult")}:{" "}
                    </span>
                    {businessImpact.affectsUser
                      ? t("dashboard.businessImpactAffectsUser")
                      : t("dashboard.businessImpactNoUserImpact")}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("dashboard.expectedBehavior")}:{" "}
                    </span>
                    {businessImpact.expectedBehavior}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("dashboard.actualBehavior")}:{" "}
                    </span>
                    {businessImpact.actualBehavior}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      {t("dashboard.impactEvidence")}:{" "}
                    </span>
                    {businessImpact.evidence}
                  </p>
                </>
              )}
              {fixDecision && (
                <p>
                  <span className="font-medium text-foreground">
                    {t("dashboard.fixDecision")}:{" "}
                  </span>
                  {fixDecision.action === "create_request"
                    ? t("dashboard.fixDecisionCreateRequest")
                    : t("dashboard.fixDecisionKeepBacklog")}
                  {" · "}
                  {fixDecision.reason}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <h4 className="mb-2 font-medium text-sm">
            {t("dashboard.rootCause")}
          </h4>
          <p className="text-muted-foreground text-sm">{getRootCause(item)}</p>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <h4 className="mb-2 font-medium text-sm">{t("dashboard.impact")}</h4>
          <p className="text-muted-foreground text-sm">{getImpact(item)}</p>
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
