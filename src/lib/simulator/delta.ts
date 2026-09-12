import { professorById } from "./catalog";
import {
  DEADLINE_LABEL,
  DIMENSION_LABEL,
  STANCE_LABEL,
  type SimulationResult,
  type Verdict,
} from "./types";

export interface ReviewDelta {
  verdictFrom: Verdict;
  verdictTo: Verdict;
  shift: string;
  flips: {
    professorId: string;
    from: SimulationResult["committee"]["votes"][number]["stance"];
    to: SimulationResult["committee"]["votes"][number]["stance"];
    why: string;
  }[];
  risksGone: { professorId: string; text: string }[];
  risksNew: { professorId: string; text: string }[];
  reasons: string[];
}

const DIMS = ["academics", "research", "engineering", "english"] as const;

const VERDICT_ORDER: Verdict[] = [
  "reject",
  "waitlist",
  "borderline",
  "admit",
  "strong-admit",
];

function shiftLabel(from: Verdict, to: Verdict): string {
  if (from === to) return "裁決不變";
  return VERDICT_ORDER.indexOf(to) > VERDICT_ORDER.indexOf(from)
    ? "裁決上修"
    : "裁決下修";
}

export function reviewDelta(
  prior: SimulationResult,
  next: SimulationResult,
): ReviewDelta {
  const flips = prior.committee.votes
    .map((v) => {
      const to =
        next.committee.votes.find((x) => x.professorId === v.professorId)
          ?.stance ?? v.stance;
      return {
        professorId: v.professorId,
        from: v.stance,
        to,
        why: explainFlip(prior, next, v.professorId),
      };
    })
    .filter((f) => f.from !== f.to);

  const risksGone: ReviewDelta["risksGone"] = [];
  const risksNew: ReviewDelta["risksNew"] = [];
  for (const prev of prior.reviews) {
    const cur = next.reviews.find((r) => r.professorId === prev.professorId);
    if (!cur) continue;
    if (cur.maxRisk !== prev.maxRisk) {
      risksGone.push({ professorId: prev.professorId, text: prev.maxRisk });
      risksNew.push({ professorId: cur.professorId, text: cur.maxRisk });
    }
  }

  return {
    verdictFrom: prior.committee.verdict,
    verdictTo: next.committee.verdict,
    shift: shiftLabel(prior.committee.verdict, next.committee.verdict),
    flips,
    risksGone,
    risksNew,
    reasons: collectReasons(prior, next),
  };
}

function collectReasons(prior: SimulationResult, next: SimulationResult): string[] {
  const out: string[] = [];
  const a = prior.signals;
  const b = next.signals;
  const fa = a.flags;
  const fb = b.flags;

  if (fa.englishInvalid && !fb.englishInvalid) out.push("英文分數改為有效區間");
  if (!fa.englishInvalid && fb.englishInvalid)
    out.push("英文分數無效，不再計正面訊號");
  if (fa.englishMissing && !fb.englishMissing && !fb.englishInvalid)
    out.push("英文從缺漏變成有成績");
  if (!fa.englishMissing && fb.englishMissing) out.push("英文變成缺漏");
  if (!fa.englishStrong && fb.englishStrong) out.push("英文過舒適線");
  if (fa.englishStrong && !fb.englishStrong) out.push("英文不再過舒適線");
  if (fa.gpaInvalid && !fb.gpaInvalid) out.push("GPA 改為有效數字");
  if (!fa.gpaInvalid && fb.gpaInvalid) out.push("GPA 超出制度範圍，不計正面訊號");
  if (!fa.rankTop10 && fb.rankTop10) out.push("班排進入前 10%");
  if (fa.rankTop10 && !fb.rankTop10) out.push("班排不再是前 10%");
  if (fa.rankInvalid && !fb.rankInvalid) out.push("班排名次改為有效");
  if (!fa.rankInvalid && fb.rankInvalid) out.push("班排無效，百分位不計");
  if (!fa.hasPaper && fb.hasPaper) out.push("材料出現論文／研討會產出");
  if (!fa.firstAuthor && fb.firstAuthor) out.push("出現第一作者紀錄");
  if (!fa.github && fb.github) out.push("補上可點進去的作品入口");
  if (!fa.lab && fb.lab) out.push("補上實驗室節奏");
  if (fa.schoolMismatch && !fb.schoolMismatch)
    out.push("目標所與出身學校跨度縮小");
  if (!fa.schoolMismatch && fb.schoolMismatch)
    out.push("目標所門檻相對出身學校拉高");
  if (fa.emptyCore && !fb.emptyCore) out.push("專題／研究不再空白");

  for (const d of DIMS) {
    const delta = b[d] - a[d];
    if (delta >= 8) out.push(`${DIMENSION_LABEL[d]}訊號上升`);
    if (delta <= -8) out.push(`${DIMENSION_LABEL[d]}訊號下降`);
  }

  const pa = prior.prefsUsed?.dimScale;
  const pb = next.prefsUsed?.dimScale;
  if (pa && pb) {
    for (const d of DIMS) {
      if (pa[d] !== pb[d]) out.push(`審查權重：${DIMENSION_LABEL[d]}已調整`);
    }
  }
  const sa = JSON.stringify(prior.prefsUsed?.schoolTiers ?? {});
  const sb = JSON.stringify(next.prefsUsed?.schoolTiers ?? {});
  if (sa !== sb) out.push("校名分級假設已改寫");
  const da = prior.prefsUsed?.deadline;
  const db = next.prefsUsed?.deadline;
  if (da && db && da !== db) {
    out.push(`距截止改為${DEADLINE_LABEL[db]}，補強建議重排`);
  }

  return out.slice(0, 6);
}

function explainFlip(
  prior: SimulationResult,
  next: SimulationResult,
  id: string,
): string {
  const reasons = collectReasons(prior, next);
  const prof = professorById(id);
  const focused = reasons.filter((r) => {
    if (id === "d") return /英文/.test(r);
    if (id === "a") return /學業|班排|GPA/.test(r);
    if (id === "b") return /研究|論文|實驗室|第一作者/.test(r);
    if (id === "c") return /實作|作品|實習/.test(r);
    return true;
  });
  const stance =
    next.committee.votes.find((v) => v.professorId === id)?.stance ?? "hold";
  const bit = focused[0] ?? reasons[0] ?? "綜合分數變動";
  return `${prof.surname}教授改為${STANCE_LABEL[stance]}：${bit}`;
}
