import type {
  CodeRequestCreateProgress,
  Project,
} from "@shared/types/project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { openExternalLink } from "@/actions/shell";
import {
  closeAlertRequest,
  mergeAlertRequest,
  pollCreateAlertRequest,
  startCreateAlertRequest,
} from "@/api/alerts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ALERTS_QUERY_KEY, useAlertView } from "@/hooks/use-alerts";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import { updateAlertStatusInDashboard } from "./alert-cache";

type RequestAction = "close" | "create" | "merge";
type RemoteRequestAction = Exclude<RequestAction, "create">;

const CREATE_REQUEST_QUERY_KEY = ["alert-request-create"] as const;
const CREATE_REQUEST_TOAST_ID = "alert-request-create";

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

// 步骤文案
function getCreateRequestStepText(
  step: CodeRequestCreateProgress["step"],
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const stepMap = {
    applyFix: t("dashboard.requestCreateStepApplyFix"),
    commitChanges: t("dashboard.requestCreateStepCommitChanges"),
    createRemoteRequest: t("dashboard.requestCreateStepCreateRemoteRequest"),
    done: t("dashboard.requestCreateStepDone"),
    loadAlert: t("dashboard.requestCreateStepLoadAlert"),
    syncBranch: t("dashboard.requestCreateStepSyncBranch"),
  } as const satisfies Record<CodeRequestCreateProgress["step"], string>;

  return stepMap[step];
}

// 是否创建中
function isPendingCreateProgress(progress?: CodeRequestCreateProgress | null) {
  return progress?.status === "pending";
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
  const [createProgress, setCreateProgress] =
    useState<CodeRequestCreateProgress | null>(null);
  const [createAlertId, setCreateAlertId] = useState<string | null>(null);
  const [createSessionId, setCreateSessionId] = useState<string | null>(null);
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
  const pollCreateQuery = useQuery({
    enabled: !!createSessionId,
    queryFn: () => {
      if (!createSessionId) {
        throw new Error("PR/MR creation session is not ready.");
      }

      return pollCreateAlertRequest(createSessionId);
    },
    queryKey: [...CREATE_REQUEST_QUERY_KEY, createSessionId],
    refetchInterval(query) {
      if (query.state.data?.status !== "pending") {
        return false;
      }

      return 500;
    },
    retry: false,
  });
  const activeCreateProgress = pollCreateQuery.data ?? createProgress;
  const createRequestMutation = useMutation({
    mutationFn: startCreateAlertRequest,
    onError(error) {
      setCreateAlertId(null);
      setCreateProgress(null);
      setCreateSessionId(null);
      toast.error(
        error instanceof Error ? error.message : t("dashboard.createPrFailed")
      );
    },
    onSuccess(progress, alertId) {
      setCreateAlertId(alertId);
      setCreateProgress(progress);
      setCreateSessionId(progress.sessionId);
      toast.loading(t("dashboard.createPrPending"), {
        description: getCreateRequestStepText(progress.step, t),
        id: CREATE_REQUEST_TOAST_ID,
      });
    },
  });
  const requestMutation = useMutation({
    mutationFn: ({ action, id }: { action: RemoteRequestAction; id: string }) => {
      switch (action) {
        case "merge":
          return mergeAlertRequest(id);
        case "close":
          return closeAlertRequest(id);
      }
    },
    onError(_, variables) {
      const toastKey = getRequestToastKey(variables.action);
      toast.error(t(toastKey.error));
    },
    onSuccess(updatedProject, variables) {
      const toastKey = getRequestToastKey(variables.action);
      updateProjectCache(queryClient, updatedProject);
      if (variables.action === "merge") {
        updateAlertStatusCache(queryClient, variables.id, "done");
      }
      updateProject(updatedProject);
      toast.success(t(toastKey.success));
    },
  });
  const isCreatingRequest =
    createRequestMutation.isPending ||
    isPendingCreateProgress(activeCreateProgress);
  const disabled =
    loading || !selectedItem || requestMutation.isPending || isCreatingRequest;
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

  useEffect(() => {
    const progress = pollCreateQuery.data;

    if (!progress) {
      return;
    }

    setCreateProgress(progress);

    if (progress.status === "pending") {
      toast.loading(t("dashboard.createPrPending"), {
        description: getCreateRequestStepText(progress.step, t),
        id: CREATE_REQUEST_TOAST_ID,
      });
      return;
    }

    toast.dismiss(CREATE_REQUEST_TOAST_ID);
    setCreateAlertId(null);
    setCreateSessionId(null);

    if (progress.status === "failed") {
      toast.error(progress.errorMessage ?? t("dashboard.createPrFailed"));
      return;
    }

    if (progress.project && createAlertId) {
      updateProjectCache(queryClient, progress.project);
      updateAlertStatusCache(queryClient, createAlertId, "in_review");
      updateProject(progress.project);
    }

    toast.success(t("dashboard.createPrSuccess"));
  }, [createAlertId, pollCreateQuery.data, queryClient, t, updateProject]);

  useEffect(() => {
    if (!pollCreateQuery.error) {
      return;
    }

    toast.dismiss(CREATE_REQUEST_TOAST_ID);
    setCreateAlertId(null);
    setCreateProgress(null);
    setCreateSessionId(null);
    toast.error(
      pollCreateQuery.error instanceof Error
        ? pollCreateQuery.error.message
        : t("dashboard.createPrFailed")
    );
  }, [pollCreateQuery.error, t]);

  // 发动作
  function handleRequestAction(action: RequestAction) {
    if (!selectedItem) {
      return;
    }

    if (action === "create") {
      setCreateAlertId(selectedItem.id);
      createRequestMutation.mutate(selectedItem.id);
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
        {isCreatingRequest && (
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
