import type { Project } from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { openExternalLink } from "@/actions/shell";
import {
  closeAlertRequest,
  createAlertRequest,
  mergeAlertRequest,
} from "@/api/alerts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import { updateAlertStatusInDashboard } from "./alert-cache";

type RequestAction = "close" | "create" | "merge";

// 提示键
function getRequestToastKey(action: RequestAction) {
  switch (action) {
    case "merge":
      return {
        error: "dashboard.mergePrFailed",
        success: "dashboard.mergePrSuccess",
      } as const;
    case "close":
      return {
        error: "dashboard.closePrFailed",
        success: "dashboard.closePrSuccess",
      } as const;
    default:
      return {
        error: "dashboard.createPrFailed",
        success: "dashboard.createPrSuccess",
      } as const;
  }
}

// 写项目
function updateProjectCache(
  queryClient: ReturnType<typeof useQueryClient>,
  project: Project
) {
  queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) => {
    if (!data) {
      return data;
    }

    return {
      ...data,
      projects: data.projects.map((item) =>
        item.id === project.id ? project : item
      ),
    };
  });
}

// 写状态
function updateAlertStatusCache(
  queryClient: ReturnType<typeof useQueryClient>,
  alertId: string,
  status: "in_review" | "done"
) {
  queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
    updateAlertStatusInDashboard(data, alertId, status)
  );
}

export default function RequestActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateProject = useProjectStore((state) => state.updateProject);
  const {
    currentProject,
    loading,
    selectedItem,
    selectedRequest: request,
  } = useAlertView();
  const hasAiConfig =
    (currentProject?.aiConfig.apiKey.trim().length ?? 0) > 0 &&
    (currentProject?.aiConfig.baseUrl.trim().length ?? 0) > 0 &&
    (currentProject?.aiConfig.model.trim().length ?? 0) > 0;
  const hasRepoPath =
    (currentProject?.repoConfig.managedRepoPath.trim().length ?? 0) > 0;
  const hasAnalysis = !!(
    selectedItem?.detail.analysis?.rootCause?.trim() ||
    selectedItem?.detail.analysis?.impact?.trim() ||
    selectedItem?.detail.analysis?.codeLocations?.length ||
    selectedItem?.detail.analysis?.fixSuggestions?.length
  );
  const requestMutation = useMutation({
    mutationFn: ({ action, id }: { action: RequestAction; id: string }) => {
      switch (action) {
        case "merge":
          return mergeAlertRequest(id);
        case "close":
          return closeAlertRequest(id);
        default:
          return createAlertRequest(id);
      }
    },
    onError(_, variables) {
      const toastKey = getRequestToastKey(variables.action);
      toast.error(t(toastKey.error));
    },
    onSuccess(updatedProject, variables) {
      const toastKey = getRequestToastKey(variables.action);
      updateProjectCache(queryClient, updatedProject);
      if (variables.action === "create") {
        updateAlertStatusCache(queryClient, variables.id, "in_review");
      }
      if (variables.action === "merge") {
        updateAlertStatusCache(queryClient, variables.id, "done");
      }
      updateProject(updatedProject);
      toast.success(t(toastKey.success));
    },
  });
  const disabled = loading || !selectedItem || requestMutation.isPending;
  const createDisabled =
    disabled || !hasAiConfig || !hasRepoPath || !hasAnalysis;
  const pendingAction = requestMutation.variables?.action;
  let createTitle = t("dashboard.createPrRequiresAi");

  if (hasAiConfig) {
    createTitle = hasRepoPath
      ? hasAnalysis
        ? t("dashboard.createPr")
        : t("dashboard.createPrRequiresAnalysis")
      : t("dashboard.analyzeRequiresRepo");
  }

  // 发动作
  function handleRequestAction(action: RequestAction) {
    if (!selectedItem) {
      return;
    }

    requestMutation.mutate({
      action,
      id: selectedItem.id,
    });
  }

  // 开链接
  function handleView() {
    if (!request?.url) {
      return;
    }

    openExternalLink(request.url);
  }

  if (!request) {
    return (
      <Button
        disabled={createDisabled}
        onClick={() => handleRequestAction("create")}
        size="sm"
        title={createTitle}
      >
        {requestMutation.isPending && pendingAction === "create" && (
          <Spinner className="size-3" />
        )}
        {t("dashboard.createPr")}
      </Button>
    );
  }

  return (
    <>
      <Button
        className="bg-green-600 text-white hover:bg-green-500"
        disabled={disabled || !request.url}
        onClick={handleView}
        size="sm"
      >
        {t("dashboard.viewPr")}
      </Button>
      {request.state === "open" && (
        <Button
          disabled={disabled}
          onClick={() => handleRequestAction("merge")}
          size="sm"
          variant="outline"
        >
          {requestMutation.isPending && pendingAction === "merge" && (
            <Spinner className="size-3" />
          )}
          {t("dashboard.mergeCode")}
        </Button>
      )}
      {request.state === "open" && (
        <Button
          disabled={disabled}
          onClick={() => handleRequestAction("close")}
          size="sm"
          variant="ghost"
        >
          {requestMutation.isPending && pendingAction === "close" && (
            <Spinner className="size-3" />
          )}
          {t("dashboard.closePr")}
        </Button>
      )}
    </>
  );
}
