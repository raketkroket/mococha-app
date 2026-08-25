import { usePrefs } from "../store/prefs";
import type { Lang } from "./translations";
import { translations, type TranslationDict } from "./translations";

function resolve<T extends TranslationDict>(dict: T, path: string): string {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function useI18n() {
  const lang = usePrefs((s) => s.language);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const dict = translations[lang] as TranslationDict;

  const t = (path: string, vars?: Record<string, string | number>): string => {
    const raw = resolve(dict, path);
    return interpolate(raw, vars);
  };

  return { t, lang, setLang: setLanguage } as { t: typeof t; lang: Lang; setLang: (v: Lang) => void };
}

export function getLang(): Lang {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("mococha-language") : null;
  return (stored === "nl" || stored === "en") ? stored : "en";
}

export function setLang(lang: Lang) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("mococha-language", lang);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}
