import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SearchCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { analyzeAlert } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import type { DashboardData } from "@/types/dashboard";
import {
  replaceAlertInDashboard,
  updateAlertStatusInDashboard,
} from "./alert-cache";

export default function AnalysisAction() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentProject, loading, selectedItem } = useAlertView();
  const hasAiConfig =
    (currentProject?.aiConfig.apiKey.trim().length ?? 0) > 0 &&
    (currentProject?.aiConfig.baseUrl.trim().length ?? 0) > 0 &&
    (currentProject?.aiConfig.model.trim().length ?? 0) > 0;
  const hasRepoPath =
    (currentProject?.repoConfig.managedRepoPath.trim().length ?? 0) > 0;
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => analyzeAlert(id),
    onMutate(id) {
      if (
        selectedItem?.id === id &&
        (selectedItem.status === "backlog" || selectedItem.status === "todo")
      ) {
        queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
          updateAlertStatusInDashboard(data, id, "in_progress")
        );
      }

      return {
        toastId: toast.loading(t("dashboard.analyzePending"), {
          description: t("dashboard.analyzePendingHint"),
        }),
      };
    },
    onError(error, _id, context) {
      toast.dismiss(context?.toastId);
      toast.error(
        error instanceof Error ? error.message : t("dashboard.analyzeFailed")
      );
    },
    onSuccess(updatedAlert, _id, context) {
      toast.dismiss(context?.toastId);
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        replaceAlertInDashboard(data, updatedAlert)
      );
      toast.success(t("dashboard.analyzeSuccess"));
    },
  });
  const disabled =
    loading ||
    !selectedItem ||
    !hasAiConfig ||
    !hasRepoPath ||
    analyzeMutation.isPending;
  let title = t("dashboard.analyzeRequiresAi");

  if (hasAiConfig) {
    title = hasRepoPath
      ? t("dashboard.analyzeAlert")
      : t("dashboard.analyzeRequiresRepo");
  }

  if (analyzeMutation.isPending) {
    title = t("dashboard.analyzePendingHint");
  }

  function handleAnalyze() {
    if (!selectedItem) {
      return;
    }

    analyzeMutation.mutate(selectedItem.id);
  }

  return (
    <Button
      disabled={disabled}
      onClick={handleAnalyze}
      size="sm"
      title={title}
      type="button"
    >
      {analyzeMutation.isPending ? (
        <Spinner className="size-3" />
      ) : (
        <SearchCode className="size-3" />
      )}
      {analyzeMutation.isPending
        ? t("dashboard.analyzingAlert")
        : t("dashboard.analyzeAlert")}
    </Button>
  );
}
