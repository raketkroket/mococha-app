import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Category, Product, Theme, StylingPackage, SurchargeRule, Review } from "../types";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        experimental: {
          passkey: true,
        },
      },
    })
  : null;
const cache = new Map<string, unknown>();
export async function fetchCategories(): Promise<Category[]> {
  if (!supabase) return [];
  if (cache.has("categories")) return cache.get("categories") as Category[];
  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
  if (error) return []; cache.set("categories", data as Category[]); return data as Category[];
}
export async function fetchCategoryBySlug(slug: string): Promise<Category | null> { const all = await fetchCategories(); return all.find((c) => c.slug === slug) ?? null; }
export async function fetchProductsByCategory(categoryId: string): Promise<Product[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("*, product_images(*)").eq("category_id", categoryId).order("sort_date", { ascending: false });
  if (error) return [];
  return (data as Product[]).map((p) => ({ ...p, images: (p as unknown as { product_images?: Product["images"] }).product_images ?? [] }));
}
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("products").select("*, product_images(*)").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return { ...data, images: (data as unknown as { product_images?: Product["images"] }).product_images ?? [] } as Product;
}
export async function fetchAllProducts(): Promise<Product[]> {
  if (!supabase) return [];
  if (cache.has("products")) return cache.get("products") as Product[];
  const { data, error } = await supabase.from("products").select("*").order("sort_date", { ascending: false });
  if (error) return []; cache.set("products", data as Product[]); return data as Product[];
}
export async function searchProducts(query: string): Promise<Product[]> {
  const all = await fetchAllProducts(); const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter((p) => p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q) || (p.theme ?? "").toLowerCase().includes(q) || (p.color ?? "").toLowerCase().includes(q));
}
export async function fetchThemes(): Promise<Theme[]> { if (!supabase) return []; const { data, error } = await supabase.from("themes").select("*").order("sort_order", { ascending: true }); if (error) return []; return data as Theme[]; }
export async function fetchStylingPackages(): Promise<StylingPackage[]> { if (!supabase) return []; const { data, error } = await supabase.from("styling_packages").select("*").order("sort_order", { ascending: true }); if (error) return []; return data as StylingPackage[]; }
export async function fetchSurcharges(): Promise<SurchargeRule[]> { if (!supabase) return []; const { data, error } = await supabase.from("surcharge_rules").select("*"); if (error) return []; return data as SurchargeRule[]; }
export async function fetchReviews(): Promise<Review[]> { if (!supabase) return []; const { data, error } = await supabase.from("reviews").select("id, name, rating, body, created_at").eq("is_public", true).order("created_at", { ascending: false }); if (error) return []; return (data as Review[]) ?? []; }
export function imageUrl(product: Product): string { if (product.images && product.images.length > 0) return product.images[0].url; return "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=600&h=600&q=80"; }
