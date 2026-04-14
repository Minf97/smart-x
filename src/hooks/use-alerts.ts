import type { Item } from "@shared/types/alert";
import type { CodeRequest } from "@shared/types/project";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { listAlerts, syncAlerts } from "@/api/alerts";
import { getCurrentProject } from "@/hooks/use-projects";
import { useAlertStore } from "@/store/alert-store";
import { useProjectStore } from "@/store/project-store";

// 查询键
export const ALERTS_QUERY_KEY = ["alerts"] as const;
const ALERTS_SYNC_QUERY_KEY = ["alerts-sync"] as const;
const ALERTS_SYNC_INTERVAL = 30_000;

// 匹配词
function getSearchText(item: Item) {
  return [
    item.id,
    item.title,
    item.detail.summary.source,
    item.detail.error.message,
  ]
    .join(" ")
    .toLowerCase();
}

// 查询列表
export function useAlertsQuery() {
  return useQuery({
    queryFn: listAlerts,
    queryKey: ALERTS_QUERY_KEY,
  });
}

// 同步远端报警
function useAlertsSyncQuery() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: syncAlerts,
    queryKey: ALERTS_SYNC_QUERY_KEY,
    refetchInterval: ALERTS_SYNC_INTERVAL,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    const count =
      (query.data?.insertedCount ?? 0) + (query.data?.updatedCount ?? 0);

    if (count === 0) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ALERTS_QUERY_KEY,
    });
  }, [query.data, queryClient]);

  return query;
}

// 首屏状态
export function useDashboardBootstrap() {
  // 拉取未同步的报警列表，然后sync 状态
  const query = useAlertsQuery();
  useAlertsSyncQuery();
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const hydrateProjects = useProjectStore((state) => state.hydrateProjects);
  const projects = useProjectStore((state) => state.projects);
  const currentProject = useMemo(
    () => getCurrentProject(projects, currentProjectId),
    [currentProjectId, projects]
  );
  const waitingProject =
    !!query.data &&
    query.data.projects.length > 0 &&
    (projects.length === 0 || currentProjectId === null);

  useEffect(() => {
    if (!query.data) {
      return;
    }

    hydrateProjects(query.data.projects);
  }, [hydrateProjects, query.data]);

  const error = useMemo(() => {
    if (query.error) {
      return query.error;
    }

    if (query.isLoading || !query.data) {
      return null;
    }

    if (query.data.projects.length === 0) {
      return new Error("Projects are missing.");
    }

    if (!(waitingProject || currentProject)) {
      return new Error("Current project not found.");
    }

    return null;
  }, [
    currentProject,
    query.data,
    query.error,
    query.isLoading,
    waitingProject,
  ]);

  return {
    ...query,
    error,
    loading: query.isLoading || !query.data || waitingProject,
  };
}

// 报警视图
export function useAlertView() {
  const query = useAlertsQuery();
  const priorityFilters = useAlertStore((state) => state.priorityFilters);
  const search = useAlertStore((state) => state.search);
  const selectedId = useAlertStore((state) => state.selectedId);
  const setSelectedId = useAlertStore((state) => state.setSelectedId);
  const statusFilters = useAlertStore((state) => state.statusFilters);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const projects = useProjectStore((state) => state.projects);
  const items = query.data?.alerts ?? [];
  const currentProject = useMemo(
    () => getCurrentProject(projects, currentProjectId),
    [currentProjectId, projects]
  );
  const loading =
    query.isLoading ||
    !query.data ||
    (query.data.projects.length > 0 &&
      (projects.length === 0 || currentProjectId === null));
  const error = useMemo(() => {
    if (query.error) {
      return query.error;
    }

    if (query.isLoading || !query.data) {
      return null;
    }

    if (query.data.projects.length === 0) {
      return new Error("Projects are missing.");
    }

    if (!currentProject) {
      return new Error("Current project not found.");
    }

    return null;
  }, [currentProject, query.data, query.error, query.isLoading]);

  // 筛选列表
  const filteredItems = useMemo(() => {
    if (!currentProject) {
      return [];
    }

    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesProject = item.projectId === currentProject.id;
      const matchesSearch = !keyword || getSearchText(item).includes(keyword);
      const matchesStatus =
        statusFilters.length === 0 || statusFilters.includes(item.status);
      const matchesPriority =
        priorityFilters.length === 0 || priorityFilters.includes(item.priority);

      return (
        matchesProject && matchesSearch && matchesStatus && matchesPriority
      );
    });
  }, [currentProject, items, priorityFilters, search, statusFilters]);

  // 同步选中
  useEffect(() => {
    if (loading || error) {
      return;
    }

    const matched = filteredItems.find((item) => item.id === selectedId);
    const nextSelectedId = matched?.id ?? filteredItems[0]?.id ?? null;

    if (nextSelectedId === selectedId) {
      return;
    }

    setSelectedId(nextSelectedId);
  }, [error, filteredItems, loading, selectedId, setSelectedId]);

  // 当前选中
  const selectedItem = useMemo(() => {
    return (
      filteredItems.find((item) => item.id === selectedId) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, selectedId]);
  const selectedRequest = useMemo<CodeRequest | null>(() => {
    if (!(currentProject && selectedItem)) {
      return null;
    }

    return currentProject.requestMap[selectedItem.id] ?? null;
  }, [currentProject, selectedItem]);

  return {
    ...query,
    error,
    filteredItems,
    items,
    loading,
    currentProject,
    projects,
    selectedItem,
    selectedRequest,
  };
}
