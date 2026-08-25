// Pricing Engine
// Centralized calculation — all screens import from here.
// Never calculate totals independently elsewhere.

import { eur } from "../utils/format";

export type PricingUnit =
  | "one_time"
  | "per_item"
  | "per_child"
  | "per_participating_child"
  | "per_table"
  | "per_meter"
  | "manual_quote";

export interface Selection {
  id: string;
  step_key: string;
  component_id: string | null;
  title: string;
  unit_price: number;      // NEVER store a multiplied value here
  quantity: number;
  pricing_unit: PricingUnit;
  vat_rate: number;         // e.g. 21
  price_includes_vat: boolean;
  requires_large_bus: boolean;
  requires_consultation: boolean;
  metadata: Record<string, string>;
}

// line_total = unit_price × quantity  —  never multiply again
export function lineTotal(sel: Selection): number {
  return sel.unit_price * sel.quantity;
}

export function requiredTables(numChildren: number): number {
  if (numChildren <= 0) return 0;
  return Math.max(1, Math.ceil(numChildren / 10));
}

export const LARGE_BUS_SURCHARGE = 350;

export interface PriceBreakdown {
  subtotal_gross: number;     // sum of all line_totals (VAT-inclusive)
  bus_surcharge: number;      // €350 if any large-bus item, else 0
  total_gross: number;        // subtotal_gross + bus_surcharge
  vat_portion: number;        // VAT extracted from the gross total
  net_total: number;          // total_gross minus VAT
  deposit_amount: number;     // 30% of total_gross
  remaining_amount: number;   // 70% of total_gross
}

export function calculateTotals(selections: Selection[]): PriceBreakdown {
  const subtotal_gross = selections.reduce((sum, s) => sum + lineTotal(s), 0);
  const hasBus = selections.some((s) => s.requires_large_bus);
  const bus_surcharge = hasBus ? LARGE_BUS_SURCHARGE : 0;
  const total_gross = subtotal_gross + bus_surcharge;

  let vat_portion = 0;
  for (const s of selections) {
    const lineGross = lineTotal(s);
    const rate = s.vat_rate || 21;
    if (s.price_includes_vat) {
      vat_portion += lineGross - lineGross / (1 + rate / 100);
    } else {
      vat_portion += lineGross * (rate / 100);
    }
  }
  vat_portion += bus_surcharge - bus_surcharge / 1.21;

  const net_total = total_gross - vat_portion;
  const deposit_amount = Math.round(total_gross * 0.3 * 100) / 100;
  const remaining_amount = Math.round((total_gross - deposit_amount) * 100) / 100;
  return { subtotal_gross, bus_surcharge, total_gross, vat_portion, net_total, deposit_amount, remaining_amount };
}

// Helper to format a transparent calculation string
export function formatCalc(sel: Selection): string {
  if (sel.pricing_unit === "one_time" || sel.quantity === 1) {
    return `${sel.title}: ${eur(sel.unit_price)}`;
  }
  const unitLabel: Record<PricingUnit, string> = {
    one_time: "",
    per_item: "items",
    per_child: "children",
    per_participating_child: "participants",
    per_table: "tables",
    per_meter: "meters",
    manual_quote: "",
  };
  const label = unitLabel[sel.pricing_unit];
  return `${sel.quantity} ${label} × ${eur(sel.unit_price)} = ${eur(lineTotal(sel))}`;
}
