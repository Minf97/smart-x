import { useTranslation } from "react-i18next";
import type { Item } from "@/types/alert";
import { getLastSeen } from "../helpers";

interface DetailSummaryProps {
  item: Item;
}

export default function DetailSummary({ item }: DetailSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="text-muted-foreground">{t("dashboard.source")}</span>
        <p className="mt-1 font-medium">{item.detail.summary.source}</p>
      </div>
      <div>
        <span className="text-muted-foreground">{t("dashboard.reported")}</span>
        <p className="mt-1 font-medium">{getLastSeen(item)}</p>
      </div>
    </div>
  );
}
