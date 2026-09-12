import { CHAIR, matchTier, PROFESSORS, professorById } from "./catalog";
import { collectAdvice } from "./advice";
import {
  clipQuote,
  parseNum,
  parsePositiveInt,
  scoredEnglish,
  validateProfile,
} from "./validate";
import type {
  Band,
  CitedNote,
  CommitteeOutcome,
  Dimension,
  EvidenceKind,
  Profile,
  ProfessorDef,
  ProfessorReview,
  RecLetters,
  ReviewPrefs,
  Signals,
  SignalFlags,
  SimulationResult,
  Stance,
  TargetBar,
  TranscriptTurn,
  Verdict,
} from "./types";
import { DEFAULT_PREFS } from "./types";

const DIMS: Dimension[] = [
  "academics",
  "research",
  "engineering",
  "english",
  "letters",
  "completeness",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function toBand(n: number): Band {
  if (n >= 85) return "very-strong";
  if (n >= 70) return "strong";
  if (n >= 55) return "mid";
  if (n >= 40) return "weak";
  return "gap";
}

function has(text: string, re: RegExp) {
  return re.test(text);
}

function blob(p: Profile) {
  return [p.project, p.research, p.papers, p.certs, p.github, p.internship, p.highlights]
    .join("\n")
    .toLowerCase();
}

function gpaTo100(value: number, scale: Profile["gpaScale"]): number {
  if (scale === "100") return clamp(value);
  if (scale === "4.3") {
    if (value >= 4.2) return 98;
    if (value >= 4.0) return 92;
    if (value >= 3.8) return 86;
    if (value >= 3.6) return 78;
    if (value >= 3.3) return 68;
    if (value >= 3.0) return 56;
    if (value >= 2.7) return 45;
    return 32;
  }
  if (value >= 3.9) return 97;
  if (value >= 3.7) return 90;
  if (value >= 3.5) return 82;
  if (value >= 3.3) return 72;
  if (value >= 3.0) return 58;
  if (value >= 2.7) return 46;
  return 32;
}

function gpaOutOfRange(p: Profile): boolean {
  const g = parseNum(p.gpaValue);
  if (g == null) return true;
  if (p.gpaScale === "4.3") return g < 0 || g > 4.3;
  if (p.gpaScale === "4.0") return g < 0 || g > 4.0;
  return g < 0 || g > 100;
}

function recScore(r: RecLetters): number {
  switch (r) {
    case "strong-3":
      return 90;
    case "strong-2":
      return 78;
    case "mixed":
      return 58;
    case "weak":
      return 36;
    case "none":
      return 18;
  }
}

function targetBar(tier: ReturnType<typeof matchTier>): TargetBar {
  if (tier === "t0") return "very-high";
  if (tier === "t1") return "high";
  if (tier === "t2") return "mid";
  return "low";
}

function barAdjust(bar: TargetBar): number {
  switch (bar) {
    case "very-high":
      return -8;
    case "high":
      return -3;
    case "mid":
      return 4;
    case "low":
      return 8;
  }
}

export function extractSignals(p: Profile, prefs?: ReviewPrefs): Signals {
  const overrides = prefs?.schoolTiers;
  const schoolTier = matchTier(p.school, overrides);
  const targetTier = matchTier(p.targetSchool || p.school, overrides);
  const bar = targetBar(targetTier);
  const all = blob(p);

  const gpaInvalid = Boolean(p.gpaValue.trim()) && gpaOutOfRange(p);
  const gpaN = parseNum(p.gpaValue);
  const gpa100 =
    gpaInvalid || gpaN == null ? null : gpaTo100(gpaN, p.gpaScale);

  const rankRaw = parsePositiveInt(p.classRank);
  const sizeRaw = parsePositiveInt(p.classSize);
  const rankInvalid = Boolean(
    (p.classRank.trim() || p.classSize.trim()) &&
      (rankRaw == null ||
        sizeRaw == null ||
        (rankRaw != null && sizeRaw != null && rankRaw > sizeRaw)),
  );
  const rankPct =
    !rankInvalid && rankRaw != null && sizeRaw != null
      ? clamp((rankRaw / sizeRaw) * 100, 0.1, 100)
      : null;

  let academics = 42;
  if (gpa100 != null) academics = gpa100 * 0.62;
  if (rankPct != null) {
    const rankScore =
      rankPct <= 5
        ? 96
        : rankPct <= 10
          ? 86
          : rankPct <= 20
            ? 72
            : rankPct <= 30
              ? 62
              : rankPct <= 50
                ? 48
                : 32;
    academics = gpa100 != null ? gpa100 * 0.55 + rankScore * 0.45 : rankScore;
  }
  if (schoolTier === "t0") academics += 8;
  else if (schoolTier === "t1") academics += 4;
  else if (schoolTier === "t3") academics -= 4;
  academics = clamp(academics);

  const flags: SignalFlags = {
    hasPaper: has(all, /論文|paper|journal|研討會|conference|workshop|accepted|接受|投稿|ieee|acm|taai|論文集/),
    firstAuthor: has(all, /第一作者|first author|1st author|共同一作/),
    journal:
      has(all, /sci|ssci|ieee trans|acm trans/) ||
      (has(all, /期刊論文|journal paper|已發表.*期刊/) &&
        !has(all, /無期刊|沒有期刊|尚無期刊/)),
    conference: has(all, /研討會|conference|workshop|oral|口頭|海報|poster|taai/),
    lab:
      has(all, /實驗室|lab|研究助理|ra\b|seminar/) &&
      !has(all, /無實驗室|沒有實驗室|尚無實驗室|no lab/),
    nstc: has(all, /國科會|科技部|nstc|大專生研究|大專生計畫|most\b/),
    github: has(p.github + all, /github\.com|gitlab|開源|open.?source|\bstars\b|commits/),
    strongInternship: has(
      p.internship + all,
      /台積|tsmc|聯發|mediatek|google|microsoft|meta|amazon|中研院|sinica|nvidia|line\b|趨勢|trend micro|htc|intel|apple|tesla/,
    ),
    anyInternship:
      (p.internship.trim().length > 8 &&
        !has(p.internship, /無實習|沒有實習|尚無實習/)) ||
      (has(all, /實習|intern/) && !has(all, /無實習|沒有實習|尚無實習|no intern/)),
    projectSubstance:
      p.project.trim().length >= 24 ||
      has(p.project, /系統|模型|架構|實作|dataset|實驗|accuracy|f1|latency|github/),
    englishMissing: false,
    englishInvalid: false,
    englishStrong: false,
    gpaInvalid,
    rankInvalid,
    rankTop10: rankPct != null && rankPct <= 10,
    gpaStrong: gpa100 != null && gpa100 >= 82,
    gpaWeak: gpa100 != null && gpa100 < 58,
    schoolMismatch:
      Boolean(p.targetSchool.trim()) &&
      matchTier(p.targetSchool, overrides) === "t0" &&
      schoolTier !== "t0" &&
      schoolTier !== "t1",
    deptMismatch: Boolean(
      p.department &&
        p.targetProgram &&
        !p.targetProgram.includes(p.department.replace(/學系|系|研究所/g, "").slice(0, 2)),
    ),
    recStrong: p.recommendation === "strong-3" || p.recommendation === "strong-2",
    recWeak: p.recommendation === "weak" || p.recommendation === "none",
    emptyCore: p.project.trim().length < 8 && p.research.trim().length < 8,
  };

  let research = 28;
  if (p.research.trim().length > 20) research += 14;
  if (p.research.trim().length > 60) research += 8;
  if (flags.lab) research += 12;
  if (flags.nstc) research += 10;
  if (flags.hasPaper) research += 12;
  if (flags.conference) research += 6;
  if (flags.journal) research += 16;
  if (flags.firstAuthor) research += 10;
  if (p.papers.trim().length > 12) research += 6;
  if (!p.research.trim() && !p.papers.trim()) research = 18;
  research = clamp(research);

  let engineering = 30;
  if (flags.projectSubstance) engineering += 18;
  else if (p.project.trim().length > 8) engineering += 8;
  if (flags.github) engineering += 14;
  if (p.github.trim().length > 12) engineering += 6;
  if (flags.strongInternship) engineering += 16;
  else if (flags.anyInternship) engineering += 10;
  if (p.certs.trim().length > 8) engineering += 6;
  if (has(all, /k8s|kubernetes|系統|compiler|os\b|embedded|fpga|cuda|分散式|backend|fullstack/))
    engineering += 6;
  engineering = clamp(engineering);

  const en = scoredEnglish(p);
  const english = en.score;
  flags.englishInvalid = en.invalid;
  flags.englishMissing = en.missing;
  flags.englishStrong = en.strong;

  const letters = recScore(p.recommendation);

  const filled = [
    p.school,
    p.department,
    !gpaInvalid ? p.gpaValue : "",
    p.project,
    p.research,
    p.papers,
    p.github,
    p.internship,
    !en.invalid && !en.missing ? p.englishScore : "",
    p.highlights,
  ].filter((s) => s.trim().length > 0).length;
  const completeness = clamp(28 + filled * 6 + (p.name.trim() ? 4 : 0));

  const bands = {
    academics: toBand(academics),
    research: toBand(research),
    engineering: toBand(engineering),
    english: toBand(english),
    letters: toBand(letters),
    completeness: toBand(completeness),
  };

  return {
    schoolTier,
    targetTier,
    targetBar: bar,
    gpa100,
    rankPct,
    academics,
    research,
    engineering,
    english,
    letters,
    completeness,
    bands,
    flags,
  };
}

function dimValue(s: Signals, d: Dimension): number {
  return s[d];
}

function weakest(s: Signals): Dimension {
  return DIMS.reduce((a, b) => (dimValue(s, b) < dimValue(s, a) ? b : a));
}

function stanceFromScore(score: number): Stance {
  if (score >= 82) return "strong-support";
  if (score >= 70) return "support";
  if (score >= 58) return "hold";
  if (score >= 46) return "lean-against";
  return "oppose";
}

function gpaText(p: Profile) {
  return p.gpaValue ? `${p.gpaValue} / ${p.gpaScale}` : "未填";
}

function rankText(p: Profile, s: Signals) {
  if (s.flags.rankInvalid) return "班排無效";
  if (s.rankPct == null) return "班排未填";
  return `班排 ${p.classRank}/${p.classSize}（約前 ${s.rankPct.toFixed(0)}%）`;
}

function englishText(p: Profile, s?: Signals) {
  const en = scoredEnglish(p);
  if (p.englishType === "none") return "未提供英文成績";
  if (en.invalid) return `${en.label} ${p.englishScore}（分數無效）`;
  if (!p.englishScore.trim()) return `${en.label} 分數未填`;
  return `${en.label} ${p.englishScore}`;
}

function recText(r: RecLetters) {
  switch (r) {
    case "strong-3":
      return "三封強推（申請人自述）";
    case "strong-2":
      return "兩封強推（申請人自述）";
    case "mixed":
      return "推薦信普通／情況不明";
    case "weak":
      return "推薦偏弱";
    case "none":
      return "尚無推薦信";
  }
}

function note(
  text: string,
  field: string,
  kind: EvidenceKind,
  quote?: string,
): CitedNote {
  return { text, evidence: { field, kind, quote: quote ? clipQuote(quote) : undefined } };
}

function buildStrengths(p: Profile, s: Signals, prof: ProfessorDef): CitedNote[] {
  const out: CitedNote[] = [];
  if (s.flags.rankTop10)
    out.push(
      note(
        `${rankText(p, s)}，學業相對位置清楚，不是「分數好看但不知含金量」。`,
        "班排名",
        "stated",
        `${p.classRank}/${p.classSize}`,
      ),
    );
  else if (s.flags.gpaStrong)
    out.push(
      note(`GPA ${gpaText(p)} 屬前段，學業訊號站得住。`, "GPA", "stated", p.gpaValue),
    );
  if (s.schoolTier === "t0")
    out.push(
      note(
        `出身 ${p.school || "T0 學校"}，委員對課程訓練與同儕強度較有預設信任。`,
        "目前學校",
        "inferred",
        p.school,
      ),
    );
  else if (s.schoolTier === "t1" && s.flags.gpaStrong)
    out.push(
      note(
        `${p.school} 搭配前段成績，在 T1 申請池裡是可辨識的穩健案。`,
        "目前學校",
        "inferred",
        p.school,
      ),
    );
  if (s.flags.journal)
    out.push(
      note(
        "已有期刊／SCI 層級產出，研究閉環比多數推甄申請人完整。",
        "論文／研討會",
        "stated",
        clipQuote(p.papers),
      ),
    );
  else if (s.flags.firstAuthor)
    out.push(
      note(
        "有第一作者紀錄，比較能說明「這題是你推的」而不是掛名。",
        "論文／研討會",
        "stated",
        clipQuote(p.papers),
      ),
    );
  else if (s.flags.hasPaper)
    out.push(
      note(
        "已有研討會／論文產出，至少走過一次投稿與修改。",
        "論文／研討會",
        "stated",
        clipQuote(p.papers),
      ),
    );
  if (s.flags.nstc)
    out.push(
      note(
        "有國科會／大專生研究計畫，表示進得了研究節奏，不是臨時補材料。",
        "研究經驗",
        "stated",
        clipQuote(p.research),
      ),
    );
  if (s.flags.lab && prof.id === "b")
    out.push(
      note(
        "實驗室經歷讓你比較不像「純課程型」申請人。",
        "研究經驗",
        "stated",
        clipQuote(p.research),
      ),
    );
  if (s.flags.strongInternship)
    out.push(
      note(
        "實習機構訊號強，產業環境下的交付能力比較可信。",
        "實習",
        "stated",
        clipQuote(p.internship),
      ),
    );
  else if (s.flags.anyInternship && prof.id === "c")
    out.push(
      note("有實習，工程履歷不是空白。", "實習", "stated", clipQuote(p.internship)),
    );
  if (s.flags.github && (prof.id === "c" || prof.id === "e"))
    out.push(
      note(
        "作品集／GitHub 可被點進去查，比只寫『熟悉 Python』有驗證空間。",
        "GitHub／作品集",
        "stated",
        clipQuote(p.github),
      ),
    );
  if (s.flags.projectSubstance)
    out.push(
      note(
        "專題描述有具體問題與作法，不是一句課名帶過。",
        "專題",
        "stated",
        clipQuote(p.project),
      ),
    );
  if (s.flags.englishStrong)
    out.push(
      note(
        `${englishText(p, s)} 過多數實驗室的英文舒適線。`,
        "英文",
        "stated",
        p.englishScore,
      ),
    );
  if (s.flags.recStrong)
    out.push(
      note(
        `${recText(p.recommendation)}，口試前至少不是推薦信事故。`,
        "推薦信情況",
        "stated",
      ),
    );
  if (p.highlights.trim().length > 20 && out.length < 3)
    out.push(
      note(
        "其他亮點有寫，材料完整度比空白申請人高。",
        "其他亮點",
        "stated",
        clipQuote(p.highlights),
      ),
    );
  if (out.length === 0)
    out.push(note("材料有填，但目前還沒有任何一項形成明顯優勢。", "申請檔", "inferred"));
  return pick(out, 4);
}

function buildWeaknesses(p: Profile, s: Signals, prof: ProfessorDef): CitedNote[] {
  const out: CitedNote[] = [];
  if (s.flags.gpaInvalid)
    out.push(note(`GPA ${gpaText(p)} 超出制度範圍，不能當成學業優勢。`, "GPA", "stated", p.gpaValue));
  if (s.flags.rankInvalid)
    out.push(note("班排名／人數無效，學業百分位不計。", "班排名", "stated", `${p.classRank}/${p.classSize}`));
  if (s.flags.englishInvalid)
    out.push(
      note(
        `${englishText(p, s)}，分數無效，不能計入英文優勢。`,
        "英文",
        "stated",
        p.englishScore,
      ),
    );
  if (s.flags.gpaWeak || s.bands.academics === "gap" || s.bands.academics === "weak")
    out.push(
      note(
        `學業訊號偏弱（GPA ${gpaText(p)}，${rankText(p, s)}），在推甄裡會先被拿來卡。`,
        "GPA",
        "stated",
        p.gpaValue,
      ),
    );
  if (s.rankPct != null && s.rankPct > 30 && prof.id === "a")
    out.push(
      note("班排不在前段，林委員這類學業導向審查會直接降溫。", "班排名", "stated", `${p.classRank}/${p.classSize}`),
    );
  if (!s.flags.hasPaper && (prof.id === "b" || prof.id === "e"))
    out.push(
      note(
        "沒有論文／研討會產出，研究閉環停在『有做專題』，潛力只能靠口試賭。",
        "論文／研討會",
        p.papers.trim() ? "stated" : "missing",
        clipQuote(p.papers) ?? "未填",
      ),
    );
  if (!s.flags.lab && !s.flags.nstc && s.research < 50)
    out.push(
      note(
        "研究經歷敘事偏薄，看不出是否進過真正的研究節奏。",
        "研究經驗",
        p.research.trim() ? "stated" : "missing",
        clipQuote(p.research) ?? "未填",
      ),
    );
  if (!s.flags.projectSubstance)
    out.push(
      note(
        "專題寫太短或太空，委員很難判斷你個人貢獻與技術深度。",
        "專題",
        p.project.trim() ? "stated" : "missing",
        clipQuote(p.project) ?? "未填",
      ),
    );
  if (!s.flags.github && prof.id === "c")
    out.push(
      note(
        "缺少可點進去的作品，工程能力只能靠自述，說服力不足。",
        "GitHub／作品集",
        "missing",
      ),
    );
  if (!s.flags.anyInternship && prof.id === "c")
    out.push(note("沒有實習或其他外部交付紀錄，實作優勢建立不起來。", "實習", "missing"));
  if (
    !s.flags.englishInvalid &&
    (s.flags.englishMissing || s.bands.english === "gap" || s.bands.english === "weak")
  )
    out.push(
      note(
        `${englishText(p, s)}，英文會成為吳委員與部分課程的硬風險。`,
        "英文",
        s.flags.englishMissing ? "missing" : "stated",
        p.englishScore || "未填",
      ),
    );
  if (s.flags.recWeak)
    out.push(
      note(
        `${recText(p.recommendation)}，推甄很吃推薦，這會被當成程序風險。`,
        "推薦信情況",
        "stated",
      ),
    );
  if (s.flags.schoolMismatch)
    out.push(
      note(
        `目標所門檻（${p.targetSchool}）相對出身學校跨度大，需要更硬的研究／實作抵銷。`,
        "目標學校",
        "inferred",
        p.targetSchool,
      ),
    );
  if (s.flags.emptyCore)
    out.push(note("專題與研究幾乎空白，這在推甄不是小洞，是主材料缺失。", "專題", "missing"));
  if (s.flags.deptMismatch)
    out.push(
      note(
        "學系與目標所不完全對齊，口試一定會追問轉領域動機與先備。",
        "目標所別",
        "inferred",
        `${p.department} → ${p.targetProgram}`,
      ),
    );

  if (s.flags.hasPaper && !s.flags.firstAuthor)
    out.push(
      note(
        "論文非第一作者，口試會拆『這題是你推的，還是掛名』。",
        "論文／研討會",
        "stated",
        clipQuote(p.papers),
      ),
    );
  if (s.flags.hasPaper && !s.flags.journal && (prof.id === "b" || prof.id === "e"))
    out.push(
      note(
        "產出停在研討會，還沒閉環到期刊，研究完成度仍可被質疑。",
        "論文／研討會",
        "inferred",
        clipQuote(p.papers),
      ),
    );
  if (s.flags.recStrong && (prof.id === "e" || prof.id === "a"))
    out.push(
      note(
        "推薦信強度是申請人自述，模擬無法核對內文，嚴格委員不會把它當硬證據。",
        "推薦信情況",
        "inferred",
      ),
    );
  if (!s.flags.github && prof.id !== "c")
    out.push(
      note("沒有公開作品入口，書面以外的能力只能靠口試現場證明。", "GitHub／作品集", "missing"),
    );
  if (s.flags.englishStrong && !s.flags.journal && prof.id === "d")
    out.push(
      note(
        "英文成績過線，但看不到英文 seminar／論文口語的實際使用紀錄。",
        "英文",
        "inferred",
        p.englishScore,
      ),
    );

  if (out.length === 0) {
    out.push(
      note(
        "沒有明顯事故，但優勢還不夠尖，口試一個洞就會從 Strong 掉到普通支持。",
        "申請檔",
        "inferred",
      ),
    );
  }
  return pick(uniqueNotes(out), 4);
}

function uniqueNotes(items: CitedNote[]): CitedNote[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  });
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function buildRisk(p: Profile, s: Signals, prof: ProfessorDef, weaknesses: CitedNote[]): string {
  if (s.flags.emptyCore)
    return "主材料（專題／研究）近乎空白，口試沒有可以防守的故事。";
  if (s.flags.englishInvalid && prof.id === "d")
    return `${englishText(p, s)}，分數無效，不能當成英文過線。`;
  if (prof.weakestLink) {
    if ((s.flags.englishMissing || s.flags.englishInvalid) && s.flags.recWeak)
      return "英文與推薦信同時缺位，嚴格委員可直接用『程序不完整』擋下。";
    if (s.bands.research === "gap" && s.bands.engineering === "gap")
      return "研究與實作都沒有可驗證產出，學業再好也會被看成考試型申請人。";
    if (!s.flags.firstAuthor && s.flags.hasPaper)
      return "書面很漂亮，但論文貢獻邊界是最容易被我拆穿的點。";
    return "沒有單一致命傷。風險是優點多半是自述，交叉詰問時會露出縫。";
  }
  if (s.flags.schoolMismatch && s.research < 60)
    return `以${p.targetSchool || "高門檻所"}的池子來看，跨校優勢不足，研究又不足以抵銷。`;
  if (s.flags.gpaWeak && prof.id === "a")
    return "學業審查這關過不了，後面的亮點可能根本不會被展開。";
  if ((s.flags.englishMissing || s.flags.englishInvalid) && prof.id === "d")
    return s.flags.englishInvalid
      ? `${englishText(p, s)}。無效分數我會當沒交。`
      : "英文是吳委員的硬門檻，沒有成績就等於請委員會假設你過不了 seminar。";
  if (!s.flags.hasPaper && prof.id === "b" && s.research < 55)
    return "研究潛力只能靠口頭承諾，陳委員這類人最怕收進來後兩年交不出題目。";
  if (prof.id === "a")
    return s.flags.rankTop10
      ? "學業已過線。風險在專題能不能被講成研究問題，否則只是高分申請人。"
      : `學業位置（${rankText(p, s)}）仍可能被拿來跟同屆前段比較。`;
  if (prof.id === "b")
    return s.flags.journal
      ? "有期刊訊號，風險轉成『你能不能獨立定下一題』。"
      : "研究履歷有接觸，但閉環與第一作者不足，口試定題會是主戰場。";
  if (prof.id === "c")
    return s.flags.github || s.flags.projectSubstance
      ? "工程有東西可查。風險是口試一問模組細節，就會知道哪些不是你做的。"
      : "實作無法驗證，這在我這關是主風險。";
  if (prof.id === "d")
    return s.flags.englishStrong
      ? "成績過線，但國際化仍只是考試分數，不是使用證據。"
      : `${englishText(p, s)} 會成為我這票的主要保留理由。`;
  return weaknesses[0]?.text ?? "沒有單一致命傷，但優勢不夠尖，合議會往中間靠。";
}

function buildQuestions(p: Profile, s: Signals, prof: ProfessorDef): string[] {
  const q: string[] = [];
  if (p.project.trim())
    q.push("請把專題系統／方法畫在白板上：問題定義、你的模組、個人貢獻、做不出來的那一段。");
  else q.push("你的大學專題是什麼？如果沒有專題，用哪一件獨立工作證明你能做完一件事？");
  if (s.flags.hasPaper)
    q.push("這篇論文／研討會投稿，哪一個實驗或哪一張圖是你負責的？related work 你讀了哪三篇？");
  else if (prof.id === "b")
    q.push("如果錄取進我實驗室，第一學期你打算把題目收斂到什麼粒度？三年碩士做不做得完？");
  if (s.flags.gpaWeak || (s.rankPct != null && s.rankPct > 25))
    q.push("成績單上有沒有特別弱的科目？那門課後來怎麼補？不要只說『那學期比較忙』。");
  if (s.flags.github) q.push("GitHub 這個 repo 哪些 commit 是你的？我隨機點一個 module 請你講設計取捨。");
  if (s.flags.anyInternship) q.push("實習裡你獨立交付的最小單位是什麼？怎麼驗證它是對的？");
  if (s.flags.englishMissing || !s.flags.englishStrong)
    q.push("本所部分 seminar 與論文是英文，你準備如何在一學期內補到能討論論文的程度？");
  if (prof.id === "e")
    q.push("請自己講這個申請檔最經不起追問的一頁。如果你講不出來，就是我們要追的。");
  if (prof.id === "d")
    q.push("請用兩分鐘英文說明你的研究興趣。不用完美，但要聽得出結構。");
  if (p.targetSchool || p.targetProgram)
    q.push(
      `為什麼是${p.targetSchool || "本所"}${p.targetProgram}，而不是條件相近的其他所？你對齊的實驗室／方向是哪一個？`,
    );
  return pick(q, 5);
}

function buildImprovements(
  p: Profile,
  s: Signals,
  prof: ProfessorDef,
  deadline: ReviewPrefs["deadline"] = "6w",
) {
  return collectAdvice(p, s, { professorId: prof.id, deadline });
}

function buildComment(p: Profile, s: Signals, prof: ProfessorDef, score: number, stance: Stance): string {
  const who = `${p.name.trim() || "申請人"}（${p.school || "學校未填"}／${p.department || "科系未填"}）`;
  const target = `${p.targetSchool || "目標所未填"} ${p.targetProgram}`;
  const stanceLine =
    stance === "strong-support"
      ? "我傾向強烈支持。"
      : stance === "support"
        ? "我支持，但不是無保留。"
        : stance === "hold"
          ? "我保留，口試前不該提前放行。"
          : stance === "lean-against"
            ? "目前偏不支持，除非口試大幅改觀。"
            : "這個材料我不能點頭。";

  if (prof.id === "a") {
    return `${who}，學業面我先看數字：GPA ${gpaText(p)}，${rankText(p, s)}。以${target}這個池子，學業位置${s.flags.gpaStrong || s.flags.rankTop10 ? "算前段" : "不夠亮"}。${s.schoolTier === "t0" || s.schoolTier === "t1" ? "學校訓練我較信任。" : "出身學校不是加分項，成績就要更乾淨。"} 其餘材料我當成加分而非入場券。${stanceLine}`;
  }
  if (prof.id === "b") {
    return `研究潛力我看三件事：有沒有進過lab節奏、有沒有閉環產出、口試能不能定題。本案研究訊號是「${s.bands.research}」（估算）。${s.flags.hasPaper ? "有投稿紀錄是加分。" : "沒有論文不是死刑，但代表我必須在口試聽你把題目講清楚。"} ${s.flags.nstc || s.flags.lab ? "至少不是零研究接觸。" : "目前比較像課程型學生。"} 我收學生是要能推題目的。${stanceLine}`;
  }
  if (prof.id === "c") {
    return `工程上我只信可驗證的東西：專題細節、repo、實習交付。${s.flags.projectSubstance ? "專題有寫到作法，這點過關。" : "專題敘事偏空。"} ${s.flags.github ? "有作品入口。" : "沒有可點的作品。"} ${s.flags.strongInternship ? "實習機構訊號強。" : s.flags.anyInternship ? "有實習，但還要看個人貢獻。" : "沒有外部交付。"} 推甄不是軟體工程招聘，但本所系統／產學案需要能做完的人。${stanceLine}`;
  }
  if (prof.id === "d") {
    return `英文與國際化不是裝飾。本案是 ${englishText(p, s)}，我的判斷是「${s.bands.english}」（估算）。${s.flags.englishInvalid ? "分數無效，我不會把它當過線。" : s.flags.englishStrong ? "這條線過了，我不會用英文擋。" : "這會影響能不能讀論文、寫 related work、去 seminar 開口。"} ${s.flags.journal || s.flags.conference ? "若已有英文投稿，請口試帶去。" : "目前看不出英文學術產出。"} ${stanceLine}`;
  }
  return `我不管故事好不好聽，我找洞。最弱的維度是「${{ academics: "學業", research: "研究", engineering: "實作", english: "英文", letters: "推薦", completeness: "完整度" }[weakest(s)]}」。${s.flags.recWeak ? "推薦信情況偏弱，推甄這點不能裝沒看到。" : ""} ${s.flags.emptyCore ? "主材料空白。" : "有材料，但經不起追問的地方要自己先講。"} 分數 ${Math.round(score)} 只是內部審查強度，不是錄取率。${stanceLine}`;
}

function reviewProfessor(
  p: Profile,
  s: Signals,
  prof: ProfessorDef,
  interviewBonus = 0,
  prefs: ReviewPrefs = DEFAULT_PREFS,
): ProfessorReview {
  let weighted = 0;
  for (const d of DIMS) {
    const scale =
      d === "letters" || d === "completeness" ? 1 : (prefs.dimScale[d] ?? 1);
    weighted += dimValue(s, d) * prof.weights[d] * scale;
  }
  weighted += barAdjust(s.targetBar);
  if (prof.weakestLink) {
    const minDim = Math.min(...DIMS.map((d) => dimValue(s, d)));
    weighted = weighted * 0.68 + minDim * 0.32;
    if (minDim < 40) weighted -= 8;
    if (s.flags.emptyCore) weighted -= 10;
  }
  if (prof.id === "d" && (s.flags.englishMissing || s.flags.englishInvalid))
    weighted -= 12;
  if (prof.id === "a" && (s.flags.gpaWeak || s.flags.gpaInvalid)) weighted -= 10;
  if (prof.id === "b" && s.flags.journal) weighted += 6;
  if (prof.id === "c" && s.flags.strongInternship && s.flags.github) weighted += 5;
  weighted = clamp(weighted * (2 - prof.harshness) + (prof.harshness - 1) * 40, 8, 96);
  weighted = clamp(weighted + interviewBonus);

  const stance = stanceFromScore(weighted);
  const weaknesses = buildWeaknesses(p, s, prof);
  return {
    professorId: prof.id,
    score: Math.round(weighted),
    stance,
    strengths: buildStrengths(p, s, prof),
    weaknesses,
    maxRisk: buildRisk(p, s, prof, weaknesses),
    questions: buildQuestions(p, s, prof),
    comment: buildComment(p, s, prof, weighted, stance),
    improvements: buildImprovements(p, s, prof, prefs.deadline),
  };
}

function voteValue(st: Stance): number {
  switch (st) {
    case "strong-support":
      return 2;
    case "support":
      return 1;
    case "hold":
      return 0;
    case "lean-against":
      return -1;
    case "oppose":
      return -2;
  }
}

function decideVerdict(reviews: ProfessorReview[]): Verdict {
  const vals = reviews.map((r) => voteValue(r.stance));
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const min = Math.min(...vals);
  const strong = reviews.filter((r) => r.stance === "strong-support").length;
  const oppose = reviews.filter((r) => r.stance === "oppose" || r.stance === "lean-against").length;
  const e = reviews.find((r) => r.professorId === "e");

  if (avg >= 1.35 && min >= 0 && strong >= Math.max(1, Math.floor(reviews.length / 2)))
    return e && (e.stance === "hold" || voteValue(e.stance) < 1) ? "admit" : "strong-admit";
  if (avg >= 0.55 && min >= -1 && oppose <= reviews.length / 2) return "admit";
  if (avg >= 0.05) return "borderline";
  if (avg >= -0.85) return "waitlist";
  return "reject";
}

function speakerLine(rev: ProfessorReview, p: Profile, s: Signals): string {
  const prof = professorById(rev.professorId);
  const open =
    rev.stance === "strong-support"
      ? "我給強烈支持。"
      : rev.stance === "support"
        ? "我支持。"
        : rev.stance === "hold"
          ? "我保留。"
          : rev.stance === "lean-against"
            ? "我偏不支持。"
            : "我反對放行。";
  const focus =
    prof.id === "a"
      ? `數字先過過：GPA ${gpaText(p)}，${rankText(p, s)}。`
      : prof.id === "b"
        ? s.flags.hasPaper
          ? "有產出，但我要聽得出這題是他推的。"
          : "研究還停在接觸，不是閉環。"
        : prof.id === "c"
          ? s.flags.github || s.flags.projectSubstance
            ? "工程有入口可查，口試會拆模組。"
            : "實作幾乎無法驗證。"
          : prof.id === "d"
            ? `${englishText(p, s)}。這是我的硬線。`
            : "";
  return `${open}${focus} 主風險：${rev.maxRisk}`;
}

function buildTranscript(
  p: Profile,
  s: Signals,
  reviews: ProfessorReview[],
  verdict: Verdict,
): TranscriptTurn[] {
  const name = p.name.trim() || "申請人";
  const turns: TranscriptTurn[] = [];
  turns.push({
    speaker: `${CHAIR.surname}召集人`,
    role: CHAIR.role,
    text: `開始討論。本案 ${name}，${p.school || "學校未填"} ${p.department || ""}，目標 ${p.targetSchool || ""}${p.targetProgram}。門檻估算為「${s.targetBar === "very-high" ? "極高" : s.targetBar === "high" ? "高" : s.targetBar === "mid" ? "中" : "相對低"}」。請各位依審查人格表示，不要用假精確的錄取率。`,
  });

  for (const r of reviews) {
    const prof = professorById(r.professorId);
    turns.push({
      speaker: `${prof.surname}教授`,
      role: prof.title,
      text: speakerLine(r, p, s),
    });
  }

  const scores = reviews.map((r) => ({ id: r.professorId, v: voteValue(r.stance), r }));
  scores.sort((a, b) => b.v - a.v);
  const high = scores[0];
  const low = scores[scores.length - 1];
  if (high && low && high.id !== low.id && high.v - low.v >= 2) {
    const hp = professorById(high.id);
    const lp = professorById(low.id);
    turns.push({
      speaker: `${hp.surname}教授`,
      role: hp.title,
      text: `我回應${lp.surname}委員：用這個打到「${low.r.stance}」我覺得過嚴。本案不是完美，但${high.r.strengths[0]?.text ?? "優勢還在"}。口試追問可以，不該在書面就否決。`,
    });
    turns.push({
      speaker: `${lp.surname}教授`,
      role: lp.title,
      text: `書面能看的就是這些。${low.r.maxRisk} 這點如果口試也講不圓，放進來是實驗室的成本。我維持原判斷。`,
    });
  }

  const e = reviews.find((r) => r.professorId === "e");
  if (e && voteValue(e.stance) <= 0 && reviews.length > 1) {
    turns.push({
      speaker: `${professorById("e").surname}教授`,
      role: professorById("e").title,
      text: `補充風險清單：${e.weaknesses.slice(0, 2).map((w) => w.text).join("；")}。合議若要放行，至少把口試題目寫進紀錄。`,
    });
  }

  const vLabel =
    verdict === "strong-admit"
      ? "Strong Admit"
      : verdict === "admit"
        ? "Admit"
        : verdict === "borderline"
          ? "Borderline"
          : verdict === "waitlist"
            ? "Waitlist"
            : "Reject";
  turns.push({
    speaker: `${CHAIR.surname}召集人`,
    role: CHAIR.role,
    text: `綜合 ${reviews.length} 位委員，本案合議結果標為 ${vLabel}（${verdictZh(verdict)}）。這是模擬審查，不是真實錄取率預測。委員意見用於找出優勢、弱點與口試風險，不能當成任何一所的官方結果。`,
  });
  return turns;
}

function verdictZh(v: Verdict) {
  switch (v) {
    case "strong-admit":
      return "強烈錄取傾向";
    case "admit":
      return "錄取傾向";
    case "borderline":
      return "邊緣案件";
    case "waitlist":
      return "備取傾向";
    case "reject":
      return "不錄取傾向";
  }
}

function buildSummary(p: Profile, s: Signals, reviews: ProfessorReview[], verdict: Verdict): string {
  const support = reviews.filter((r) => r.stance === "strong-support" || r.stance === "support").length;
  const hold = reviews.filter((r) => r.stance === "hold").length;
  const against = reviews.filter((r) => r.stance === "lean-against" || r.stance === "oppose").length;
  const e = reviews.find((r) => r.professorId === "e");
  return `${p.name.trim() || "申請人"} 面對${p.targetSchool || "目標所"} ${p.targetProgram}（門檻估算：${s.targetBar === "very-high" ? "極高" : s.targetBar === "high" ? "高" : s.targetBar === "mid" ? "中" : "相對低"}）。${reviews.length} 票裡 ${support} 支持、${hold} 保留、${against} 反對。合議標為 ${verdictZh(verdict)}。${e ? "嚴格委員點出的最大風險：" + e.maxRisk : "最大風險：" + (reviews[0]?.maxRisk ?? "")} 請記得：這不是錄取率。`;
}

function buildDissent(reviews: ProfessorReview[]): string | null {
  const against = reviews.filter((r) => r.stance === "oppose" || r.stance === "lean-against" || r.stance === "hold");
  if (against.length === 0) return null;
  const lead = against.sort((a, b) => voteValue(a.stance) - voteValue(b.stance))[0];
  const prof = professorById(lead.professorId);
  return `${prof.surname}教授（${prof.title}）未加入支持：${lead.maxRisk}`;
}

function caseId(p: Profile): string {
  const s = `${p.name}|${p.school}|${p.gpaValue}|${p.targetSchool}|${p.project}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `TW-${(h >>> 0).toString(16).toUpperCase().slice(0, 4)}`;
}

export function runSimulation(
  profile: Profile,
  professorIds: string[],
  opts?: {
    interviewBonus?: number;
    interviewByProfessor?: Record<string, number>;
    prefs?: ReviewPrefs;
  },
): SimulationResult {
  const ids = professorIds.filter((id) => PROFESSORS.some((p) => p.id === id));
  const chosen = (ids.length ? ids : PROFESSORS.map((p) => p.id)).map(professorById);
  const prefs = opts?.prefs ?? DEFAULT_PREFS;
  const signals = extractSignals(profile, prefs);
  const bonus = opts?.interviewBonus ?? 0;
  const byProf = opts?.interviewByProfessor ?? {};
  const reviews = chosen.map((prof) =>
    reviewProfessor(
      profile,
      signals,
      prof,
      bonus + (byProf[prof.id] ?? 0),
      prefs,
    ),
  );
  const verdict = decideVerdict(reviews);
  const committee: CommitteeOutcome = {
    verdict,
    votes: reviews.map((r) => ({ professorId: r.professorId, stance: r.stance })),
    transcript: buildTranscript(profile, signals, reviews, verdict),
    summary: buildSummary(profile, signals, reviews, verdict),
    dissent: buildDissent(reviews),
  };
  return {
    caseId: caseId(profile),
    createdAt: new Date().toISOString(),
    signals,
    reviews,
    committee,
    interviewBonus: bonus,
    interviewByProfessor: byProf,
    prefsUsed: prefs,
  };
}

export function profileReady(p: Profile): { ok: boolean; reason: string } {
  const v = validateProfile(p);
  return { ok: v.ok, reason: v.reason };
}
