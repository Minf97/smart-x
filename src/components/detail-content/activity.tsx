import type { Item } from "@shared/types/alert";
import { useTranslation } from "react-i18next";
import { getLastSeen } from "@/components/dashboard/helpers";

interface DetailActivityProps {
  item: Item;
}

export default function DetailActivity({ item }: DetailActivityProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="mb-3 font-semibold text-sm">{t("dashboard.activity")}</h3>
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
            <p className="mt-0.5 text-muted-foreground text-xs">30 secs ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
