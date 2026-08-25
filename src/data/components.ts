import { supabase } from "./api";
import type { PricingUnit } from "../lib/pricing";

export interface ComponentCategory {
  id: string;
  step_key: string;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface PartyComponent {
  id: string;
  key: string;
  name: string;
  description: string | null;
  base_price: number;
  pricing_unit: PricingUnit;
  vat_rate: number;
  price_includes_vat: boolean;
  requires_large_bus: boolean;
  requires_consultation: boolean;
  dimensions: string | null;
  indoor_outdoor: string | null;
  minimum_quantity: number;
  maximum_quantity: number;
  sort_order: number;
  category_id: string;
  image_url: string | null;
}

export interface ComponentWithMedia extends PartyComponent {
  media: { storage_path: string; alt_text: string | null; is_primary: boolean }[];
}

const cache = new Map<string, unknown>();

export async function fetchCategories(): Promise<ComponentCategory[]> {
  if (cache.has("categories")) return cache.get("categories") as ComponentCategory[];
  if (!supabase) return [];
  const { data, error } = await supabase.from("component_categories").select("*").order("sort_order");
  if (error || !data) return [];
  const result = data as ComponentCategory[];
  cache.set("categories", result);
  return result;
}

export async function fetchComponentsByStep(stepKey: string): Promise<PartyComponent[]> {
  const cacheKey = `components_${stepKey}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) as PartyComponent[];
  if (!supabase) return [];
  const { data: cat } = await supabase.from("component_categories").select("id").eq("step_key", stepKey).maybeSingle();
  if (!cat) return [];
  const { data, error } = await supabase
    .from("party_components")
    .select("*, component_media(storage_path, alt_text, is_primary)")
    .eq("category_id", cat.id)
    .eq("is_active", true)
    .order("sort_order");
  if (error || !data) return [];
  const result = (data as unknown as Array<PartyComponent & { component_media?: { storage_path: string; alt_text: string | null; is_primary: boolean }[] }>).map((p) => ({
    ...p,
    key: p.key ?? "",
    image_url: p.component_media?.find((m) => m.is_primary)?.storage_path ?? p.component_media?.[0]?.storage_path ?? null,
  }));
  cache.set(cacheKey, result);
  return result;
}

export function clearComponentCache(): void { cache.clear(); }
