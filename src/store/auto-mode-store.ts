import { create } from "zustand";

interface AutoModeStore {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

// 自动模式
export const useAutoModeStore = create<AutoModeStore>((set) => ({
  enabled: false,
  setEnabled(enabled) {
    set({ enabled });
  },
  toggle() {
    set((state) => ({
      enabled: !state.enabled,
    }));
  },
}));
