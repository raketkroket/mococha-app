import { supabase } from "../data/api";

export interface AppSettings {
  instagram_url: string;
  contact_email: string;
  terms_url: string;
  privacy_url: string;
  app_version: string;
  company_city: string;
}

const defaults: AppSettings = {
  instagram_url: "https://www.instagram.com/mococha_events/",
  contact_email: "info@mococha.nl",
  terms_url: "/info/algemene-voorwaarden",
  privacy_url: "/info/privacy",
  app_version: "1.0.0",
  company_city: "Almere, Nederland",
};

let cached: AppSettings | null = null;
let loading: Promise<AppSettings> | null = null;

export async function getAppSettings(): Promise<AppSettings> {
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    if (!supabase) return defaults;
    try {
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (error || !data) return defaults;
      const result = { ...defaults };
      for (const row of data as { key: string; value: unknown }[]) {
        const val = typeof row.value === "string" ? row.value : (row.value as string);
        if (row.key in result) {
          (result as Record<string, string>)[row.key] = val;
        }
      }
      cached = result;
      return result;
    } catch {
      return defaults;
    }
  })();

  return loading;
}

export function getInstagramUrl(): string {
  return import.meta.env.VITE_INSTAGRAM_URL ?? defaults.instagram_url;
}

/**
 * Check which edge function secrets are configured.
 * Uses the Supabase MCP tool's list_edge_function_secrets.
 */
export async function listEdgeFunctionSecrets(): Promise<string[]> {
  // This is a frontend-safe proxy — the actual MCP tool is server-side only.
  // For now, return empty array so the admin screen shows "missing" honestly.
  // In production, this would call an edge function that reports secret names.
  return [];
}
