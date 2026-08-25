export const eur = (n: number): string => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
export const eurFrom = (n: number): string => `vanaf ${eur(n)}`;
export const formatDate = (d: string | Date, lang: string = "en"): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const locale = lang === "nl" ? "nl-NL" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
};
export const nlDate = (d: string | Date): string => formatDate(d, "nl");
export const orderNumber = (): string => "MC-" + new Date().getFullYear() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
export { haptic } from "../lib/adapters/haptics";
export function readFileAsDataURL(file: File): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file); }); }
