import { useTranslation } from "react-i18next";
import {
  getProviderLabel,
  getRequestStateColor,
  getRequestStateLabel,
} from "@/components/dashboard/helpers";
import ExternalLink from "@/components/external-link";
import { Badge } from "@/components/ui/badge";
import type { CodeRequest } from "@/types/project";

interface DetailRequestProps {
  request: CodeRequest | null;
}

export default function DetailRequest({ request }: DetailRequestProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">
        {t("dashboard.requestTitle")}
      </h3>
      {request ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {getProviderLabel(request.provider)}
            </Badge>
            <Badge
              className={getRequestStateColor(request.state)}
              variant="secondary"
            >
              {getRequestStateLabel(t, request.state)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                {t("dashboard.repository")}
              </span>
              <p className="mt-1 break-all font-medium">{request.repoName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("dashboard.branch")}
              </span>
              <p className="mt-1 break-all font-medium">{request.branchName}</p>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground text-sm">
              {t("dashboard.prTitle")}
            </span>
            <p className="mt-1 font-medium text-sm">{request.title}</p>
          </div>

          <ExternalLink className="text-sm" href={request.url}>
            {t("dashboard.viewPr")}
          </ExternalLink>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
          {t("dashboard.prEmpty")}
        </div>
      )}
    </div>
  );
}
