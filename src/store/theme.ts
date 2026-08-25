import { create } from "zustand";
import { getStored, setStored } from "../lib/adapters/storage";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  applyTheme: () => void;
  init: () => void;
}

const STORAGE_KEY = "mococha-theme";

function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyToDocument(isDark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: "system",
  isDark: false,

  setMode: (mode) => {
    setStored(STORAGE_KEY, mode);
    const isDark = resolveDark(mode);
    applyToDocument(isDark);
    set({ mode, isDark });
  },

  applyTheme: () => {
    const { mode } = get();
    const isDark = resolveDark(mode);
    applyToDocument(isDark);
    set({ isDark });
  },

  init: () => {
    const stored = getStored(STORAGE_KEY) as ThemeMode | null;
    const mode = stored ?? "system";
    const isDark = resolveDark(mode);
    // Apply before render to prevent flash
    applyToDocument(isDark);
    set({ mode, isDark });

    // Listen for system changes
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", () => {
        if (get().mode === "system") {
          const dark = mq.matches;
          applyToDocument(dark);
          set({ isDark: dark });
        }
      });
    }
  },
}));
