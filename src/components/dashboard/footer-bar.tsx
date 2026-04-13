import type { ItemStatus } from "@shared/types/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updateAlertStatus } from "@/api/alerts";
import RequestActions from "@/components/dashboard/request-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import type { DashboardData } from "@/types/dashboard";

// 状态文案
function getStatusToastKey(status: ItemStatus) {
  if (status === "done") {
    return {
      error: "dashboard.markDoneFailed",
      success: "dashboard.markDoneSuccess",
    } as const;
  }

  return {
    error: "dashboard.dismissFailed",
    success: "dashboard.dismissSuccess",
  } as const;
}

export default function FooterBar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { loading, selectedItem } = useAlertView();
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ItemStatus }) =>
      updateAlertStatus(id, status),
    onError(_, variables) {
      const toastKey = getStatusToastKey(variables.status);
      toast.error(t(toastKey.error));
    },
    onSuccess(updatedItem, variables) {
      const toastKey = getStatusToastKey(variables.status);
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) => {
        if (!data) {
          return data;
        }

        return {
          ...data,
          alerts: data.alerts.map((item) =>
            item.id === updatedItem.id ? updatedItem : item
          ),
        };
      });
      toast.success(t(toastKey.success));
    },
  });
  const disabled = loading || !selectedItem || statusMutation.isPending;
  const dismissDisabled = disabled || selectedItem?.status === "dismiss";
  const doneDisabled = disabled || selectedItem?.status === "done";

  // 标记完成
  function handleMarkDone() {
    if (!selectedItem) {
      return;
    }

    statusMutation.mutate({
      id: selectedItem.id,
      status: "done",
    });
  }

  // 忽略项
  function handleDismiss() {
    if (!selectedItem) {
      return;
    }

    statusMutation.mutate({
      id: selectedItem.id,
      status: "dismiss",
    });
  }

  return (
    <div className="border-t px-6 py-4">
      <div className="flex gap-2">
        <RequestActions />
        <Button
          disabled={doneDisabled}
          onClick={handleMarkDone}
          size="sm"
          variant="outline"
        >
          {statusMutation.isPending &&
            statusMutation.variables.status === "done" && (
              <Spinner className="size-3" />
            )}
          {t("dashboard.markDone")}
        </Button>
        <Button
          disabled={dismissDisabled}
          onClick={handleDismiss}
          size="sm"
          variant="ghost"
        >
          {statusMutation.isPending &&
            statusMutation.variables.status === "dismiss" && (
              <Spinner className="size-3" />
            )}
          {t("dashboard.dismiss")}
        </Button>
      </div>
    </div>
  );
}
