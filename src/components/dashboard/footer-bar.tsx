import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updateAlertStatus } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import type { Item } from "@/types/alert";

export default function FooterBar() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { loading, selectedItem } = useAlertView();
  const markDoneMutation = useMutation({
    mutationFn: (id: string) => updateAlertStatus(id, "done"),
    onError() {
      toast.error(t("dashboard.markDoneFailed"));
    },
    onSuccess(updatedItem) {
      queryClient.setQueryData<Item[]>(ALERTS_QUERY_KEY, (items) =>
        items?.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      toast.success(t("dashboard.markDoneSuccess"));
    },
  });
  const disabled = loading || !selectedItem || markDoneMutation.isPending;

  // 标记完成
  function handleMarkDone() {
    if (!selectedItem) {
      return;
    }

    markDoneMutation.mutate(selectedItem.id);
  }

  return (
    <div className="border-t px-6 py-4">
      <div className="flex gap-2">
        <Button disabled={disabled} size="sm">
          {t("dashboard.createPr")}
        </Button>
        <Button
          disabled={disabled}
          onClick={handleMarkDone}
          size="sm"
          variant="outline"
        >
          {markDoneMutation.isPending && <Spinner className="size-3" />}
          {t("dashboard.markDone")}
        </Button>
        <Button disabled={disabled} size="sm" variant="ghost">
          {t("dashboard.dismiss")}
        </Button>
      </div>
    </div>
  );
}
