import { ITEM_PRIORITY_VALUES, ITEM_STATUS_VALUES } from "@shared/types/alert";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAlertStore } from "@/store/alert-store";
import { cn } from "@/utils/tailwind";
import {
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getStatusLabel,
} from "./helpers";

export default function FilterBar() {
  const { t } = useTranslation();
  const clearFilters = useAlertStore((state) => state.clearFilters);
  const filterTags = useAlertStore((state) => state.filterTags);
  const priorityFilters = useAlertStore((state) => state.priorityFilters);
  const setPriorityFilters = useAlertStore((state) => state.setPriorityFilters);
  const setStatusFilters = useAlertStore((state) => state.setStatusFilters);
  const statusFilters = useAlertStore((state) => state.statusFilters);
  const hasFilters = filterTags.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {t("dashboard.statusFilter")}
        </span>
        {ITEM_STATUS_VALUES.map((status) => {
          const active = statusFilters.includes(status);

          return (
            <Button
              aria-pressed={active}
              className={cn(active && getStatusColor(status))}
              key={status}
              onClick={() => setStatusFilters(status)}
              size="xs"
              variant={active ? "secondary" : "outline"}
            >
              {getStatusLabel(t, status)}
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {t("dashboard.priorityFilter")}
        </span>
        {ITEM_PRIORITY_VALUES.map((priority) => {
          const active = priorityFilters.includes(priority);

          return (
            <Button
              aria-pressed={active}
              className={cn(active && getPriorityColor(priority))}
              key={priority}
              onClick={() => setPriorityFilters(priority)}
              size="xs"
              variant={active ? "secondary" : "outline"}
            >
              {getPriorityLabel(t, priority)}
            </Button>
          );
        })}

        {hasFilters && (
          <Button onClick={clearFilters} size="xs" variant="ghost">
            <X className="h-3 w-3" />
            {t("dashboard.clearFilters")}
          </Button>
        )}
      </div>
    </>
  );
}
