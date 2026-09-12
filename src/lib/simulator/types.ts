export type GpaScale = "4.3" | "4.0" | "100";

export type EnglishType = "toeic" | "toefl" | "ielts" | "gept" | "none";

export type EnglishVersion =
  | "toeic-lr"
  | "toeic-sw"
  | "toefl-ibt"
  | "toefl-itp"
  | "ielts-academic"
  | "ielts-general"
  | "gept-band"
  | "none";

export type RecLetters =
  | "strong-3"
  | "strong-2"
  | "mixed"
  | "weak"
  | "none";

export type Stance =
  | "strong-support"
  | "support"
  | "hold"
  | "lean-against"
  | "oppose";

export type Verdict =
  | "strong-admit"
  | "admit"
  | "borderline"
  | "waitlist"
  | "reject";

export type SchoolTier = "t0" | "t1" | "t2" | "t3";

export type TargetBar = "very-high" | "high" | "mid" | "low";

export type Band = "very-strong" | "strong" | "mid" | "weak" | "gap";

export type Step = "profile" | "committee" | "reviews" | "session";

export type Deadline = "2w" | "6w" | "term";

export type EvidenceKind = "stated" | "inferred" | "missing";

export type Horizon = "2w" | "6w" | "term";

export type Cost = "low" | "mid" | "high";

export interface Evidence {
  field: string;
  kind: EvidenceKind;
  quote?: string;
}

export interface CitedNote {
  text: string;
  evidence: Evidence;
}

export interface Improvement {
  text: string;
  horizon: Horizon;
  cost: Cost;
  why: string;
}

export interface ReviewPrefs {
  dimScale: {
    academics: number;
    research: number;
    engineering: number;
    english: number;
  };
  schoolTiers: Record<string, SchoolTier>;
  deadline: Deadline;
}

export const DEFAULT_PREFS: ReviewPrefs = {
  dimScale: {
    academics: 1,
    research: 1,
    engineering: 1,
    english: 1,
  },
  schoolTiers: {},
  deadline: "6w",
};

export interface Profile {
  name: string;
  school: string;
  department: string;
  targetSchool: string;
  targetProgram: string;
  gpaValue: string;
  gpaScale: GpaScale;
  classRank: string;
  classSize: string;
  englishType: EnglishType;
  englishVersion?: EnglishVersion;
  englishScore: string;
  project: string;
  research: string;
  papers: string;
  certs: string;
  github: string;
  internship: string;
  recommendation: RecLetters;
  highlights: string;
}

export interface Signals {
  schoolTier: SchoolTier;
  targetTier: SchoolTier;
  targetBar: TargetBar;
  gpa100: number | null;
  rankPct: number | null;
  academics: number;
  research: number;
  engineering: number;
  english: number;
  letters: number;
  completeness: number;
  bands: Record<Dimension, Band>;
  flags: SignalFlags;
}

export type Dimension =
  | "academics"
  | "research"
  | "engineering"
  | "english"
  | "letters"
  | "completeness";

export interface SignalFlags {
  hasPaper: boolean;
  firstAuthor: boolean;
  journal: boolean;
  conference: boolean;
  lab: boolean;
  nstc: boolean;
  github: boolean;
  strongInternship: boolean;
  anyInternship: boolean;
  projectSubstance: boolean;
  englishMissing: boolean;
  englishInvalid: boolean;
  englishStrong: boolean;
  gpaInvalid: boolean;
  rankInvalid: boolean;
  rankTop10: boolean;
  gpaStrong: boolean;
  gpaWeak: boolean;
  schoolMismatch: boolean;
  deptMismatch: boolean;
  recStrong: boolean;
  recWeak: boolean;
  emptyCore: boolean;
}

export interface ProfessorDef {
  id: string;
  surname: string;
  title: string;
  focus: string;
  blurb: string;
  weights: Record<Dimension, number>;
  harshness: number;
  weakestLink: boolean;
}

export interface ProfessorReview {
  professorId: string;
  score: number;
  stance: Stance;
  strengths: CitedNote[];
  weaknesses: CitedNote[];
  maxRisk: string;
  questions: string[];
  comment: string;
  improvements: Improvement[];
}

export interface TranscriptTurn {
  speaker: string;
  role: string;
  text: string;
}

export interface CommitteeOutcome {
  verdict: Verdict;
  votes: { professorId: string; stance: Stance }[];
  transcript: TranscriptTurn[];
  summary: string;
  dissent: string | null;
}

export interface SimulationResult {
  caseId: string;
  createdAt: string;
  signals: Signals;
  reviews: ProfessorReview[];
  committee: CommitteeOutcome;
  interviewBonus?: number;
  interviewByProfessor?: Record<string, number>;
  prefsUsed?: ReviewPrefs;
}

export const EMPTY_PROFILE: Profile = {
  name: "",
  school: "",
  department: "",
  targetSchool: "",
  targetProgram: "資訊工程研究所",
  gpaValue: "",
  gpaScale: "4.3",
  classRank: "",
  classSize: "",
  englishType: "toeic",
  englishVersion: "toeic-lr",
  englishScore: "",
  project: "",
  research: "",
  papers: "",
  certs: "",
  github: "",
  internship: "",
  recommendation: "mixed",
  highlights: "",
};

export const DIMENSION_LABEL: Record<Dimension, string> = {
  academics: "學業",
  research: "研究",
  engineering: "實作",
  english: "英文",
  letters: "推薦",
  completeness: "完整度",
};

export const STANCE_LABEL: Record<Stance, string> = {
  "strong-support": "強烈支持",
  support: "支持",
  hold: "保留",
  "lean-against": "偏反對",
  oppose: "反對",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  "strong-admit": "Strong Admit",
  admit: "Admit",
  borderline: "Borderline",
  waitlist: "Waitlist",
  reject: "Reject",
};

export const VERDICT_ZH: Record<Verdict, string> = {
  "strong-admit": "強烈錄取傾向",
  admit: "錄取傾向",
  borderline: "邊緣案件",
  waitlist: "備取傾向",
  reject: "不錄取傾向",
};

export const BAND_LABEL: Record<Band, string> = {
  "very-strong": "很強",
  strong: "強",
  mid: "中等",
  weak: "偏弱",
  gap: "缺口",
};

export const TIER_LABEL: Record<SchoolTier, string> = {
  t0: "T0 台清交",
  t1: "T1 成政中央中山科大",
  t2: "T2 中堅",
  t3: "T3 / 未歸類",
};

export const BAR_LABEL: Record<TargetBar, string> = {
  "very-high": "極高",
  high: "高",
  mid: "中",
  low: "相對低",
};

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  stated: "使用者提供",
  inferred: "規則推導",
  missing: "資料不足",
};

export const HORIZON_LABEL: Record<Horizon, string> = {
  "2w": "兩週內",
  "6w": "六週內",
  term: "一學期",
};

export const COST_LABEL: Record<Cost, string> = {
  low: "低成本",
  mid: "中成本",
  high: "高成本",
};

export const DEADLINE_LABEL: Record<Deadline, string> = {
  "2w": "兩週",
  "6w": "六週",
  term: "一學期",
};
