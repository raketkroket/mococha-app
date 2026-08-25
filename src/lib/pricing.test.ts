// Pricing engine tests
// Run with: npx vitest run src/lib/pricing.test.ts
// Or: npx tsx src/lib/pricing.test.ts

import { calculateTotals, lineTotal, requiredTables, type Selection } from "./pricing";

function makeSel(overrides: Partial<Selection> & { unit_price: number; quantity: number; step_key: string; title: string }): Selection {
  return {
    id: crypto.randomUUID(),
    component_id: null,
    pricing_unit: "one_time",
    vat_rate: 21,
    price_includes_vat: true,
    requires_large_bus: false,
    requires_consultation: false,
    metadata: {},
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function assert(name: string, actual: number, expected: number): void {
  const ok = Math.abs(actual - expected) < 0.01;
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}: expected ${expected}, got ${actual}`); }
}

console.log("\n=== Pricing Engine Tests ===\n");

// Test 1: Three tables at €95 = €285, not €855
{
  const tables = makeSel({ step_key: "tables", title: "Volledig gestylde kindertafels", unit_price: 95, quantity: 3, pricing_unit: "per_table" });
  assert("3 tafels × €95 = €285 (niet €855)", lineTotal(tables), 285);
}

// Test 2: Twenty children with €4,50 favour = €90
{
  const favour = makeSel({ step_key: "favours", title: "Stoeldecoratie", unit_price: 4.5, quantity: 20, pricing_unit: "per_child" });
  assert("20 kinderen × €4,50 = €90", lineTotal(favour), 90);
}

// Test 3: Twelve participating children at €12,50 entertainment = €150
{
  const ent = makeSel({ step_key: "entertainment", title: "Slijm maken", unit_price: 12.5, quantity: 12, pricing_unit: "per_participating_child" });
  assert("12 deelnemers × €12,50 = €150", lineTotal(ent), 150);
}

// Test 4: One large item adds one €350 bus surcharge
{
  const sels = [makeSel({ step_key: "play", title: "Softplay", unit_price: 165, quantity: 1, requires_large_bus: true })];
  const bd = calculateTotals(sels);
  assert("1 large item → bus surcharge €350", bd.bus_surcharge, 350);
  assert("1 large item → total = 165 + 350 = 515", bd.total_gross, 515);
}

// Test 5: Three large items still add only one €350 surcharge
{
  const sels = [
    makeSel({ step_key: "play", title: "Softplay", unit_price: 165, quantity: 1, requires_large_bus: true }),
    makeSel({ step_key: "play", title: "Ballenbak", unit_price: 195, quantity: 1, requires_large_bus: true }),
    makeSel({ step_key: "play", title: "Springkussen", unit_price: 145, quantity: 1, requires_large_bus: true }),
  ];
  const bd = calculateTotals(sels);
  assert("3 large items → bus surcharge still €350", bd.bus_surcharge, 350);
  assert("3 large items → total = 505 + 350 = 855", bd.total_gross, 855);
}

// Test 6: Removing all large items removes the surcharge
{
  const sels = [makeSel({ step_key: "backdrop", title: "Small backdrop", unit_price: 125, quantity: 1 })];
  const bd = calculateTotals(sels);
  assert("No large items → no bus surcharge", bd.bus_surcharge, 0);
  assert("No large items → total = 125", bd.total_gross, 125);
}

// Test 7: Delivery €45 is not charged again in Step 14
{
  const sels = [makeSel({ step_key: "service", title: "Bezorging", unit_price: 45, quantity: 1 })];
  const bd = calculateTotals(sels);
  assert("Delivery only once → total = 45", bd.total_gross, 45);
}

// Test 8: Delivery with setup €125 is not combined with delivery €45
{
  const sels = [makeSel({ step_key: "service", title: "Bezorging met op- en afbouw", unit_price: 125, quantity: 1 })];
  const bd = calculateTotals(sels);
  assert("Delivery-setup only → total = 125 (not 170)", bd.total_gross, 125);
}

// Test 9: VAT-inclusive total is not increased by another 21%
{
  const sels = [makeSel({ step_key: "backdrop", title: "Small backdrop", unit_price: 125, quantity: 1 })];
  const bd = calculateTotals(sels);
  assert("VAT-inclusive: total = 125 (not 151.25)", bd.total_gross, 125);
}

// Test 10: Deposit equals 30% of the gross total
{
  const sels = [makeSel({ step_key: "backdrop", title: "Large backdrop", unit_price: 245, quantity: 1 })];
  const bd = calculateTotals(sels);
  assert("Deposit = 30% of 245 = 73.50", bd.deposit_amount, 73.5);
  assert("Remaining = 70% of 245 = 171.50", bd.remaining_amount, 171.5);
}

// Test 11: Table count rounds upward per ten children
{
  assert("0 children → 0 tables", requiredTables(0), 0);
  assert("1 child → 1 table", requiredTables(1), 1);
  assert("10 children → 1 table", requiredTables(10), 1);
  assert("11 children → 2 tables", requiredTables(11), 2);
  assert("20 children → 2 tables", requiredTables(20), 2);
  assert("21 children → 3 tables", requiredTables(21), 3);
  assert("30 children → 3 tables", requiredTables(30), 3);
}

// Test 12: Saved concept total equals checkout total
{
  const sels = [
    makeSel({ step_key: "backdrop", title: "Medium backdrop", unit_price: 175, quantity: 1 }),
    makeSel({ step_key: "tables", title: "Volledig gestylde kindertafels", unit_price: 95, quantity: 2, pricing_unit: "per_table" }),
  ];
  const bd = calculateTotals(sels);
  assert("Concept total = 175 + 190 = 365", bd.total_gross, 365);
}

// Test 13: Mollie server total equals saved concept total
{
  const sels = [
    makeSel({ step_key: "play", title: "Softplay", unit_price: 165, quantity: 1, requires_large_bus: true }),
    makeSel({ step_key: "tables", title: "Volledig gestylde kindertafels", unit_price: 95, quantity: 1, pricing_unit: "per_table" }),
  ];
  const bd = calculateTotals(sels);
  assert("Server total = 165 + 95 + 350 = 610", bd.total_gross, 610);
  assert("Server deposit = 30% of 610 = 183", bd.deposit_amount, 183);
}

// Test 14: Optional skipped steps add €0
{
  const sels: Selection[] = [];
  const bd = calculateTotals(sels);
  assert("Empty selections → total = 0", bd.total_gross, 0);
}

// Test 15: Table extras use correct quantity and pricing unit
{
  const centerpieces = makeSel({ step_key: "tables-per-table", title: "Centerpieces", unit_price: 12.5, quantity: 3, pricing_unit: "per_table" });
  const placemats = makeSel({ step_key: "tables-per-child", title: "Placemats", unit_price: 3.95, quantity: 25, pricing_unit: "per_child" });
  assert("3 tafels × €12,50 centerpieces = €37,50", lineTotal(centerpieces), 37.5);
  assert("25 kinderen × €3,95 placemats = €98,75", lineTotal(placemats), 98.75);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) { (globalThis as { process?: { exit: (code: number) => void } }).process?.exit(1); }
