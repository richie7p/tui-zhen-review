import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSafeStorage } from "@/lib/safe-storage";
import { restoreCase } from "./case-persistence";
import {
  DEFAULT_PREFS,
  EMPTY_PROFILE,
  PROFESSORS,
  profileReady,
  runSimulation,
  type Profile,
  type ReviewPrefs,
  type SchoolTier,
  type SimulationResult,
  type Step,
} from "@/lib/simulator";

interface CaseState {
  profile: Profile;
  selectedIds: string[];
  step: Step;
  result: SimulationResult | null;
  priorResult: SimulationResult | null;
  reviewing: boolean;
  interviewBonus: number;
  interviewByProfessor: Record<string, number>;
  prefs: ReviewPrefs;
  patchProfile: (patch: Partial<Profile>) => void;
  setProfile: (profile: Profile) => void;
  toggleProfessor: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  setStep: (step: Step) => void;
  setPrefs: (patch: Partial<ReviewPrefs>) => void;
  setDimScale: (dim: keyof ReviewPrefs["dimScale"], value: number) => void;
  setSchoolTier: (name: string, tier: SchoolTier | null) => void;
  reset: () => void;
  startReview: () => { ok: boolean; reason: string };
  commitCase: (
    patch?: Partial<Profile>,
    opts?: {
      interviewBonus?: number;
      interviewByProfessor?: Record<string, number>;
    },
  ) => void;
}

const defaultSelected = PROFESSORS.map((p) => p.id);
let reviewGeneration = 0;

function keepPrior(get: () => CaseState): SimulationResult | null {
  return get().result ?? get().priorResult;
}

export const useCaseStore = create<CaseState>()(
  persist(
    (setState, get) => {
      const set = (patch: Partial<CaseState>) => {
        reviewGeneration += 1;
        setState({ reviewing: false, ...patch });
      };
      return ({
      profile: EMPTY_PROFILE,
      selectedIds: defaultSelected,
      step: "profile",
      result: null,
      priorResult: null,
      reviewing: false,
      interviewBonus: 0,
      interviewByProfessor: {},
      prefs: DEFAULT_PREFS,
      patchProfile: (patch) =>
        set({
          profile: { ...get().profile, ...patch },
          priorResult: keepPrior(get),
          result: null,
          interviewBonus: 0,
          interviewByProfessor: {},
        }),
      setProfile: (profile) =>
        set({
          profile,
          priorResult: null,
          result: null,
          interviewBonus: 0,
          interviewByProfessor: {},
        }),
      toggleProfessor: (id) => {
        const cur = get().selectedIds;
        const next = cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id];
        set({
          selectedIds: next.length ? next : cur,
          priorResult: keepPrior(get),
          result: null,
          interviewBonus: 0,
          interviewByProfessor: {},
        });
      },
      setSelectedIds: (ids) =>
        set({
          selectedIds: ids,
          priorResult: keepPrior(get),
          result: null,
          interviewBonus: 0,
          interviewByProfessor: {},
        }),
      setStep: (step) => set({ step }),
      setPrefs: (patch) => {
        const next = { ...get().prefs, ...patch };
        const scoreAffecting =
          patch.dimScale !== undefined || patch.schoolTiers !== undefined;
        set({
          prefs: next,
          ...(scoreAffecting
            ? { priorResult: keepPrior(get), result: null }
            : {}),
        });
      },
      setDimScale: (dim, value) =>
        set({
          prefs: {
            ...get().prefs,
            dimScale: { ...get().prefs.dimScale, [dim]: value },
          },
          priorResult: keepPrior(get),
          result: null,
        }),
      setSchoolTier: (name, tier) => {
        const schoolTiers = { ...get().prefs.schoolTiers };
        if (!name.trim()) return;
        if (tier == null) delete schoolTiers[name];
        else schoolTiers[name] = tier;
        set({
          prefs: { ...get().prefs, schoolTiers },
          priorResult: keepPrior(get),
          result: null,
        });
      },
      reset: () =>
        set({
          profile: EMPTY_PROFILE,
          selectedIds: defaultSelected,
          step: "profile",
          result: null,
          priorResult: null,
          reviewing: false,
          interviewBonus: 0,
          interviewByProfessor: {},
          prefs: DEFAULT_PREFS,
        }),
      startReview: () => {
        const { profile, selectedIds, prefs } = get();
        const ready = profileReady(profile);
        if (!ready.ok) return ready;
        if (selectedIds.length === 0)
          return { ok: false, reason: "請至少選一位委員" };
        const result = runSimulation(profile, selectedIds, { prefs });
        set({
          reviewing: true,
          step: "reviews",
          interviewBonus: 0,
          interviewByProfessor: {},
          priorResult: keepPrior(get),
        });
        const generation = reviewGeneration;
        globalThis.setTimeout(() => {
          if (generation !== reviewGeneration) return;
          set({ result, reviewing: false });
        }, 1100);
        return { ok: true, reason: "" };
      },
      commitCase: (patch, opts) => {
        const profile = patch
          ? { ...get().profile, ...patch }
          : get().profile;
        const interviewBonus = opts?.interviewBonus ?? get().interviewBonus;
        const interviewByProfessor =
          opts?.interviewByProfessor ?? get().interviewByProfessor;
        const priorResult = get().result ?? get().priorResult;
        const result = runSimulation(profile, get().selectedIds, {
          interviewBonus,
          interviewByProfessor,
          prefs: get().prefs,
        });
        set({
          profile,
          result,
          priorResult,
          interviewBonus,
          interviewByProfessor,
          reviewing: false,
          step: "session",
        });
      },
    }); },
    {
      name: "grad-board-session-v3",
      version: 1,
      storage: createJSONStorage(() => createSafeStorage(() => window.sessionStorage)),
      skipHydration: true,
      partialize: (s) => ({ profile: s.profile, selectedIds: s.selectedIds, prefs: s.prefs }),
      migrate: (persisted) => restoreCase(persisted),
      merge: (persisted, current) => ({ ...current, ...restoreCase(persisted) }),
    },
  ),
);
