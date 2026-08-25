import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculateTotals, requiredTables, type Selection, type PriceBreakdown } from "../lib/pricing";

export type PartyEvent = {
  type: string; date: string; start_time: string; end_time: string;
  address: string; postal_code: string; city: string;
  indoor: boolean; outdoor: boolean; indoor_outdoor: boolean;
  floor: string; has_elevator: boolean; parking: string;
  setup_time: string; location_notes: string;
  num_children: number; num_adults: number; age_category: string;
  budget: string; notes: string;
};

export type PartyTheme = {
  theme: string; custom_theme: string; colors: string[];
  inspiration_links: string[]; design_by_mococha: boolean;
};

export type BuildMode = "self" | "inspiration" | "mococha-design";
export type ConceptStatus = "draft" | "saved" | "quotation_requested" | "awaiting_payment" | "paid" | "completed" | "archived";

export interface SavedConcept {
  id: string; name: string; event: PartyEvent; theme: PartyTheme | null;
  selections: Selection[]; inspirationImagePaths: string[];
  status: ConceptStatus; breakdown: PriceBreakdown;
  current_step: number; build_mode: BuildMode;
  created_at: string; updated_at: string;
}

const blankEvent: PartyEvent = {
  type: "", date: "", start_time: "", end_time: "", address: "", postal_code: "",
  city: "", indoor: false, outdoor: false, indoor_outdoor: false,
  floor: "", has_elevator: false, parking: "", setup_time: "", location_notes: "",
  num_children: 0, num_adults: 0, age_category: "", budget: "", notes: "",
};

export type PartyState = {
  event: PartyEvent;
  theme: PartyTheme | null;
  selections: Selection[];
  buildMode: BuildMode;
  currentStep: number;
  activeConceptId: string | null;
  inspirationImagePaths: string[];
  concepts: SavedConcept[];
  saveState: "idle" | "saving" | "saved" | "error";

  setEvent: (e: Partial<PartyEvent>) => void;
  setTheme: (t: PartyTheme) => void;
  addSelection: (sel: Selection) => void;
  removeSelection: (step: string, title: string) => void;
  clearStep: (step: string) => void;
  setBuildMode: (m: BuildMode) => void;
  setStep: (n: number) => void;
  clear: () => void;

  breakdown: () => PriceBreakdown;
  hasLargeBus: () => boolean;
  tableCount: () => number;

  setConceptStatus: (id: string, status: ConceptStatus) => void;
  startNewConcept: () => void;
  saveConcept: (name: string) => string;
  updateConcept: (id: string) => void;
  loadConcept: (id: string) => void;
  duplicateConcept: (id: string) => string;
  archiveConcept: (id: string) => void;
};

export const useParty = create<PartyState>()(persist((set, get) => ({
  event: { ...blankEvent },
  theme: null,
  selections: [],
  buildMode: "self",
  currentStep: 0,
  activeConceptId: null,
  inspirationImagePaths: [],
  concepts: [],
  saveState: "idle",

  setEvent: (patch) => set((s) => ({ event: { ...s.event, ...patch } })),
  setTheme: (theme) => set({ theme }),
  addSelection: (sel) => set((s) => ({
    selections: [...s.selections.filter((x) => !(x.step_key === sel.step_key && x.title === sel.title)), sel],
  })),
  removeSelection: (step_key, title) => set((s) => ({
    selections: s.selections.filter((x) => !(x.step_key === step_key && x.title === title)),
  })),
  clearStep: (step_key) => set((s) => ({
    selections: s.selections.filter((x) => x.step_key !== step_key),
  })),
  setBuildMode: (buildMode) => set({ buildMode }),
  setStep: (n) => set({ currentStep: n }),
  clear: () => set({ event: { ...blankEvent }, theme: null, selections: [], buildMode: "self", currentStep: 0, activeConceptId: null, inspirationImagePaths: [] }),

  breakdown: () => calculateTotals(get().selections),
  hasLargeBus: () => get().selections.some((s) => s.requires_large_bus),
  tableCount: () => requiredTables(get().event.num_children),

  startNewConcept: () => set({ event: { ...blankEvent }, theme: null, selections: [], currentStep: 0, activeConceptId: null, inspirationImagePaths: [], saveState: "idle" }),

  saveConcept: (name) => {
    const st = get();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const concept: SavedConcept = {
      id, name, event: st.event, theme: st.theme,
      selections: st.selections, inspirationImagePaths: st.inspirationImagePaths,
      status: "draft", breakdown: calculateTotals(st.selections),
      current_step: st.currentStep, build_mode: st.buildMode,
      created_at: now, updated_at: now,
    };
    set((s) => ({ concepts: [...s.concepts, concept], activeConceptId: id }));
    return id;
  },

  updateConcept: (id) => {
    const st = get();
    set((s) => ({
      concepts: s.concepts.map((c) => c.id === id ? {
        ...c, event: st.event, theme: st.theme, selections: st.selections,
        inspirationImagePaths: st.inspirationImagePaths, breakdown: calculateTotals(st.selections),
        current_step: st.currentStep, updated_at: new Date().toISOString(),
      } : c),
    }));
  },

  loadConcept: (id) => {
    const c = get().concepts.find((x) => x.id === id);
    if (!c) return;
    set({ event: c.event, theme: c.theme, selections: c.selections, currentStep: c.current_step, activeConceptId: id, inspirationImagePaths: c.inspirationImagePaths, buildMode: c.build_mode });
  },

  duplicateConcept: (id) => {
    const c = get().concepts.find((x) => x.id === id);
    if (!c) return "";
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const copy: SavedConcept = { ...c, id: newId, name: c.name + " (kopie)", status: "draft", created_at: now, updated_at: now };
    set((s) => ({ concepts: [...s.concepts, copy] }));
    return newId;
  },

  setConceptStatus: (id, status) => set((s) => ({
    concepts: s.concepts.map((c) => c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c),
  })),

  archiveConcept: (id) => set((s) => ({
    concepts: s.concepts.map((c) => c.id === id ? { ...c, status: "archived" as ConceptStatus, updated_at: new Date().toISOString() } : c),
  })),
}), {
  name: "mococha-party",
  partialize: (s) => ({
    event: s.event, theme: s.theme, selections: s.selections,
    buildMode: s.buildMode, currentStep: s.currentStep,
    activeConceptId: s.activeConceptId, inspirationImagePaths: s.inspirationImagePaths,
    concepts: s.concepts,
  }),
}));
