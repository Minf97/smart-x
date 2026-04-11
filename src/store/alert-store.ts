import { create } from "zustand";
import { listAlerts } from "@/api/alerts";
import type { Item } from "@/types/alert";

// 状态结构
interface AlertStore {
  error: string | null;
  fetchItems: () => Promise<void>;
  hoveredId: string | null;
  items: Item[];
  loading: boolean;
  search: string;
  selectedId: string | null;
  setHoveredId: (hoveredId: string | null) => void;
  setSearch: (search: string) => void;
  setSelectedId: (selectedId: string) => void;
}

// 列表仓库
export const useAlertStore = create<AlertStore>((set, get) => ({
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
      const selectedId = get().selectedId ?? items[0]?.id ?? null;

      set({
        items,
        loading: false,
        selectedId,
      });
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
  // 列表态
  items: [],
  // 加载态
  loading: false,
  // 搜索态
  search: "",
  // 选中态
  selectedId: null,
  setHoveredId(hoveredId) {
    set({ hoveredId });
  },
  setSearch(search) {
    set({ search });
  },
  setSelectedId(selectedId) {
    set({ selectedId });
  },
}));
