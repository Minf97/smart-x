import type { ItemPriority, ItemStatus } from "@shared/types/alert";
import { create } from "zustand";

// 标签项
interface FilterTag {
  type: "priority" | "status";
  value: ItemPriority | ItemStatus;
}

// 状态结构
interface AlertStore {
  clearFilters: () => void;
  filterTags: FilterTag[];
  hoveredId: string | null;
  priorityFilters: ItemPriority[];
  search: string;
  selectedId: string | null;
  setHoveredId: (hoveredId: string | null) => void;
  setPriorityFilters: (priority: ItemPriority) => void;
  setSearch: (search: string) => void;
  setSelectedId: (selectedId: string | null) => void;
  setStatusFilters: (status: ItemStatus) => void;
  statusFilters: ItemStatus[];
}

// 标签列表
function buildFilterTags(state: AlertStore): FilterTag[] {
  return [
    ...state.statusFilters.map((value) => ({
      type: "status" as const,
      value,
    })),
    ...state.priorityFilters.map((value) => ({
      type: "priority" as const,
      value,
    })),
  ];
}

// 状态补丁
function buildStatePatch(state: AlertStore, patch: Partial<AlertStore>) {
  const nextState = {
    ...state,
    ...patch,
    priorityFilters: patch.priorityFilters ?? state.priorityFilters,
    statusFilters: patch.statusFilters ?? state.statusFilters,
  } satisfies AlertStore;

  return {
    ...patch,
    filterTags: buildFilterTags(nextState),
  };
}

const initialState = {
  filterTags: [],
  hoveredId: null,
  priorityFilters: [],
  search: "",
  selectedId: null,
  statusFilters: [],
} satisfies Pick<
  AlertStore,
  | "filterTags"
  | "hoveredId"
  | "priorityFilters"
  | "search"
  | "selectedId"
  | "statusFilters"
>;

// 列表仓库
export const useAlertStore = create<AlertStore>((set, get) => ({
  ...initialState,
  // 清空筛选
  clearFilters() {
    set((state) =>
      buildStatePatch(state, {
        priorityFilters: [],
        statusFilters: [],
      })
    );
  },
  setPriorityFilters(priority) {
    const next = get().priorityFilters.includes(priority)
      ? get().priorityFilters.filter((item) => item !== priority)
      : [...get().priorityFilters, priority];

    set((state) =>
      buildStatePatch(state, {
        priorityFilters: next,
      })
    );
  },
  setHoveredId(hoveredId) {
    set({ hoveredId });
  },
  setSearch(search) {
    set((state) =>
      buildStatePatch(state, {
        search,
      })
    );
  },
  setSelectedId(selectedId) {
    set((state) =>
      buildStatePatch(state, {
        selectedId,
      })
    );
  },
  setStatusFilters(status) {
    const next = get().statusFilters.includes(status)
      ? get().statusFilters.filter((item) => item !== status)
      : [...get().statusFilters, status];

    set((state) =>
      buildStatePatch(state, {
        statusFilters: next,
      })
    );
  },
}));
