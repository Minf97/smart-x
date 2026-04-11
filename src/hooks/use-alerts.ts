import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listAlerts } from "@/api/alerts";
import { useAlertStore } from "@/store/alert-store";
import type { Item } from "@/types/alert";

// 查询键
export const ALERTS_QUERY_KEY = ["alerts"] as const;

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

// 报警视图
export function useAlertView() {
  const query = useAlertsQuery();
  const priorityFilters = useAlertStore((state) => state.priorityFilters);
  const search = useAlertStore((state) => state.search);
  const selectedId = useAlertStore((state) => state.selectedId);
  const statusFilters = useAlertStore((state) => state.statusFilters);
  const items = query.data ?? [];

  // 筛选列表
  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch = !keyword || getSearchText(item).includes(keyword);
      const matchesStatus =
        statusFilters.length === 0 || statusFilters.includes(item.status);
      const matchesPriority =
        priorityFilters.length === 0 || priorityFilters.includes(item.priority);

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, priorityFilters, search, statusFilters]);

  // 当前选中
  const selectedItem = useMemo(() => {
    return (
      filteredItems.find((item) => item.id === selectedId) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, selectedId]);

  return {
    ...query,
    filteredItems,
    items,
    loading: query.isLoading,
    selectedItem,
  };
}
