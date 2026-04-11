import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useAlertStore } from "@/store/alert-store";
import {
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
} from "./helpers";

export default function DetailHeader() {
  const { t } = useTranslation();
  const item = useAlertStore((state) => state.selectedItem);

  if (!item) {
    return (
      <div className="border-b px-6 py-4">
        <p className="font-semibold text-xl">{t("dashboard.emptyTitle")}</p>
        <p className="mt-1 text-muted-foreground text-sm">
          {t("dashboard.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-b px-6 py-4">
      <div className="flex items-center gap-3">
        {getStatusIcon(item.status)}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-muted-foreground text-xs">
              {item.id}
            </span>
            <Badge
              className={getPriorityColor(item.priority)}
              variant="outline"
            >
              {getPriorityLabel(t, item.priority)}
            </Badge>
            <Badge className={getStatusColor(item.status)} variant="secondary">
              {getStatusLabel(t, item.status)}
            </Badge>
          </div>
          <h2 className="font-semibold text-xl">{item.title}</h2>
        </div>
      </div>
    </div>
  );
}
