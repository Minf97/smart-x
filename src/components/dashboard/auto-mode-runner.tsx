import type { Item } from "@shared/types/alert";
import type { CodeRequestCreateProgress, Project } from "@shared/types/project";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  analyzeAlert,
  pollCreateAlertRequest,
  startCreateAlertRequest,
  updateAlertStatus,
} from "@/api/alerts";
import { ALERTS_QUERY_KEY, useAlertsQuery } from "@/hooks/use-alerts";
import { useAutoModeStore } from "@/store/auto-mode-store";
import { useProjectStore } from "@/store/project-store";
import type { DashboardData } from "@/types/dashboard";
import {
  replaceAlertInDashboard,
  updateAlertStatusInDashboard,
} from "./alert-cache";

const AUTO_MODE_POLL_MS = 500;

interface AutoModeCreatedResult {
  alertId: string;
  project: Project;
  type: "created";
}

interface AutoModeBacklogResult {
  alertId: string;
  item: Item;
  type: "backlog";
}

type AutoModeResult = AutoModeBacklogResult | AutoModeCreatedResult;

// 暂停轮询
async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// AI 配置
function hasAiConfig(project: Project) {
  return !!(
    project.aiConfig.apiKey.trim() &&
    project.aiConfig.baseUrl.trim() &&
    project.aiConfig.model.trim()
  );
}

// 仓库配置
function hasRepoPath(project: Project) {
  return project.repoConfig.managedRepoPath.trim().length > 0;
}

// 可处理项
function canProcessAlert(item: Item, project: Project) {
  return (
    (item.status === "backlog" || item.status === "todo") &&
    !project.requestMap[item.id] &&
    item.detail.analysis?.fixDecision?.action !== "keep_backlog" &&
    hasAiConfig(project) &&
    hasRepoPath(project)
  );
}

// 写项目缓存
function updateProjectCache(data: DashboardData | undefined, project: Project) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    projects: data.projects.map((item) =>
      item.id === project.id ? project : item
    ),
  };
}

// 等待创建
async function pollRequestUntilDone(sessionId: string) {
  let progress: CodeRequestCreateProgress;

  do {
    await delay(AUTO_MODE_POLL_MS);
    progress = await pollCreateAlertRequest(sessionId);
  } while (progress.status === "pending");

  if (progress.status === "failed") {
    throw new Error(progress.errorMessage ?? "Failed to create PR/MR.");
  }

  if (!progress.project) {
    throw new Error("Created PR/MR project result is missing.");
  }

  return progress.project;
}

// 自动处理
async function runAutoModeAlert(
  alertId: string,
  queryClient: ReturnType<typeof useQueryClient>
) {
  const analyzed = await analyzeAlert(alertId);

  queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
    replaceAlertInDashboard(data, analyzed)
  );

  if (analyzed.detail.analysis?.fixDecision?.action === "keep_backlog") {
    const item = await updateAlertStatus(alertId, "backlog");

    queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
      replaceAlertInDashboard(data, item)
    );

    return {
      alertId,
      item,
      type: "backlog",
    } satisfies AutoModeResult;
  }

  const started = await startCreateAlertRequest(alertId);
  const project = await pollRequestUntilDone(started.sessionId);

  return {
    alertId,
    project,
    type: "created",
  } satisfies AutoModeResult;
}

export default function AutoModeRunner() {
  const { t } = useTranslation();
  const query = useAlertsQuery();
  const queryClient = useQueryClient();
  const enabled = useAutoModeStore((state) => state.enabled);
  const updateProject = useProjectStore((state) => state.updateProject);
  const attemptedIds = useRef(new Set<string>());
  const nextAlert =
    enabled && query.data
      ? (query.data.alerts.find((item) => {
          const project = query.data.projects.find(
            (projectItem) => projectItem.id === item.projectId
          );

          return (
            !!project &&
            !attemptedIds.current.has(item.id) &&
            canProcessAlert(item, project)
          );
        }) ?? null)
      : null;
  const mutation = useMutation({
    mutationFn: (alertId: string) => runAutoModeAlert(alertId, queryClient),
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : t("dashboard.autoModeFailed")
      );
    },
    onMutate(alertId) {
      attemptedIds.current.add(alertId);
      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        updateAlertStatusInDashboard(data, alertId, "in_progress")
      );
      toast.loading(t("dashboard.autoModeProcessing"), {
        id: `auto-mode-${alertId}`,
      });
    },
    onSettled(_data, _error, alertId) {
      toast.dismiss(`auto-mode-${alertId}`);
    },
    onSuccess(result) {
      if (result.type === "backlog") {
        toast.success(t("dashboard.autoModeKeptBacklog"));
        return;
      }

      queryClient.setQueryData<DashboardData>(ALERTS_QUERY_KEY, (data) =>
        updateProjectCache(
          updateAlertStatusInDashboard(data, result.alertId, "in_review"),
          result.project
        )
      );
      updateProject(result.project);
      toast.success(t("dashboard.autoModeSuccess"));
    },
  });

  useEffect(() => {
    if (enabled) {
      attemptedIds.current.clear();
    }
  }, [enabled]);

  useEffect(() => {
    if (!(enabled && nextAlert && !mutation.isPending)) {
      return;
    }

    mutation.mutate(nextAlert.id);
  }, [enabled, mutation, nextAlert]);

  return null;
}
