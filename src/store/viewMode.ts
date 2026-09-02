import { create } from "zustand";
import { getStored, setStored } from "../lib/adapters/storage";

export type ViewMode = "user" | "admin";

type ViewModeState = {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  init: () => void;
};

export const useViewMode = create<ViewModeState>((set) => ({
  mode: "user",
  setMode: (mode) => {
    setStored("mococha-view-mode", mode);
    set({ mode });
  },
  init: () => {
    const stored = getStored("mococha-view-mode");
    set({ mode: stored === "admin" ? "admin" : "user" });
  },
}));