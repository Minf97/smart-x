import {
  ITEM_STATUS_VALUES,
  type Item,
  type ItemStatus,
} from "@shared/types/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updateAlertStatus } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALERTS_QUERY_KEY } from "@/hooks/use-alerts";
import type { DashboardData } from "@/types/dashboard";
import { getStatusIcon, getStatusLabel } from "./helpers";

interface AlertStatusDropdownProps {
  item: Pick<Item, "id" | "status">;
  triggerClassName?: string;
}

// 同步缓存
function updateAlertCache(data: DashboardData | undefined, updatedItem: Item) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    alerts: data.alerts.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    ),
  };
}

// 状态菜单
export default function AlertStatusDropdown({
  item,
  triggerClassName,
}: AlertStatusDropdownProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: (status: ItemStatus) => updateAlertStatus(item.id, status),
    onError(error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    },
    onSuccess(updatedItem) {
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        updateAlertCache(data, updatedItem)
      );
    },
  });

  // 切换状态
  function handleStatusChange(status: string) {
    if (status === item.status || statusMutation.isPending) {
      return;
    }

    statusMutation.mutate(status as ItemStatus);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={getStatusLabel(t, item.status)}
          className={triggerClassName}
          disabled={statusMutation.isPending}
          onClick={(event) => event.stopPropagation()}
          size="icon"
          title={getStatusLabel(t, item.status)}
          type="button"
          variant="ghost"
        >
          {getStatusIcon(item.status)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuRadioGroup
          onValueChange={handleStatusChange}
          value={item.status}
        >
          {ITEM_STATUS_VALUES.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              {getStatusIcon(status)}
              <span>{getStatusLabel(t, status)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
