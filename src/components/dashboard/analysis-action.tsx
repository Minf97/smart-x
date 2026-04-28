import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SearchCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { analyzeAlert } from "@/api/alerts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import type { DashboardData } from "@/types/dashboard";

// 写缓存
function updateAlertCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedAlert: DashboardData["alerts"][number]
) {
  queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) => {
    if (!data) {
      return data;
    }

    return {
      ...data,
      alerts: data.alerts.map((item) =>
        item.id === updatedAlert.id ? updatedAlert : item
      ),
    };
  });
}

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
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : t("dashboard.analyzeFailed")
      );
    },
    onSuccess(updatedAlert) {
      updateAlertCache(queryClient, updatedAlert);
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
      {t("dashboard.analyzeAlert")}
    </Button>
  );
}
