import { create } from "zustand";
import { listAlerts } from "@/api/alerts";
import type { Item, ItemPriority, ItemStatus } from "@/types/alert";

// 视图输入
interface AlertViewInput {
  items: Item[];
  priorityFilters: ItemPriority[];
  search: string;
  selectedId: string | null;
  statusFilters: ItemStatus[];
}

// 标签项
interface FilterTag {
  type: "priority" | "status";
  value: ItemPriority | ItemStatus;
}

// 状态结构
interface AlertStore extends AlertViewInput {
  clearFilters: () => void;
  error: string | null;
  fetchItems: () => Promise<void>;
  filteredItems: Item[];
  filterTags: FilterTag[];
  hoveredId: string | null;
  loading: boolean;
  selectedItem: Item | null;
  setHoveredId: (hoveredId: string | null) => void;
  setPriorityFilters: (priority: ItemPriority) => void;
  setSearch: (search: string) => void;
  setSelectedId: (selectedId: string) => void;
  setStatusFilters: (status: ItemStatus) => void;
}

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

// 列表筛选
function buildFilteredItems(state: AlertViewInput) {
  const keyword = state.search.trim().toLowerCase();

  return state.items.filter((item) => {
    const matchesSearch = !keyword || getSearchText(item).includes(keyword);
    const matchesStatus =
      state.statusFilters.length === 0 ||
      state.statusFilters.includes(item.status);
    const matchesPriority =
      state.priorityFilters.length === 0 ||
      state.priorityFilters.includes(item.priority);

    return matchesSearch && matchesStatus && matchesPriority;
  });
}

// 标签列表
function buildFilterTags(state: AlertViewInput): FilterTag[] {
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

// 当前选中
function resolveSelectedItem(items: Item[], selectedId: string | null) {
  return items.find((item) => item.id === selectedId) ?? items[0] ?? null;
}

// 派生视图
function buildViewState(state: AlertViewInput) {
  const filteredItems = buildFilteredItems(state);

  return {
    filteredItems,
    filterTags: buildFilterTags(state),
    selectedItem: resolveSelectedItem(filteredItems, state.selectedId),
  };
}

// 状态补丁
function buildStatePatch(
  state: AlertViewInput,
  patch: Partial<AlertViewInput>
) {
  const nextState = {
    items: patch.items ?? state.items,
    priorityFilters: patch.priorityFilters ?? state.priorityFilters,
    search: patch.search ?? state.search,
    selectedId:
      patch.selectedId === undefined ? state.selectedId : patch.selectedId,
    statusFilters: patch.statusFilters ?? state.statusFilters,
  } satisfies AlertViewInput;

  return {
    ...patch,
    ...buildViewState(nextState),
  };
}

const initialState = {
  items: [],
  priorityFilters: [],
  search: "",
  selectedId: null,
  statusFilters: [],
} satisfies AlertViewInput;

// 列表仓库
export const useAlertStore = create<AlertStore>((set, get) => ({
  ...initialState,
  ...buildViewState(initialState),
  // 清空筛选
  clearFilters() {
    set((state) =>
      buildStatePatch(state, {
        priorityFilters: [],
        statusFilters: [],
      })
    );
  },
  error: null,
  // 拉取列表
  async fetchItems() {
    if (get().loading) {
      return;
    }

    set({
      error: null,
      loading: true,
    });

    try {
      const items = await listAlerts();

      set((state) => ({
        ...buildStatePatch(state, {
          items,
          selectedId: state.selectedId ?? items[0]?.id ?? null,
        }),
        loading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load alerts.",
        loading: false,
      });
    }
  },
  // 悬停态
  hoveredId: null,
  // 加载态
  loading: false,
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
