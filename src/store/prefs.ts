import { create } from "zustand";
import { getStored, setStored } from "../lib/adapters/storage";
import { setHapticsEnabled } from "../lib/adapters/haptics";
import type { Lang } from "../i18n/translations";

export type TextSize = "default" | "larger";

interface PrefsState {
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  textSize: TextSize;
  dataSaver: boolean;
  language: Lang;

  setReducedMotion: (v: boolean) => void;
  setHaptics: (v: boolean) => void;
  setTextSize: (v: TextSize) => void;
  setDataSaver: (v: boolean) => void;
  setLanguage: (v: Lang) => void;
  init: () => void;
}

function applyLang(lang: Lang) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

export const usePrefs = create<PrefsState>((set) => ({
  reducedMotion: false,
  hapticsEnabled: true,
  textSize: "default",
  dataSaver: false,
  language: "en",

  setReducedMotion: (v) => {
    setStored("mococha-reduced-motion", String(v));
    if (v && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--motion-scale", "0");
    }
    set({ reducedMotion: v });
  },

  setHaptics: (v) => {
    setStored("mococha-haptics", String(v));
    setHapticsEnabled(v);
    set({ hapticsEnabled: v });
  },

  setTextSize: (v) => {
    setStored("mococha-text-size", v);
    if (typeof document !== "undefined") {
      document.documentElement.style.fontSize = v === "larger" ? "17px" : "16px";
    }
    set({ textSize: v });
  },

  setDataSaver: (v) => {
    setStored("mococha-data-saver", String(v));
    set({ dataSaver: v });
  },

  setLanguage: (v) => {
    setStored("mococha-language", v);
    applyLang(v);
    set({ language: v });
  },

  init: () => {
    const rm = getStored("mococha-reduced-motion") === "true";
    const hp = getStored("mococha-haptics") !== "false";
    const ts = (getStored("mococha-text-size") as TextSize) ?? "default";
    const ds = getStored("mococha-data-saver") === "true";
    const storedLang = getStored("mococha-language") as Lang | null;
    const lang: Lang = storedLang === "nl" || storedLang === "en" ? storedLang : "en";
    if (rm && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--motion-scale", "0");
    }
    if (ts === "larger" && typeof document !== "undefined") {
      document.documentElement.style.fontSize = "17px";
    }
    applyLang(lang);
    setHapticsEnabled(hp);
    set({ reducedMotion: rm, hapticsEnabled: hp, textSize: ts, dataSaver: ds, language: lang });
  },
}));
