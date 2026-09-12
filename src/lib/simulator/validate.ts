import type {
  EnglishType,
  EnglishVersion,
  Profile,
} from "./types";

export type FieldKey =
  | "school"
  | "department"
  | "gpaValue"
  | "classRank"
  | "classSize"
  | "englishScore";

export const ENGLISH_VERSION_OPTIONS: Record<
  Exclude<EnglishType, "none">,
  { id: EnglishVersion; label: string; hint: string }[]
> = {
  toeic: [
    { id: "toeic-lr", label: "聽讀 L&R", hint: "10–990，5 的倍數" },
    { id: "toeic-sw", label: "說寫 S&W", hint: "0–400" },
  ],
  toefl: [
    { id: "toefl-ibt", label: "iBT", hint: "0–120" },
    { id: "toefl-itp", label: "ITP", hint: "310–677" },
  ],
  ielts: [
    { id: "ielts-academic", label: "Academic", hint: "0–9，0.5 級距" },
    { id: "ielts-general", label: "General", hint: "0–9，0.5 級距" },
  ],
  gept: [
    { id: "gept-band", label: "級距／分數", hint: "中高級、高級，或 0–100" },
  ],
};

export function defaultEnglishVersion(type: EnglishType): EnglishVersion {
  if (type === "toeic") return "toeic-lr";
  if (type === "toefl") return "toefl-ibt";
  if (type === "ielts") return "ielts-academic";
  if (type === "gept") return "gept-band";
  return "none";
}

export function resolveEnglishVersion(p: Profile): EnglishVersion {
  if (p.englishType === "none") return "none";
  if (p.englishVersion && p.englishVersion !== "none") return p.englishVersion;
  return defaultEnglishVersion(p.englishType);
}

export function parseNum(v: string): number | null {
  const n = Number(String(v).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parsePositiveInt(raw: string): number | null {
  const t = raw.trim();
  if (!/^[1-9]\d*$/.test(t)) return null;
  const n = Number(t);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const GEPT_BAND = /優級|高級|中高級|中級|初級|superior|high-intermediate|high\b|intermediate/;

export function englishFieldError(p: Profile): string | null {
  if (p.englishType === "none") return null;
  const raw = p.englishScore.trim();
  if (!raw) return null;
  const v = resolveEnglishVersion(p);
  const n = parseNum(raw);
  if (v === "toeic-lr") {
    if (n == null || !Number.isInteger(n) || n < 10 || n > 990 || n % 5 !== 0) {
      return "分數無效（TOEIC 聽讀為 10–990，5 的倍數）";
    }
    return null;
  }
  if (v === "toeic-sw") {
    if (n == null || !Number.isInteger(n) || n < 0 || n > 400) {
      return "分數無效（TOEIC 說寫為 0–400）";
    }
    return null;
  }
  if (v === "toefl-ibt") {
    if (n == null || !Number.isInteger(n) || n < 0 || n > 120) {
      return "分數無效（TOEFL iBT 為 0–120）";
    }
    return null;
  }
  if (v === "toefl-itp") {
    if (n == null || !Number.isInteger(n) || n < 310 || n > 677) {
      return "分數無效（TOEFL ITP 為 310–677）";
    }
    return null;
  }
  if (v === "ielts-academic" || v === "ielts-general") {
    if (n == null || n < 0 || n > 9 || Math.round(n * 2) / 2 !== n) {
      return "分數無效（IELTS 為 0–9，0.5 級距）";
    }
    return null;
  }
  if (GEPT_BAND.test(raw.toLowerCase())) return null;
  if (n != null && n >= 0 && n <= 100) return null;
  return "分數無效（GEPT 請填級距如中高級，或 0–100）";
}

export function gpaFieldError(p: Profile): string | null {
  const raw = p.gpaValue.trim();
  if (!raw) return "請填 GPA";
  const g = parseNum(raw);
  if (g == null) return "GPA 需為數字";
  if (p.gpaScale === "4.3" && (g < 0 || g > 4.3)) return "4.3 制 GPA 應介於 0–4.3";
  if (p.gpaScale === "4.0" && (g < 0 || g > 4.0)) return "4.0 制 GPA 應介於 0–4.0";
  if (p.gpaScale === "100" && (g < 0 || g > 100)) return "百分制應介於 0–100";
  return null;
}

export function rankErrors(p: Profile): {
  classRank?: string;
  classSize?: string;
} {
  const rankRaw = p.classRank.trim();
  const sizeRaw = p.classSize.trim();
  const out: { classRank?: string; classSize?: string } = {};
  if (!rankRaw && !sizeRaw) return out;
  if (rankRaw && !sizeRaw) out.classSize = "請同時填班級人數";
  if (sizeRaw && !rankRaw) out.classRank = "請同時填班排名";
  const rank = rankRaw ? parsePositiveInt(rankRaw) : null;
  const size = sizeRaw ? parsePositiveInt(sizeRaw) : null;
  if (rankRaw && rank == null) out.classRank = "班排名須為正整數";
  if (sizeRaw && size == null) out.classSize = "班級人數須為正整數";
  if (rank != null && size != null && rank > size) {
    out.classRank = "名次不得大於人數";
  }
  return out;
}

export function validateProfile(p: Profile): {
  ok: boolean;
  errors: Partial<Record<FieldKey, string>>;
  reason: string;
} {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (!p.school.trim()) errors.school = "請填學校";
  if (!p.department.trim()) errors.department = "請填科系";
  const gpa = gpaFieldError(p);
  if (gpa) errors.gpaValue = gpa;
  Object.assign(errors, rankErrors(p));
  const en = englishFieldError(p);
  if (en) errors.englishScore = en;
  const order: FieldKey[] = [
    "school",
    "department",
    "gpaValue",
    "classRank",
    "classSize",
    "englishScore",
  ];
  const reason = order.map((k) => errors[k]).find(Boolean) ?? "";
  return { ok: Object.keys(errors).length === 0, errors, reason };
}

export function scoredEnglish(p: Profile): {
  score: number;
  invalid: boolean;
  missing: boolean;
  strong: boolean;
  label: string;
} {
  const version = resolveEnglishVersion(p);
  const label = englishLabel(p.englishType, version);
  if (p.englishType === "none" || !p.englishScore.trim()) {
    return { score: 22, invalid: false, missing: true, strong: false, label };
  }
  if (englishFieldError(p)) {
    return { score: 22, invalid: true, missing: false, strong: false, label };
  }
  const n = parseNum(p.englishScore);
  let score = 28;
  if (version === "toeic-lr" && n != null) {
    if (n >= 900) score = 94;
    else if (n >= 860) score = 86;
    else if (n >= 800) score = 76;
    else if (n >= 750) score = 66;
    else if (n >= 650) score = 52;
    else if (n >= 550) score = 40;
    else score = 28;
  } else if (version === "toeic-sw" && n != null) {
    if (n >= 360) score = 90;
    else if (n >= 320) score = 76;
    else if (n >= 280) score = 60;
    else if (n >= 240) score = 46;
    else score = 30;
  } else if (version === "toefl-ibt" && n != null) {
    if (n >= 105) score = 96;
    else if (n >= 100) score = 90;
    else if (n >= 90) score = 76;
    else if (n >= 80) score = 62;
    else if (n >= 70) score = 48;
    else score = 32;
  } else if (version === "toefl-itp" && n != null) {
    if (n >= 627) score = 90;
    else if (n >= 550) score = 70;
    else if (n >= 500) score = 55;
    else if (n >= 460) score = 42;
    else score = 30;
  } else if (
    (version === "ielts-academic" || version === "ielts-general") &&
    n != null
  ) {
    if (n >= 7.5) score = 94;
    else if (n >= 7.0) score = 86;
    else if (n >= 6.5) score = 74;
    else if (n >= 6.0) score = 60;
    else if (n >= 5.5) score = 46;
    else score = 30;
  } else {
    const t = p.englishScore.toLowerCase();
    if (/優級|superior/.test(t) || (n != null && n >= 80)) score = 90;
    else if (/高級/.test(t) && !/中高級/.test(t)) score = 78;
    else if (/中高級|high-intermediate/.test(t) || (n != null && n >= 60))
      score = 64;
    else if (/中級/.test(t)) score = 48;
    else if (/初級/.test(t)) score = 32;
    else score = n != null ? Math.max(20, Math.min(90, n)) : 36;
  }
  return {
    score,
    invalid: false,
    missing: false,
    strong: score >= 80,
    label,
  };
}

export function englishLabel(
  type: EnglishType,
  version: EnglishVersion,
): string {
  if (type === "none") return "未提供英文成績";
  if (version === "toeic-lr") return "TOEIC 聽讀";
  if (version === "toeic-sw") return "TOEIC 說寫";
  if (version === "toefl-ibt") return "TOEFL iBT";
  if (version === "toefl-itp") return "TOEFL ITP";
  if (version === "ielts-academic") return "IELTS Academic";
  if (version === "ielts-general") return "IELTS General";
  if (type === "gept") return "GEPT";
  return "英文";
}

export function clipQuote(text: string, max = 22): string | undefined {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
