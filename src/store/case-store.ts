import { create } from "zustand";
import { persist } from "zustand/middleware";
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

function keepPrior(get: () => CaseState): SimulationResult | null {
  return get().result ?? get().priorResult;
}

export const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
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
        window.setTimeout(() => {
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
    }),
    {
      name: "grad-board-case-v2",
      skipHydration: true,
      partialize: (s) => ({
        profile: s.profile,
        selectedIds: s.selectedIds,
        step: s.step,
        result: s.result,
        priorResult: s.priorResult,
        interviewBonus: s.interviewBonus,
        interviewByProfessor: s.interviewByProfessor,
        prefs: s.prefs,
      }),
    },
  ),
);
