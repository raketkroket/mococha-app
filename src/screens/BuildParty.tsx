import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useParty, type PartyState } from "../store/party";
import {
  calculateTotals,
  lineTotal,
  requiredTables,
  LARGE_BUS_SURCHARGE,
  formatCalc,
  type Selection,
  type PricingUnit,
} from "../lib/pricing";
import { fetchComponentsByStep, type PartyComponent } from "../data/components";
import { fetchThemes } from "../data/api";
import type { Theme } from "../types";
import { BusWarning } from "../components/cards";
import { ArrowLeft, CheckIcon, TruckIcon, SparklesIcon, ImageIcon, ShareIcon } from "../components/icons";
import { eur, formatDate } from "../utils/format";
import { haptic } from "../lib/adapters/haptics";
import { useI18n } from "../i18n";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type Party = PartyState;

interface OptionItem {
  key: string;
  title: string;
  desc?: string;
  price: number;
  pricing_unit: PricingUnit;
  bus?: boolean;
  image_url?: string | null;
  component_id?: string;
}

type SelectSingleFn = (stepKey: string, item: OptionItem, quantity?: number) => void;
type ToggleMultiFn = (stepKey: string, item: OptionItem, quantity?: number) => void;
type UpdateQuantityFn = (stepKey: string, title: string, quantity: number) => void;

// ────────────────────────────────────────────────────────────
// Steps
// ────────────────────────────────────────────────────────────

const STEPS = [
  { key: "event-type", titleKey: "step.event_type" },
  { key: "event-date", titleKey: "step.event_date" },
  { key: "event-location", titleKey: "step.event_location" },
  { key: "event-guests", titleKey: "step.event_guests" },
  { key: "theme", titleKey: "step.theme" },
  { key: "service", titleKey: "step.service" },
  { key: "backdrop", titleKey: "step.backdrop" },
  { key: "play", titleKey: "step.play" },
  { key: "tables", titleKey: "step.tables" },
  { key: "favours", titleKey: "step.favours" },
  { key: "entertainment", titleKey: "step.entertainment" },
  { key: "decoration", titleKey: "step.decoration" },
  { key: "entrance", titleKey: "step.entrance" },
  { key: "transport", titleKey: "step.transport" },
  { key: "review", titleKey: "step.review" },
] as const;

// ────────────────────────────────────────────────────────────
// Hardcoded fallback data (used when DB is unavailable)
// ────────────────────────────────────────────────────────────

const PT = [
  "Kinderverjaardag", "Eerste verjaardag", "Babyshower", "Gender reveal",
  "Sweet sixteen", "Verjaardag volwassenen", "Bruiloft", "Verloving",
  "Bedrijfsfeest", "Themafeest", "Anders / volledig op maat",
];

const SV: OptionItem[] = [
  { key: "delivery", title: "Bezorging", desc: "Wij bezorgen de producten bij jou.", price: 45, pricing_unit: "one_time" },
  { key: "delivery-setup", title: "Bezorging met op- en afbouw", desc: "Wij bezorgen, bouwen op en breken af.", price: 125, pricing_unit: "one_time" },
];

const BD: OptionItem[] = [
  { key: "small", title: "Small backdrop", price: 125, pricing_unit: "one_time" },
  { key: "medium", title: "Medium backdrop", price: 175, pricing_unit: "one_time" },
  { key: "large", title: "Large backdrop", price: 245, pricing_unit: "one_time" },
  { key: "xl", title: "Extra Large backdrop", price: 345, pricing_unit: "one_time" },
  { key: "xxl", title: "XXL backdrop setting", price: 445, pricing_unit: "one_time" },
  { key: "platinum", title: "MOCOCHA Platinum", price: 525, pricing_unit: "one_time" },
];

const BDA: OptionItem[] = [
  { key: "plexi", title: "Plexiglas naam", price: 45, pricing_unit: "one_time" },
  { key: "podium", title: "Podium", price: 65, pricing_unit: "one_time" },
  { key: "cutouts", title: "Cutouts", price: 35, pricing_unit: "one_time" },
  { key: "fresh-flower-pack", title: "Verse bloemen pakket", price: 95, pricing_unit: "one_time" },
  { key: "artificial-flower-pack", title: "Kunstbloemen pakket", price: 65, pricing_unit: "one_time" },
  { key: "floor-200", title: "Gepersonaliseerde vloerprint 200 × 200 cm", price: 120, pricing_unit: "one_time" },
  { key: "floor-300", title: "Gepersonaliseerde vloerprint 300 × 300 cm", price: 150, pricing_unit: "one_time" },
  { key: "floor-600", title: "Gepersonaliseerde vloerprint 600 × 300 cm", price: 200, pricing_unit: "one_time" },
];

const PL: OptionItem[] = [
  { key: "softplay", title: "Softplay", price: 165, pricing_unit: "one_time", bus: true },
  { key: "ballenbak", title: "Ballenbak", price: 195, pricing_unit: "one_time", bus: true },
  { key: "springkussen", title: "Springkussen", price: 145, pricing_unit: "one_time", bus: true },
  { key: "sb", title: "Softplay met ballenbak", price: 295, pricing_unit: "one_time", bus: true },
  { key: "ss", title: "Softplay met springkussen", price: 265, pricing_unit: "one_time", bus: true },
  { key: "pg", title: "Complete playground", price: 395, pricing_unit: "one_time", bus: true },
  { key: "bc", title: "Bumper cars", price: 450, pricing_unit: "one_time", bus: true },
];

const TB: OptionItem[] = [
  { key: "only", title: "Tafels en stoelen", price: 22.5, pricing_unit: "per_table" },
  { key: "basic", title: "Basic styling", price: 45, pricing_unit: "per_table" },
  { key: "full", title: "Volledig gestylde kindertafels", price: 95, pricing_unit: "per_table" },
  { key: "cloth", title: "Tafelkleden", price: 12.5, pricing_unit: "per_table" },
  { key: "balloons", title: "Ballonnen op de kindertafel", price: 35, pricing_unit: "per_table" },
];

const TBX_PT: OptionItem[] = [
  { key: "centerpieces", title: "Centerpieces", price: 12.5, pricing_unit: "per_table" },
  { key: "table-flowers", title: "Tafelbloemen", price: 18.5, pricing_unit: "per_table" },
  { key: "theme-props", title: "Thema props", price: 15, pricing_unit: "per_table" },
];

const TBX_PC: OptionItem[] = [
  { key: "placemats", title: "Placemats", price: 3.95, pricing_unit: "per_child" },
  { key: "cups", title: "Bekers", price: 2.5, pricing_unit: "per_child" },
  { key: "plates", title: "Borden", price: 2.95, pricing_unit: "per_child" },
  { key: "napkins", title: "Servetten", price: 1.95, pricing_unit: "per_child" },
  { key: "chair-deco", title: "Stoeldecoratie", price: 4.5, pricing_unit: "per_child" },
];

const FV: OptionItem[] = [
  { key: "none", title: "Zonder bedankjes", price: 0, pricing_unit: "per_child" },
  { key: "empty-box", title: "Bedankdoosje leeg", price: 3.75, pricing_unit: "per_child" },
  { key: "sweet-box", title: "Bedankdoosje met snoep", price: 4.5, pricing_unit: "per_child" },
  { key: "bucket", title: "Emmertje met keuze-inhoud", price: 16.5, pricing_unit: "per_child" },
];

const FVC: OptionItem[] = [
  { key: "chalk", title: "Krijt", price: 0, pricing_unit: "per_child" },
  { key: "candy", title: "Snoep", price: 0, pricing_unit: "per_child" },
  { key: "chips", title: "Chips", price: 0, pricing_unit: "per_child" },
  { key: "slime", title: "Slijm", price: 0, pricing_unit: "per_child" },
];

const EN: OptionItem[] = [
  { key: "slijm", title: "Slijm maken", price: 12.5, pricing_unit: "per_participating_child" },
  { key: "tattoos", title: "Glittertattoos", price: 7.5, pricing_unit: "per_participating_child" },
  { key: "cupcake", title: "Cupcake versieren", price: 14.95, pricing_unit: "per_participating_child" },
  { key: "donuts", title: "Donuts versieren", price: 14.95, pricing_unit: "per_participating_child" },
  { key: "aardbeien", title: "Aardbeien versieren", price: 12.95, pricing_unit: "per_participating_child" },
  { key: "armbandjes", title: "Armbandjes maken", price: 9.95, pricing_unit: "per_participating_child" },
  { key: "schilderen", title: "Schilderen in thema", price: 11.95, pricing_unit: "per_participating_child" },
  { key: "cakebar", title: "Cake bar", price: 16.5, pricing_unit: "per_participating_child" },
  { key: "workshop", title: "Creatieve workshop", price: 13.5, pricing_unit: "per_participating_child" },
];

const DC_BALLOONS: OptionItem[] = [
  { key: "bal-small", title: "Kleine ballonnenboog", price: 200, pricing_unit: "one_time" },
  { key: "bal-medium", title: "Medium ballonnenboog", price: 275, pricing_unit: "one_time" },
  { key: "bal-large", title: "Large ballonnenboog", price: 350, pricing_unit: "one_time" },
  { key: "bal-xl", title: "Extra large ballonnenboog", price: 425, pricing_unit: "one_time" },
  { key: "bal-xxl", title: "XXL ballonnenboog", price: 525, pricing_unit: "one_time" },
];

const DC_FLOWERS: OptionItem[] = [
  { key: "fresh-flowers", title: "Verse bloemen", price: 95, pricing_unit: "one_time" },
  { key: "artificial-flowers", title: "Kunstbloemen", price: 65, pricing_unit: "one_time" },
];

const DC_OTHER: OptionItem[] = [
  { key: "zuilen", title: "Zuilen", price: 45, pricing_unit: "one_time" },
  { key: "podiums", title: "Podiums", price: 65, pricing_unit: "one_time" },
  { key: "neon", title: "Neon signs", price: 89, pricing_unit: "one_time" },
  { key: "licht", title: "Lichtcijfers", price: 35, pricing_unit: "one_time" },
  { key: "letters", title: "XL letters", price: 55, pricing_unit: "one_time" },
  { key: "letters-plexi", title: "XL houten letters met plexi", price: 75, pricing_unit: "one_time" },
  { key: "letters-no-plexi", title: "XL houten letters zonder plexi", price: 55, pricing_unit: "one_time" },
  { key: "baby-blocks", title: "Baby blokken", price: 45, pricing_unit: "one_time" },
  { key: "dieren", title: "Dieren", price: 49, pricing_unit: "one_time" },
  { key: "draping", title: "Drapering", price: 75, pricing_unit: "one_time" },
  { key: "shimmer", title: "Shimmer wall", price: 125, pricing_unit: "one_time" },
  { key: "dessert", title: "Dessert tafel styling", price: 95, pricing_unit: "one_time" },
];

const ET_BOARD: OptionItem[] = [
  { key: "plexi", title: "Welkomstbord plexiglas", price: 49, pricing_unit: "one_time" },
  { key: "printed", title: "Welkomstbord geprint", price: 39, pricing_unit: "one_time" },
  { key: "foam", title: "Welkomstbord foam", price: 35, pricing_unit: "one_time" },
];

const ET_ARCH: OptionItem[] = [
  { key: "single-small", title: "Losse ballonnenboog small", price: 200, pricing_unit: "one_time" },
  { key: "single-medium", title: "Losse ballonnenboog medium", price: 275, pricing_unit: "one_time" },
  { key: "single-large", title: "Losse ballonnenboog large", price: 350, pricing_unit: "one_time" },
  { key: "tunnel-3", title: "Ballonnen tunnel — 3 bogen", price: 550, pricing_unit: "one_time" },
  { key: "tunnel-4", title: "Ballonnen tunnel — 4 bogen", price: 750, pricing_unit: "one_time" },
  { key: "tunnel-5", title: "Ballonnen tunnel — 5 bogen", price: 950, pricing_unit: "one_time" },
];

const ET_CUTOUTS: OptionItem[] = [
  { key: "cutouts", title: "Cutouts", price: 35, pricing_unit: "one_time" },
];

const ET_FLOOR: OptionItem[] = [
  { key: "floor-3m", title: "Gepersonaliseerde vloer — 3 meter", price: 120, pricing_unit: "one_time" },
  { key: "floor-4m", title: "Gepersonaliseerde vloer — 4 meter", price: 150, pricing_unit: "one_time" },
  { key: "floor-5m", title: "Gepersonaliseerde vloer — 5 meter", price: 200, pricing_unit: "one_time" },
];

// Mapping of review line-item groups to step indices
const STEP_KEY_GROUPS: { index: number; keys: string[] }[] = [
  { index: 5, keys: ["service"] },
  { index: 6, keys: ["backdrop", "backdrop-addon"] },
  { index: 7, keys: ["play"] },
  { index: 8, keys: ["tables", "tables-extra-per-table", "tables-extra-per-child"] },
  { index: 9, keys: ["favours", "favour-content"] },
  { index: 10, keys: ["entertainment"] },
  { index: 11, keys: ["decoration-balloons", "decoration-flowers", "decoration-other"] },
  { index: 12, keys: ["entrance-board", "entrance-arch", "entrance-cutouts", "entrance-floor"] },
];

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function makeSelection(stepKey: string, item: OptionItem, quantity: number): Selection {
  return {
    id: crypto.randomUUID(),
    step_key: stepKey,
    component_id: item.component_id ?? null,
    title: item.title,
    unit_price: item.price, // NEVER pre-multiply
    quantity,
    pricing_unit: item.pricing_unit,
    vat_rate: 21,
    price_includes_vat: true,
    requires_large_bus: item.bus ?? false,
    requires_consultation: false,
    metadata: { key: item.key },
  };
}

function componentToOption(c: PartyComponent): OptionItem {
  return {
    key: c.key,
    title: c.name,
    desc: c.description ?? undefined,
    price: c.base_price,
    pricing_unit: c.pricing_unit,
    bus: c.requires_large_bus,
    image_url: c.image_url,
    component_id: c.id,
  };
}

type TFn = (key: string, params?: Record<string, string | number>) => string;

function priceLabel(item: OptionItem, t: TFn): string {
  if (item.price === 0) return t("detail.incl");
  const price = eur(item.price);
  switch (item.pricing_unit) {
    case "per_table": return `${price} ${t("price.per_table")}`;
    case "per_child": return `${price} ${t("price.per_child")}`;
    case "per_participating_child": return `${price} ${t("price.per_participating_child")}`;
    case "per_item": return `${price} ${t("price.per_item")}`;
    case "per_meter": return `${price} ${t("price.per_meter")}`;
    default: return price;
  }
}

// Hook: loads components from DB, falls back to hardcoded data
function useStepComponents(stepKey: string, fallback: OptionItem[]) {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<OptionItem[]>(fallback);
  const [hasDb, setHasDb] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchComponentsByStep(stepKey)
      .then((data) => {
        if (!active) return;
        if (data && data.length > 0) {
          setOptions(data.map(componentToOption));
          setHasDb(true);
        } else {
          setOptions(fallback);
          setHasDb(false);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setOptions(fallback);
        setHasDb(false);
        setLoading(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  return { options, loading, hasDb };
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────

export default function BuildParty() {
  const party = useParty();
  const navigate = useNavigate();
  const { t } = useI18n();
  const step = party.currentStep;
  const [themes, setThemes] = useState<Theme[]>([]);
  const [busWarning, setBusWarning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stepDir, setStepDir] = useState<"forward" | "backward">("forward");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showEditOverview, setShowEditOverview] = useState(Boolean(party.activeConceptId));

  useEffect(() => { fetchThemes().then(setThemes).catch(() => {}); }, []);

  const breakdown = party.breakdown();
  const hasPaidSelections = breakdown.total_gross > 0;
  const progress = ((step + 1) / STEPS.length) * 100;

  const selectSingle: SelectSingleFn = (stepKey, item, quantity = 1) => {
    party.clearStep(stepKey);
    party.addSelection(makeSelection(stepKey, item, quantity));
    if (item.bus && !party.hasLargeBus()) { setBusWarning(true); haptic("heavy"); }
    haptic();
  };

  const toggleMulti: ToggleMultiFn = (stepKey, item, quantity = 1) => {
    const existing = party.selections.find((s) => s.step_key === stepKey && s.title === item.title);
    if (existing) {
      party.removeSelection(stepKey, item.title);
    } else {
      party.addSelection(makeSelection(stepKey, item, quantity));
      if (item.bus) { setBusWarning(true); haptic("heavy"); }
    }
    haptic();
  };

  const updateQuantity: UpdateQuantityFn = (stepKey, title, quantity) => {
    const sel = party.selections.find((s) => s.step_key === stepKey && s.title === title);
    if (sel) {
      party.addSelection({ ...sel, quantity: Math.max(0, quantity) });
      haptic();
    }
  };

  const next = () => { party.setStep(Math.min(step + 1, STEPS.length - 1)); setStepDir("forward"); window.scrollTo({ top: 0, behavior: "smooth" }); haptic("selection"); };
  const back = () => { party.setStep(Math.max(step - 1, 0)); setStepDir("backward"); window.scrollTo({ top: 0, behavior: "smooth" }); haptic("light"); };
  const skip = () => { party.setStep(Math.min(step + 1, STEPS.length - 1)); setStepDir("forward"); window.scrollTo({ top: 0, behavior: "smooth" }); haptic("light"); };

  const saveDraft = () => {
    setSaveState("saving");
    const name = party.event.type || t("concepts.title");
    if (party.activeConceptId) {
      party.updateConcept(party.activeConceptId);
    } else {
      party.saveConcept(name);
    }
    setSaveState("saved");
    setSaved(true);
    haptic("success");
    setTimeout(() => { setSaved(false); setSaveState("idle"); }, 1800);
  };

  // Validation: theme step requires at least one theme option
  const themeValid = !!(
    party.theme &&
    (party.theme.theme || party.theme.custom_theme || party.theme.design_by_mococha)
  );

  // Validation: date step requires end > start
  const ev = party.event;
  const timeInvalid = !!(ev.start_time && ev.end_time && ev.end_time <= ev.start_time);
  const canProceed = !((step === 4 && !themeValid) || (step === 1 && timeInvalid));

  const showSkip = step >= 5 && step <= 12;
  const selectedForStep = (stepIndex: number) => {
    const group = STEP_KEY_GROUPS.find((item) => item.index === stepIndex);
    return group ? party.selections.filter((selection) => group.keys.includes(selection.step_key)) : [];
  };
  const stepSummary = (stepIndex: number) => {
    if (stepIndex === 0) return party.event.type;
    if (stepIndex === 1) return party.event.date;
    if (stepIndex === 2) return [party.event.address, party.event.city].filter(Boolean).join(", ");
    if (stepIndex === 3) return party.event.num_children > 0 ? `${party.event.num_children} ${t("build.children")}` : "";
    if (stepIndex === 4) return party.theme?.theme || party.theme?.custom_theme || (party.theme?.design_by_mococha ? "MOCOCHA" : "");
    if (stepIndex === 13) return party.event.address || party.selections.find((selection) => selection.step_key === "service")?.title || "";
    if (stepIndex === 14) return hasPaidSelections ? eur(breakdown.total_gross) : "";
    const selections = selectedForStep(stepIndex);
    return selections.map((selection) => selection.title).join(", ");
  };
  const editStep = (stepIndex: number) => {
    party.setStep(stepIndex);
    setStepDir(stepIndex < step ? "backward" : "forward");
    setShowEditOverview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    haptic("selection");
  };

  return (
    <div>
      <div className="rb mb8">
        <h1 className="screen-title">{t("build.title")}</h1>
        <button className="hbtn" onClick={saveDraft} aria-label={t("build.save")}><CheckIcon size={20} /></button>
      </div>
      <div className="build-edit-toggle mb16">
        <div>
          <strong>{party.activeConceptId ? t("build.editing_concept") : t("build.edit_overview")}</strong>
          <span>{party.activeConceptId ? t("build.editing_concept_desc") : t("build.edit_overview_desc")}</span>
        </div>
        <button className="btn bo" onClick={() => setShowEditOverview((visible) => !visible)}>
          {showEditOverview ? t("build.hide_overview") : t("build.edit_overview")}
        </button>
      </div>
      {showEditOverview && (
        <section className="build-edit-overview" aria-label={t("build.edit_overview")}>
          {STEPS.map((item, index) => {
            const summary = stepSummary(index);
            const isComplete = Boolean(summary);
            return (
              <button key={item.key} className={`build-edit-item ${isComplete ? "complete" : ""} ${index === step ? "current" : ""}`} onClick={() => editStep(index)}>
                <span className="build-edit-number">{index + 1}</span>
                <span className="build-edit-copy">
                  <strong>{t(item.titleKey)}</strong>
                  <small>{summary || t("build.not_started")}</small>
                </span>
                <span className="build-edit-action">{isComplete ? t("build.change") : t("build.start_step")}</span>
              </button>
            );
          })}
        </section>
      )}
      <div className="pbar mb8"><div className="pfill" style={{ width: `${progress}%` }} /></div>
      <div className="rb mb16">
        <span className="muted" style={{ fontSize: "0.78rem", letterSpacing: "0.04em" }}>{t("build.step", { current: step + 1, total: STEPS.length, name: t(STEPS[step].titleKey) })}</span>
        {hasPaidSelections && <span className="tbrown" style={{ fontWeight: 600, fontSize: "0.88rem" }}>{eur(breakdown.total_gross)}</span>}
      </div>
      <h2 className="screen-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s5)", lineHeight: 1.25 }}>{t(STEPS[step].titleKey)}</h2>

      {busWarning && party.hasLargeBus() && <div className="mb16"><BusWarning compact /></div>}

      <div className={`cstep ${stepDir === "forward" ? "step-forward" : "step-backward"}`} key={step}>
        {step === 0 && <EventTypeStep party={party} />}
        {step === 1 && <EventDateStep party={party} timeInvalid={timeInvalid} />}
        {step === 2 && <EventLocationStep party={party} />}
        {step === 3 && <EventGuestsStep party={party} />}
        {step === 4 && <ThemeStep themes={themes} party={party} />}
        {step === 5 && <ServiceStep party={party} selectSingle={selectSingle} />}
        {step === 6 && <BackdropStep party={party} selectSingle={selectSingle} toggleMulti={toggleMulti} />}
        {step === 7 && <PlayStep party={party} toggleMulti={toggleMulti} />}
        {step === 8 && <TablesStep party={party} selectSingle={selectSingle} toggleMulti={toggleMulti} />}
        {step === 9 && <FavoursStep party={party} selectSingle={selectSingle} toggleMulti={toggleMulti} />}
        {step === 10 && <EntertainmentStep party={party} toggleMulti={toggleMulti} updateQuantity={updateQuantity} />}
        {step === 11 && <DecorationStep party={party} toggleMulti={toggleMulti} />}
        {step === 12 && <EntranceStep party={party} selectSingle={selectSingle} toggleMulti={toggleMulti} />}
        {step === 13 && <TransportStep party={party} />}
        {step === 14 && <ReviewStep party={party} saveDraft={saveDraft} navigate={navigate} />}
      </div>

      {saved && (
        <div className="save-toast" role="status" aria-live="polite">
          <CheckIcon size={16} /> {saveState === "saving" ? t("build.saving") : t("build.saved")}
        </div>
      )}

      {step < STEPS.length - 1 && (
        <div className="sticky-action">
          {step > 0 && <button className="sticky-action-back" onClick={back}><ArrowLeft size={16} /> {t("build.back")}</button>}
          {showSkip && <button className="sticky-action-back" onClick={skip}>{t("build.skip")}</button>}
          {hasPaidSelections && <span className="sticky-action-price">{eur(breakdown.total_gross)}</span>}
          <button className="btn bp" onClick={next} disabled={!canProceed}>{t("build.next")}</button>
        </div>
      )}
      {step === STEPS.length - 1 && (
        <div className="sticky-action">
          <button className="sticky-action-back" onClick={back}><ArrowLeft size={16} /> {t("build.back")}</button>
          <button className="bg-link" style={{ marginLeft: "auto", marginRight: "var(--s3)" }} onClick={() => navigate("/concepten")}>{t("build.concepts")}</button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Shared UI components
// ────────────────────────────────────────────────────────────

function OL({
  options,
  selected,
  onSelect,
  showImages,
  t,
}: {
  options: OptionItem[];
  selected: string[];
  onSelect: (title: string) => void;
  showImages?: boolean;
  t: TFn;
}) {
  return (
    <div>
      {options.map((o) => {
        const s = selected.includes(o.title);
        return (
          <button key={o.key} className={`ocard ${s ? "sel" : ""}`} onClick={() => onSelect(o.title)}>
            {showImages && (
              o.image_url ? (
                <img src={o.image_url} alt={o.title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--warm-white, #f5f0eb)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--taupe, #b8a99a)" }}>
                  <ImageIcon size={20} />
                </div>
              )
            )}
            <div className="orad" />
            <div className="f1">
              <div className="otitle">{o.title}</div>
              {o.desc && <div className="odesc">{o.desc}</div>}
              {o.bus && <div className="odesc" style={{ color: "var(--warning)" }}><TruckIcon size={11} /> Large transport</div>}
            </div>
            <div className="oprice">{priceLabel(o, t)}</div>
          </button>
        );
      })}
    </div>
  );
}

function SW({ title, children }: { title: string; children: ReactNode }) {
  return <><h2 className="section-title mb16">{title}</h2>{children}</>;
}

function CalcLine({ sel }: { sel: Selection }) {
  if (sel.unit_price === 0) return null;
  return <div className="muted" style={{ fontSize: "0.76rem", padding: "2px 0" }}>{formatCalc(sel)}</div>;
}

// ────────────────────────────────────────────────────────────
// Step 1 — Event type
// ────────────────────────────────────────────────────────────

function EventTypeStep({ party }: { party: Party }) {
  const event = party.event;
  const { t } = useI18n();
  return (
    <SW title={t("build.what_party")}>
      <div className="event-tiles">
        {PT.map((type) => (
          <button
            key={type}
            className={event.type === type ? "event-tile selected" : "event-tile"}
            onClick={() => { party.setEvent({ type }); haptic(); }}
          >
            <span>{type}</span>
            <span className="event-check">{event.type === type ? "✓" : ""}</span>
          </button>
        ))}
      </div>
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 2 — Date & time (native date picker)
// ────────────────────────────────────────────────────────────

function EventDateStep({ party, timeInvalid }: { party: Party; timeInvalid: boolean }) {
  const event = party.event;
  const { t } = useI18n();
  return (
    <SW title={t("build.when_party")}>
      <div className="field">
        <label>{t("build.party_date")}</label>
        <input
          type="date"
          className="in"
          value={event.date}
          onChange={(e) => party.setEvent({ date: e.target.value })}
        />
      </div>
      <div className="row g8">
        <div className="field f1">
          <label>{t("build.start_time")}</label>
          <input type="time" className="in" value={event.start_time} onChange={(e) => party.setEvent({ start_time: e.target.value })} />
        </div>
        <div className="field f1">
          <label>{t("build.end_time")}</label>
          <input type="time" className="in" value={event.end_time} onChange={(e) => party.setEvent({ end_time: e.target.value })} />
        </div>
      </div>
      {timeInvalid && (
        <p className="muted" style={{ fontSize: "0.8rem", color: "var(--warning)" }}>
          {t("build.time_invalid")}
        </p>
      )}
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 3 — Location
// ────────────────────────────────────────────────────────────

function EventLocationStep({ party }: { party: Party }) {
  const event = party.event;
  const { t } = useI18n();
  return (
    <SW title={t("build.where_party")}>
      <div className="field">
        <label>{t("build.address")}</label>
        <input className="in" placeholder={t("build.address_ph")} value={event.address} onChange={(e) => party.setEvent({ address: e.target.value })} />
      </div>
      <div className="row g8">
        <div className="field f1">
          <label>{t("build.postal_code")}</label>
          <input className="in" placeholder={t("build.postal_code_ph")} value={event.postal_code} onChange={(e) => party.setEvent({ postal_code: e.target.value })} />
        </div>
        <div className="field f1">
          <label>{t("build.city")}</label>
          <input className="in" value={event.city} onChange={(e) => party.setEvent({ city: e.target.value })} />
        </div>
      </div>
      <div className="row g8">
        <button className={event.indoor && !event.indoor_outdoor ? "chip active" : "chip"} onClick={() => party.setEvent({ indoor: true, outdoor: false, indoor_outdoor: false })}>{t("build.indoor")}</button>
        <button className={!event.indoor && event.outdoor && !event.indoor_outdoor ? "chip active" : "chip"} onClick={() => party.setEvent({ indoor: false, outdoor: true, indoor_outdoor: false })}>{t("build.outdoor")}</button>
        <button className={event.indoor_outdoor ? "chip active" : "chip"} onClick={() => party.setEvent({ indoor: true, outdoor: true, indoor_outdoor: true })}>{t("build.both")}</button>
      </div>
      <div className="row g8">
        <div className="field f1">
          <label>{t("build.floor")}</label>
          <input className="in" placeholder={t("build.floor_ph")} value={event.floor} onChange={(e) => party.setEvent({ floor: e.target.value })} />
        </div>
        <div className="field f1">
          <label>{t("build.parking")}</label>
          <input className="in" placeholder={t("build.parking_ph")} value={event.parking} onChange={(e) => party.setEvent({ parking: e.target.value })} />
        </div>
      </div>
      <div className="row g8">
        <div className="field f1">
          <label>{t("build.elevator")}</label>
          <div className="row g8">
            <button className={event.has_elevator ? "chip active" : "chip"} onClick={() => party.setEvent({ has_elevator: true })}>{t("build.yes")}</button>
            <button className={!event.has_elevator ? "chip active" : "chip"} onClick={() => party.setEvent({ has_elevator: false })}>{t("build.no")}</button>
          </div>
        </div>
        <div className="field f1">
          <label>{t("build.setup_time")}</label>
          <input className="in" placeholder={t("build.setup_time_ph")} value={event.setup_time} onChange={(e) => party.setEvent({ setup_time: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>{t("build.location_notes")}</label>
        <textarea className="ta" placeholder={t("build.location_notes_ph")} value={event.location_notes} onChange={(e) => party.setEvent({ location_notes: e.target.value })} />
      </div>
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 4 — Guests (defaults to 0)
// ────────────────────────────────────────────────────────────

function EventGuestsStep({ party }: { party: Party }) {
  const event = party.event;
  const { t } = useI18n();
  const ageCategories = ["0-2 yr", "3-5 yr", "6-8 yr", "9-12 yr", "13+ yr", "Mixed"];
  return (
    <SW title={t("build.how_many_guests")}>
      <div className="row g8">
        <div className="field f1">
          <label>{t("build.num_children")}</label>
          <input type="number" min={0} className="in" value={event.num_children} onChange={(e) => party.setEvent({ num_children: Math.max(0, +e.target.value) })} />
        </div>
        <div className="field f1">
          <label>{t("build.num_adults")}</label>
          <input type="number" min={0} className="in" value={event.num_adults} onChange={(e) => party.setEvent({ num_adults: Math.max(0, +e.target.value) })} />
        </div>
      </div>
      <div className="field">
        <label>{t("build.age_category")}</label>
        <div className="row g8" style={{ flexWrap: "wrap" }}>
          {ageCategories.map((cat) => (
            <button key={cat} className={event.age_category === cat ? "chip active" : "chip"} onClick={() => party.setEvent({ age_category: cat })}>{cat}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>{t("build.budget")}</label>
        <input className="in" placeholder={t("build.budget_ph")} value={event.budget} onChange={(e) => party.setEvent({ budget: e.target.value })} />
      </div>
      <div className="field">
        <label>{t("build.notes")}</label>
        <textarea className="ta" value={event.notes} onChange={(e) => party.setEvent({ notes: e.target.value })} />
      </div>
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 5 — Theme (requires DB theme, custom theme, or design-by-MOCOCHA)
// ────────────────────────────────────────────────────────────

function ThemeStep({ themes, party }: { themes: Theme[]; party: Party }) {
  type ThemeState = NonNullable<Party["theme"]>;
  const { t } = useI18n();
  const [th, setTh] = useState<ThemeState>(
    party.theme ?? { theme: "", custom_theme: "", colors: [], inspiration_links: [], design_by_mococha: false }
  );

  const save = (p: Partial<ThemeState>) => {
    const n = { ...th, ...p };
    setTh(n);
    party.setTheme(n);
  };

  const selectDbTheme = (t: Theme) => {
    save({ theme: t.title, custom_theme: "", design_by_mococha: false, colors: (t.colors ?? "").split(",").filter(Boolean) });
    haptic();
  };

  return (
    <SW title={t("build.theme_title")}>
      <div className="cgrid mb16">
        {themes.map((t) => (
          <button
            key={t.id}
            className="ccard"
            style={{ outline: th.theme === t.title ? "1.5px solid var(--chocolate)" : "none", outlineOffset: 2 }}
            onClick={() => selectDbTheme(t)}
          >
            <img className="ccimg" src={t.image_url ?? ""} alt={t.title} />
            <div className="ccov"><span className="cctitle" style={{ fontSize: "0.85rem" }}>{t.title}</span></div>
          </button>
        ))}
      </div>

      <div className="field">
        <label>{t("build.custom_theme")}</label>
        <input
          className="in"
          placeholder={t("build.custom_theme_ph")}
          value={th.custom_theme}
          onChange={(e) => save({ custom_theme: e.target.value, theme: "", design_by_mococha: false })}
        />
      </div>

      <div className="field">
        <label>{t("build.or_let_mococha")}</label>
        <button
          className={th.design_by_mococha ? "chip active" : "chip"}
          onClick={() => { save({ design_by_mococha: !th.design_by_mococha, theme: "", custom_theme: "" }); haptic(); }}
        >
          <SparklesIcon size={14} /> {t("build.let_mococha")}
        </button>
        {th.design_by_mococha && (
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 6 }}>
            {t("build.mococha_desc")}
          </p>
        )}
      </div>

      <div className="field">
        <label>{t("build.inspiration_links")}</label>
        <textarea
          className="ta"
          placeholder={t("build.inspiration_links_ph")}
          value={th.inspiration_links.join("\n")}
          onChange={(e) => save({ inspiration_links: e.target.value.split("\n").filter(Boolean) })}
        />
      </div>

      {!th.theme && !th.custom_theme && !th.design_by_mococha && (
        <p className="muted" style={{ fontSize: "0.8rem", color: "var(--warning)" }}>
          {t("build.theme_warning")}
        </p>
      )}
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 6 — Service
// ────────────────────────────────────────────────────────────

function ServiceStep({ party, selectSingle }: { party: Party; selectSingle: SelectSingleFn }) {
  const { options, loading, hasDb } = useStepComponents("service", SV);
  const { t } = useI18n();
  const sel = party.selections.filter((s) => s.step_key === "service").map((s) => s.title);

  return (
    <SW title={t("step.service")}>
      {loading && <div className="muted mb16" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL
        options={options}
        selected={sel}
        showImages={hasDb}
        t={t}
        onSelect={(t2) => { const item = options.find((o) => o.title === t2)!; selectSingle("service", item, 1); }}
      />
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 7 — Backdrop (single main + multi addons)
// ────────────────────────────────────────────────────────────

function BackdropStep({ party, selectSingle, toggleMulti }: { party: Party; selectSingle: SelectSingleFn; toggleMulti: ToggleMultiFn }) {
  const { options: bdOpts, loading: bdLoading, hasDb: bdDb } = useStepComponents("backdrop", BD);
  const { options: bdaOpts, loading: bdaLoading, hasDb: bdaDb } = useStepComponents("backdrop-addon", BDA);
  const { t } = useI18n();
  const sel = party.selections.filter((s) => s.step_key === "backdrop").map((s) => s.title);
  const ad = party.selections.filter((s) => s.step_key === "backdrop-addon").map((s) => s.title);

  return (
    <SW title={t("step.backdrop")}>
      {bdLoading && <div className="muted mb16" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={bdOpts} selected={sel} showImages={bdDb} t={t} onSelect={(t2) => { const item = bdOpts.find((o) => o.title === t2)!; selectSingle("backdrop", item, 1); }} />
      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>Add-ons:</p>
      {bdaLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={bdaOpts} selected={ad} showImages={bdaDb} t={t} onSelect={(t2) => { const item = bdaOpts.find((o) => o.title === t2)!; toggleMulti("backdrop-addon", item, 1); }} />
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 8 — Play items (MULTIPLE, all require large bus)
// ────────────────────────────────────────────────────────────

function PlayStep({ party, toggleMulti }: { party: Party; toggleMulti: ToggleMultiFn }) {
  const { options, loading, hasDb } = useStepComponents("play", PL);
  const { t } = useI18n();
  const sel = party.selections.filter((s) => s.step_key === "play").map((s) => s.title);

  return (
    <SW title={t("step.play")}>
      <p className="muted mb16" style={{ fontSize: "0.82rem" }}>
        {t("build.play_intro")}
      </p>
      {loading && <div className="muted mb16" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={options} selected={sel} showImages={hasDb} t={t} onSelect={(t2) => { const item = options.find((o) => o.title === t2)!; toggleMulti("play", item, 1); }} />
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 9 — Tables (per_table, transparent calc)
// ────────────────────────────────────────────────────────────

function TablesStep({ party, selectSingle, toggleMulti }: { party: Party; selectSingle: SelectSingleFn; toggleMulti: ToggleMultiFn }) {
  const kids = party.event.num_children;
  const tables = requiredTables(kids);
  const { t, lang } = useI18n();
  const { options: mainOpts, loading: mainLoading, hasDb: mainDb } = useStepComponents("tables", TB);
  const { options: ptOpts, loading: ptLoading, hasDb: ptDb } = useStepComponents("tables-extra-per-table", TBX_PT);
  const { options: pcOpts, loading: pcLoading, hasDb: pcDb } = useStepComponents("tables-extra-per-child", TBX_PC);

  const mainSel = party.selections.filter((s) => s.step_key === "tables");
  const ptSel = party.selections.filter((s) => s.step_key === "tables-extra-per-table").map((s) => s.title);
  const pcSel = party.selections.filter((s) => s.step_key === "tables-extra-per-child").map((s) => s.title);
  const tablesWord = tables === 1 ? t("build.tables_word_single") : t("build.tables_word_multi");

  return (
    <SW title={t("step.tables")}>
      <p className="muted mb16" style={{ fontSize: "0.82rem" }}>
        {t("build.tables_intro", { kids, tables, tablesWord })}
      </p>
      {kids === 0 && (
        <p className="muted mb16" style={{ fontSize: "0.8rem", color: "var(--warning)" }}>
          {t("build.fill_children_first")}
        </p>
      )}
      {mainLoading && <div className="muted mb16" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={mainOpts} selected={mainSel.map((s) => s.title)} showImages={mainDb} t={t} onSelect={(t2) => { const item = mainOpts.find((o) => o.title === t2)!; selectSingle("tables", item, tables); }} />
      {mainSel.map((sel) => <CalcLine key={sel.id} sel={sel} />)}

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{lang === "nl" ? "Extra per tafel:" : "Extra per table:"}</p>
      {ptLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={ptOpts} selected={ptSel} showImages={ptDb} t={t} onSelect={(t2) => { const item = ptOpts.find((o) => o.title === t2)!; toggleMulti("tables-extra-per-table", item, tables); }} />
      {party.selections.filter((s) => s.step_key === "tables-extra-per-table").map((sel) => <CalcLine key={sel.id} sel={sel} />)}

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{lang === "nl" ? "Extra per kind:" : "Extra per child:"}</p>
      {pcLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={pcOpts} selected={pcSel} showImages={pcDb} t={t} onSelect={(t2) => { const item = pcOpts.find((o) => o.title === t2)!; toggleMulti("tables-extra-per-child", item, kids); }} />
      {party.selections.filter((s) => s.step_key === "tables-extra-per-child").map((sel) => <CalcLine key={sel.id} sel={sel} />)}
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 10 — Favours (per_child, content choices at €0)
// ────────────────────────────────────────────────────────────

function FavoursStep({ party, selectSingle, toggleMulti }: { party: Party; selectSingle: SelectSingleFn; toggleMulti: ToggleMultiFn }) {
  const kids = party.event.num_children;
  const { t } = useI18n();
  const { options: fvOpts, loading: fvLoading, hasDb: fvDb } = useStepComponents("favours", FV);
  const { options: fvcOpts, loading: fvcLoading, hasDb: fvcDb } = useStepComponents("favour-content", FVC);

  const sel = party.selections.filter((s) => s.step_key === "favours");
  const contents = party.selections.filter((s) => s.step_key === "favour-content").map((s) => s.title);

  return (
    <SW title={t("step.favours")}>
      <p className="muted mb16" style={{ fontSize: "0.82rem" }}>{t("build.qty_children", { kids })}</p>
      {kids === 0 && (
        <p className="muted mb16" style={{ fontSize: "0.8rem", color: "var(--warning)" }}>
          {t("build.fill_children_favours")}
        </p>
      )}
      {fvLoading && <div className="muted mb16" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={fvOpts} selected={sel.map((s) => s.title)} showImages={fvDb} t={t} onSelect={(t2) => { const item = fvOpts.find((o) => o.title === t2)!; selectSingle("favours", item, kids); }} />
      {sel.map((s) => <CalcLine key={s.id} sel={s} />)}

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{t("build.favour_content")}</p>
      {fvcLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={fvcOpts} selected={contents} showImages={fvcDb} t={t} onSelect={(t2) => { const item = fvcOpts.find((o) => o.title === t2)!; toggleMulti("favour-content", item, 1); }} />
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 11 — Entertainment (per_participating_child, multi, editable qty)
// ────────────────────────────────────────────────────────────

function EntertainmentStep({ party, toggleMulti, updateQuantity }: { party: Party; toggleMulti: ToggleMultiFn; updateQuantity: UpdateQuantityFn }) {
  const kids = party.event.num_children;
  const { t } = useI18n();
  const { options, loading, hasDb } = useStepComponents("entertainment", EN);
  const sel = party.selections.filter((s) => s.step_key === "entertainment");
  const selTitles = sel.map((s) => s.title);

  return (
    <SW title={t("step.entertainment")}>
      <p className="muted mb16" style={{ fontSize: "0.82rem" }}>
        {t("build.ent_intro")}
      </p>
      {loading && <div className="muted mb16" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={options} selected={selTitles} showImages={hasDb} t={t} onSelect={(t2) => { const item = options.find((o) => o.title === t2)!; toggleMulti("entertainment", item, kids); }} />

      {sel.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="muted mb8" style={{ fontSize: "0.8rem" }}>{t("build.participants_label")}</p>
          {sel.map((s) => (
            <div key={s.id} className="rb mb8" style={{ fontSize: "0.84rem", alignItems: "center" }}>
              <span className="f1">{s.title}</span>
              <input
                type="number"
                min={0}
                className="in"
                style={{ width: 72, textAlign: "center" }}
                value={s.quantity}
                onChange={(e) => updateQuantity("entertainment", s.title, Math.max(0, +e.target.value))}
              />
              <span className="tbrown" style={{ minWidth: 70, textAlign: "right" }}>{eur(lineTotal(s))}</span>
            </div>
          ))}
        </div>
      )}
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 12 — Decoration (three multi sub-sections)
// ────────────────────────────────────────────────────────────

function DecorationStep({ party, toggleMulti }: { party: Party; toggleMulti: ToggleMultiFn }) {
  const { options: balOpts, loading: balLoading, hasDb: balDb } = useStepComponents("decoration-balloons", DC_BALLOONS);
  const { options: flOpts, loading: flLoading, hasDb: flDb } = useStepComponents("decoration-flowers", DC_FLOWERS);
  const { options: othOpts, loading: othLoading, hasDb: othDb } = useStepComponents("decoration-other", DC_OTHER);
  const { t } = useI18n();

  const balloons = party.selections.filter((s) => s.step_key === "decoration-balloons").map((s) => s.title);
  const flowers = party.selections.filter((s) => s.step_key === "decoration-flowers").map((s) => s.title);
  const other = party.selections.filter((s) => s.step_key === "decoration-other").map((s) => s.title);

  return (
    <SW title={t("step.decoration")}>
      <p className="muted mb8" style={{ fontSize: "0.8rem" }}>{t("build.deco_balloons")}</p>
      {balLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={balOpts} selected={balloons} showImages={balDb} t={t} onSelect={(t2) => { const item = balOpts.find((o) => o.title === t2)!; toggleMulti("decoration-balloons", item, 1); }} />

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{t("build.deco_flowers")}</p>
      {flLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={flOpts} selected={flowers} showImages={flDb} t={t} onSelect={(t2) => { const item = flOpts.find((o) => o.title === t2)!; toggleMulti("decoration-flowers", item, 1); }} />

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{t("build.deco_other")}</p>
      {othLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={othOpts} selected={other} showImages={othDb} t={t} onSelect={(t2) => { const item = othOpts.find((o) => o.title === t2)!; toggleMulti("decoration-other", item, 1); }} />
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 13 — Welcome area (four independent layers)
// ────────────────────────────────────────────────────────────

function EntranceStep({ party, selectSingle, toggleMulti }: { party: Party; selectSingle: SelectSingleFn; toggleMulti: ToggleMultiFn }) {
  const { options: boardOpts, loading: boardLoading, hasDb: boardDb } = useStepComponents("entrance-board", ET_BOARD);
  const { options: archOpts, loading: archLoading, hasDb: archDb } = useStepComponents("entrance-arch", ET_ARCH);
  const { options: cutOpts, loading: cutLoading, hasDb: cutDb } = useStepComponents("entrance-cutouts", ET_CUTOUTS);
  const { options: floorOpts, loading: floorLoading, hasDb: floorDb } = useStepComponents("entrance-floor", ET_FLOOR);
  const { t } = useI18n();

  const boardSel = party.selections.filter((s) => s.step_key === "entrance-board").map((s) => s.title);
  const archSel = party.selections.filter((s) => s.step_key === "entrance-arch").map((s) => s.title);
  const cutSel = party.selections.filter((s) => s.step_key === "entrance-cutouts").map((s) => s.title);
  const floorSel = party.selections.filter((s) => s.step_key === "entrance-floor").map((s) => s.title);

  return (
    <SW title={t("step.entrance")}>
      <p className="muted mb8" style={{ fontSize: "0.8rem" }}>{t("build.welcome_board")}</p>
      {boardLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={boardOpts} selected={boardSel} showImages={boardDb} t={t} onSelect={(t2) => { const item = boardOpts.find((o) => o.title === t2)!; selectSingle("entrance-board", item, 1); }} />

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{t("build.welcome_arch")}</p>
      {archLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={archOpts} selected={archSel} showImages={archDb} t={t} onSelect={(t2) => { const item = archOpts.find((o) => o.title === t2)!; selectSingle("entrance-arch", item, 1); }} />

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{t("build.welcome_cutouts")}</p>
      {cutLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={cutOpts} selected={cutSel} showImages={cutDb} t={t} onSelect={(t2) => { const item = cutOpts.find((o) => o.title === t2)!; toggleMulti("entrance-cutouts", item, 1); }} />

      <p className="muted mt16 mb8" style={{ fontSize: "0.8rem" }}>{t("build.welcome_floor")}</p>
      {floorLoading && <div className="muted mb8" style={{ fontSize: "0.84rem" }}>{t("build.loading_options")}</div>}
      <OL options={floorOpts} selected={floorSel} showImages={floorDb} t={t} onSelect={(t2) => { const item = floorOpts.find((o) => o.title === t2)!; selectSingle("entrance-floor", item, 1); }} />
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 14 — Transport (READ-ONLY)
// ────────────────────────────────────────────────────────────

function TransportStep({ party }: { party: Party }) {
  const event = party.event;
  const service = party.selections.find((s) => s.step_key === "service");
  const hasBus = party.hasLargeBus();
  const { t, lang } = useI18n();
  const bothLabel = lang === "nl" ? "Binnen en buiten" : "Indoor and outdoor";
  const indoorLabel = lang === "nl" ? "Binnen" : "Indoor";
  const outdoorLabel = lang === "nl" ? "Buiten" : "Outdoor";
  const locationType = event.indoor_outdoor ? bothLabel : event.indoor ? indoorLabel : outdoorLabel;

  return (
    <SW title={t("step.transport")}>
      <div style={{ display: "grid", gap: 8, fontSize: "0.84rem" }}>
        <div className="rb"><span className="muted">{t("build.service")}</span><span>{service ? service.title : t("build.not_selected")}</span></div>
        <div className="rb"><span className="muted">{t("build.delivery_address")}</span><span>{event.address || "—"}</span></div>
        <div className="rb"><span className="muted">{t("build.postal_code")}</span><span>{event.postal_code || "—"}</span></div>
        <div className="rb"><span className="muted">{t("build.city")}</span><span>{event.city || "—"}</span></div>
        <div className="rb"><span className="muted">{t("build.indoor_outdoor")}</span><span>{locationType}</span></div>
        <div className="rb"><span className="muted">{t("build.floor")}</span><span>{event.floor || "—"}</span></div>
        <div className="rb"><span className="muted">{t("build.elevator")}</span><span>{event.has_elevator ? t("build.yes") : t("build.no")}</span></div>
        <div className="rb"><span className="muted">{t("build.parking")}</span><span>{event.parking || "—"}</span></div>
        <div className="rb"><span className="muted">{t("build.setup_time")}</span><span>{event.setup_time || "—"}</span></div>
        <div className="rb">
          <span className="muted">{t("build.large_bus")}</span>
          <span>{hasBus ? t("build.bus_yes", { amount: eur(LARGE_BUS_SURCHARGE) }) : t("build.bus_no")}</span>
        </div>
      </div>

      <div className="busw" style={{ marginTop: 16, padding: "10px 12px", fontSize: "0.82rem" }}>
        <CheckIcon size={16} />
        <span>{t("build.costs_added")}</span>
      </div>

      {hasBus && <div className="mt16"><BusWarning compact /></div>}
    </SW>
  );
}

// ────────────────────────────────────────────────────────────
// Step 15 — Review
// ────────────────────────────────────────────────────────────

function ReviewStep({ party, saveDraft, navigate }: { party: Party; saveDraft: () => void; navigate: (path: string) => void }) {
  const breakdown = calculateTotals(party.selections);
  const event = party.event;
  const theme = party.theme;
  const { t, lang } = useI18n();

  const handleConfirm = () => { saveDraft(); navigate("/afrekenen"); };
  const handleDeposit = () => { saveDraft(); navigate("/afrekenen"); };
  const handleQuote = () => {
    if (party.activeConceptId) { party.updateConcept(party.activeConceptId); }
    else { party.saveConcept(t("checkout.quote")); }
    haptic("medium");
  };
  const handleShare = () => { navigator.share?.({ title: "MOCOCHA party", url: window.location.href }); };

  return (
    <SW title={t("step.review")}>
      {/* Event details */}
      <div style={{ marginBottom: 16 }}>
        <div className="rb mb8">
          <span className="section-title">{t("build.party_details")}</span>
          <button className="bg-link" onClick={() => party.setStep(0)}>{t("build.change")}</button>
        </div>
        <div style={{ display: "grid", gap: 4, fontSize: "0.84rem" }}>
          <div className="rb"><span className="muted">{t("build.type")}</span><span>{event.type || "—"}</span></div>
          <div className="rb"><span className="muted">{t("build.date")}</span><span>{event.date ? formatDate(event.date, lang) : "—"}</span></div>
          <div className="rb"><span className="muted">{t("build.time")}</span><span>{event.start_time || "—"}{event.end_time ? ` – ${event.end_time}` : ""}</span></div>
          <div className="rb"><span className="muted">{t("build.location")}</span><span>{event.city || "—"}</span></div>
          <div className="rb"><span className="muted">{t("build.children")}</span><span>{event.num_children}</span></div>
          <div className="rb"><span className="muted">{t("build.adults")}</span><span>{event.num_adults}</span></div>
        </div>
      </div>

      {/* Theme */}
      {theme && (
        <div style={{ marginBottom: 16 }}>
          <div className="rb mb8">
            <span className="section-title">{t("build.theme_title")}</span>
            <button className="bg-link" onClick={() => party.setStep(4)}>{t("build.change")}</button>
          </div>
          <span style={{ fontSize: "0.86rem" }}>{theme.theme || theme.custom_theme || "—"}</span>
          {theme.design_by_mococha && (
            <div className="muted" style={{ fontSize: "0.8rem", color: "var(--chocolate)", marginTop: 4 }}>
              <SparklesIcon size={13} /> {t("detail.mococha_designs")}
            </div>
          )}
        </div>
      )}

      <hr className="div" />

      {/* Line items grouped by step */}
      {STEP_KEY_GROUPS.map(({ index, keys }) => {
        const items = party.selections.filter((s) => keys.includes(s.step_key));
        if (!items.length) return null;
        return (
          <div key={index} style={{ marginBottom: 12 }}>
            <div className="rb mb8">
              <span className="muted" style={{ fontSize: "0.8rem" }}>{t(STEPS[index].titleKey)}</span>
              <button className="bg-link" style={{ fontSize: "0.76rem" }} onClick={() => party.setStep(index)}>{t("build.change")}</button>
            </div>
            {items.map((it) => (
              <div key={it.id} className="rb" style={{ fontSize: "0.84rem", padding: "2px 0" }}>
                <span>{it.title}{it.quantity > 1 ? ` × ${it.quantity}` : ""}</span>
                <span className="tbrown">{it.unit_price === 0 ? t("detail.incl") : eur(lineTotal(it))}</span>
              </div>
            ))}
          </div>
        );
      })}

      <hr className="div" />

      {/* Breakdown */}
      <div style={{ display: "grid", gap: 4, fontSize: "0.84rem" }}>
        <div className="rb"><span className="muted">{t("build.subtotal")}</span><span>{eur(breakdown.subtotal_gross)}</span></div>
        {breakdown.bus_surcharge > 0 && (
          <div className="rb"><span className="muted">{t("detail.bus_hire")}</span><span>{eur(breakdown.bus_surcharge)}</span></div>
        )}
        <div className="rb mb8"><span className="muted">{t("build.total_incl_vat")}</span><span>{eur(breakdown.total_gross)}</span></div>
        <div className="rb"><span className="muted" style={{ fontSize: "0.78rem" }}>{t("build.vat_21")}</span><span className="muted" style={{ fontSize: "0.78rem" }}>{eur(breakdown.vat_portion)}</span></div>
        <div className="rb"><span className="muted">{t("detail.deposit")}</span><span>{eur(breakdown.deposit_amount)}</span></div>
        <div className="rb"><span className="muted">{t("detail.remaining")}</span><span>{eur(breakdown.remaining_amount)}</span></div>
      </div>

      <hr className="div" />

      <div className="rb mb16">
        <span className="section-title">{t("build.total")}</span>
        <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--chocolate)" }}>{eur(breakdown.total_gross)}</span>
      </div>

      {/* Actions */}
      <div className="col g8">
        <button className="btn bp blk" onClick={handleConfirm}>{t("build.confirm_concept")}</button>
        <button className="btn bs blk" onClick={handleDeposit}>{t("build.pay_deposit")}</button>
        <button className="btn bo blk" onClick={handleQuote}>{t("build.request_quote")}</button>
        <div className="row g8">
          <button className="btn bo f1" onClick={saveDraft}><ShareIcon size={14} /> {t("build.save_btn")}</button>
          <button className="btn bo f1" onClick={handleShare}>{t("build.share_btn")}</button>
        </div>
        <button className="link tcenter" onClick={() => navigate("/account")}>{t("build.contact_mococha")}</button>
      </div>
    </SW>
  );
}
