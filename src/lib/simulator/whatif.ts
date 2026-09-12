import { extractSignals, runSimulation } from "./engine";
import { collectAdvice, planFromAdvice } from "./advice";
import { professorById } from "./catalog";
import type {
  GpaScale,
  Profile,
  ProfessorReview,
  ReviewPrefs,
  SimulationResult,
  Stance,
  TargetBar,
  Verdict,
} from "./types";

export type WhatIfId =
  | "english800"
  | "firstAuthor"
  | "github"
  | "rankTop10"
  | "labRA"
  | "recStronger";

export interface WhatIfMove {
  id: WhatIfId;
  label: string;
  hint: string;
}

export const COMPARE_SCHOOLS = [
  "國立台灣大學",
  "國立清華大學",
  "國立陽明交通大學",
  "國立成功大學",
  "國立台灣科技大學",
  "國立政治大學",
];

export function availableMoves(p: Profile, prefs?: ReviewPrefs): WhatIfMove[] {
  const s = extractSignals(p, prefs);
  const moves: WhatIfMove[] = [];
  if (s.flags.englishMissing || s.english < 66) {
    moves.push({
      id: "english800",
      label: "補 TOEIC 800",
      hint: "英文不再當硬門檻（估算）",
    });
  }
  const researchReady =
    s.flags.projectSubstance && (s.flags.lab || s.flags.nstc);
  if (!s.flags.firstAuthor && (s.flags.hasPaper || researchReady)) {
    moves.push({
      id: "firstAuthor",
      label: "補第一作者研討會",
      hint: s.flags.hasPaper
        ? "把現有產出收成可被追問的第一作者"
        : "專題已有閉環，才試算投稿划不划算",
    });
  }
  if (!s.flags.github) {
    moves.push({
      id: "github",
      label: "公開可驗證 repo",
      hint: "工程委員可以點進去查",
    });
  }
  if (s.rankPct == null || s.rankPct > 10) {
    moves.push({
      id: "rankTop10",
      label: "班排進前 10%",
      hint: "學業位置試算，不是改成績單",
    });
  }
  if (!s.flags.lab) {
    moves.push({
      id: "labRA",
      label: "進實驗室當 RA",
      hint: "讓研究節奏可被追問（估算）",
    });
  }
  if (s.flags.recWeak || p.recommendation === "mixed") {
    moves.push({
      id: "recStronger",
      label: "換成指導教授強推",
      hint: "兩封強推自述，仍無法核對內文",
    });
  }
  return moves;
}

export function applyWhatIf(
  profile: Profile,
  ids: WhatIfId[],
  altSchool?: string,
): Profile {
  const next: Profile = { ...profile };
  const set = new Set(ids);
  if (set.has("english800")) {
    next.englishType = "toeic";
    next.englishVersion = "toeic-lr";
    next.englishScore = "800";
  }
  if (set.has("firstAuthor")) {
    const extra = "第一作者研討會一篇（試算補強，國內 workshop oral）。";
    next.papers = next.papers.trim()
      ? `${next.papers.trim()}；${extra}`
      : extra;
  }
  if (set.has("github")) {
    next.github = next.github.trim()
      ? `${next.github.trim()} github.com/applicant-demo（試算：README + 可跑結果）。`
      : "github.com/applicant-demo — 專題系統公開，含 README 與實驗結果。";
  }
  if (set.has("rankTop10")) {
    const size = Number(next.classSize);
    const n = Number.isFinite(size) && size > 0 ? size : 50;
    next.classSize = String(n);
    next.classRank = String(Math.max(1, Math.ceil(n * 0.1)));
  }
  if (set.has("labRA")) {
    const extra =
      "實驗室 RA 一學期（試算補強）：固定 meeting、跑實驗、整理 related work。";
    next.research = next.research.trim()
      ? `${next.research.trim()}；${extra}`
      : extra;
  }
  if (set.has("recStronger")) {
    if (
      next.recommendation === "none" ||
      next.recommendation === "weak" ||
      next.recommendation === "mixed"
    ) {
      next.recommendation = "strong-2";
    }
  }
  if (altSchool && altSchool.trim()) {
    next.targetSchool = altSchool.trim();
  }
  return next;
}

export interface VoteFlip {
  professorId: string;
  from: Stance;
  to: Stance;
  flipped: boolean;
}

export function voteDiff(base: SimulationResult, alt: SimulationResult): VoteFlip[] {
  return base.committee.votes.map((v) => {
    const to =
      alt.committee.votes.find((x) => x.professorId === v.professorId)?.stance ??
      v.stance;
    return {
      professorId: v.professorId,
      from: v.stance,
      to,
      flipped: to !== v.stance,
    };
  });
}

export interface DrillQuestion {
  text: string;
  professorId: string;
}

const DRILL_FOCUS: Record<string, RegExp> = {
  a: /成績|班排|科目/,
  b: /論文|實驗|題目|related|第一學期/,
  c: /GitHub|commit|實習|模組|交付/,
  d: /英文|English|seminar/,
  e: /經不起|風險|一頁/,
};

function pickFromReview(
  rev: ProfessorReview,
  seen: Set<string>,
): string | null {
  const unique = rev.questions.filter((q) => !seen.has(q));
  if (unique.length === 0) return null;
  const focus = DRILL_FOCUS[rev.professorId];
  if (focus) {
    const hit = unique.find((q) => focus.test(q));
    if (hit) return hit;
  }
  return unique.find((q) => !/請把專題系統/.test(q)) ?? unique[0];
}

export function pickDrillQuestions(reviews: ProfessorReview[]): DrillQuestion[] {
  const rank: Record<Stance, number> = {
    oppose: 0,
    "lean-against": 1,
    hold: 2,
    support: 3,
    "strong-support": 4,
  };
  const ordered = [...reviews].sort((a, b) => rank[a.stance] - rank[b.stance]);
  const seen = new Set<string>();
  const out: DrillQuestion[] = [];

  for (const rev of ordered) {
    const q = pickFromReview(rev, seen);
    if (!q) continue;
    seen.add(q);
    out.push({ text: q, professorId: rev.professorId });
    if (out.length >= 3) return out;
  }
  return out;
}

export interface InterviewItem {
  professorId: string;
  gained: number;
  note: string;
}

export interface InterviewScore {
  spillover: number;
  byProfessor: Record<string, number>;
  items: InterviewItem[];
}

export function scoreInterviewDetailed(
  questions: DrillQuestion[],
  answers: string[],
): InterviewScore {
  const byProfessor: Record<string, number> = {};
  const items: InterviewItem[] = [];
  let spillover = 0;
  questions.forEach((q, i) => {
    const t = (answers[i] ?? "").trim();
    if (t.length < 24) {
      items.push({
        professorId: q.professorId,
        gained: 0,
        note: "太短，這題沒加權。",
      });
      return;
    }
    let g = 3;
    if (t.length >= 72) g += 2;
    if (
      /貢獻|實驗|架構|模組|論文|related|失敗|瓶頸|驗證|資料|延遲|準確|commit|白板|取捨/.test(
        t,
      )
    ) {
      g += 2;
    }
    g = Math.min(8, g);
    byProfessor[q.professorId] = Math.min(
      8,
      (byProfessor[q.professorId] ?? 0) + g,
    );
    spillover += 1;
    items.push({
      professorId: q.professorId,
      gained: g,
      note: g >= 6 ? "答得具體，該席可能加權。" : "有回答，加權有限。",
    });
  });
  return {
    spillover: Math.min(4, spillover),
    byProfessor,
    items,
  };
}

export function scoreInterview(answers: string[]): number {
  return scoreInterviewDetailed(
    answers.map(() => ({ text: "", professorId: "e" })),
    answers,
  ).spillover;
}

export function buildPlan(p: Profile, prefs?: ReviewPrefs) {
  const s = extractSignals(p, prefs);
  const items = collectAdvice(p, s, { deadline: prefs?.deadline ?? "6w" });
  return planFromAdvice(items);
}

export function simulateVariant(
  profile: Profile,
  professorIds: string[],
  ids: WhatIfId[],
  altSchool?: string,
  interview?: { spillover?: number; byProfessor?: Record<string, number> },
  prefs?: ReviewPrefs,
): SimulationResult {
  return runSimulation(applyWhatIf(profile, ids, altSchool), professorIds, {
    interviewBonus: interview?.spillover ?? 0,
    interviewByProfessor: interview?.byProfessor,
    prefs,
  });
}

export function verdictShift(from: Verdict, to: Verdict): string {
  if (from === to) return "裁決不變";
  const order: Verdict[] = [
    "reject",
    "waitlist",
    "borderline",
    "admit",
    "strong-admit",
  ];
  return order.indexOf(to) > order.indexOf(from) ? "裁決上修" : "裁決下修";
}

export function flipLabel(id: string) {
  return `${professorById(id).surname}教授`;
}

export interface SweepPoint {
  key: string;
  label: string;
  hint: string;
  current: boolean;
  verdict: Verdict;
  linStance: Stance | null;
  profilePatch: Partial<Profile>;
}

function formatGpa(n: number, scale: GpaScale): string {
  if (scale === "100") return String(Math.round(n));
  return n.toFixed(2);
}

function gpaTickValues(scale: GpaScale, current: string): string[] {
  const base =
    scale === "4.3"
      ? ["3.00", "3.30", "3.50", "3.70", "3.90", "4.00", "4.20"]
      : scale === "4.0"
        ? ["2.80", "3.00", "3.20", "3.40", "3.50", "3.70", "3.90"]
        : ["70", "75", "80", "85", "88", "90", "95"];
  const n = Number(current);
  const cur = Number.isFinite(n) ? formatGpa(n, scale) : null;
  const set = [...base];
  if (cur && !set.includes(cur)) {
    set.push(cur);
    set.sort((a, b) => Number(a) - Number(b));
  }
  return set;
}

export function gpaSweep(
  profile: Profile,
  professorIds: string[],
  prefs?: ReviewPrefs,
): SweepPoint[] {
  const values = gpaTickValues(profile.gpaScale, profile.gpaValue);
  const current = Number.isFinite(Number(profile.gpaValue))
    ? formatGpa(Number(profile.gpaValue), profile.gpaScale)
    : "";
  return values.map((v) => {
    const next = { ...profile, gpaValue: v };
    const sim = runSimulation(next, professorIds, { prefs });
    const lin = sim.committee.votes.find((x) => x.professorId === "a");
    return {
      key: `gpa-${v}`,
      label: v,
      hint: profile.gpaScale === "100" ? "百分制" : `${profile.gpaScale} 制`,
      current: v === current,
      verdict: sim.committee.verdict,
      linStance: lin?.stance ?? null,
      profilePatch: { gpaValue: v },
    };
  });
}

export function rankSweep(
  profile: Profile,
  professorIds: string[],
  prefs?: ReviewPrefs,
): SweepPoint[] {
  const sizeN = Number(profile.classSize);
  const n = Number.isFinite(sizeN) && sizeN > 0 ? sizeN : 50;
  const pcts = [5, 10, 15, 20, 30, 50];
  const s = extractSignals(profile, prefs);
  const currentPct =
    s.rankPct != null ? Math.round(s.rankPct) : null;
  const list = [...pcts];
  if (currentPct != null && !list.includes(currentPct)) {
    list.push(currentPct);
    list.sort((a, b) => a - b);
  }
  return list.map((pct) => {
    const rank = String(Math.max(1, Math.ceil((n * pct) / 100)));
    const next = { ...profile, classSize: String(n), classRank: rank };
    const sim = runSimulation(next, professorIds, { prefs });
    const lin = sim.committee.votes.find((x) => x.professorId === "a");
    return {
      key: `rank-${pct}`,
      label: `前 ${pct}%`,
      hint: `${rank}/${n}`,
      current: currentPct != null && pct === currentPct,
      verdict: sim.committee.verdict,
      linStance: lin?.stance ?? null,
      profilePatch: { classSize: String(n), classRank: rank },
    };
  });
}

export interface SchoolRow {
  school: string;
  bar: TargetBar;
  verdict: Verdict;
  support: number;
  hold: number;
  against: number;
  current: boolean;
}

export function compareAllSchools(
  profile: Profile,
  professorIds: string[],
  prefs?: ReviewPrefs,
): SchoolRow[] {
  const schools = [...COMPARE_SCHOOLS];
  const target = profile.targetSchool.trim();
  if (target && !schools.includes(target)) schools.unshift(target);
  return schools.map((school) => {
    const sim = runSimulation({ ...profile, targetSchool: school }, professorIds, {
      prefs,
    });
    const support = sim.committee.votes.filter(
      (v) => v.stance === "strong-support" || v.stance === "support",
    ).length;
    const hold = sim.committee.votes.filter((v) => v.stance === "hold").length;
    return {
      school,
      bar: sim.signals.targetBar,
      verdict: sim.committee.verdict,
      support,
      hold,
      against: sim.committee.votes.length - support - hold,
      current: school === (target || profile.school),
    };
  });
}
