import type { Profile } from "./types";

export type MaterialField = "project" | "research" | "papers";

export interface SlotCheck {
  id: "problem" | "method" | "result" | "contrib" | "limit";
  label: string;
  ok: boolean;
}

export interface RewriteDraft {
  field: MaterialField;
  title: string;
  slots: SlotCheck[];
  original: string;
  draft: string;
  missing: string[];
}

const PROJECT_SLOTS: {
  id: SlotCheck["id"];
  label: string;
  re: RegExp;
  prompt: string;
}[] = [
  {
    id: "problem",
    label: "問題",
    re: /問題|任務|要解|偵測|摘要|預測|分類|導航|異常|痛點|辨識/,
    prompt: "（補）這個工作要解決誰的什麼問題。",
  },
  {
    id: "method",
    label: "方法",
    re: /方法|模型|架構|系統|演算法|transformer|autoencoder|stm32|react|pipeline|模組|實驗/i,
    prompt: "（補）用了什麼方法／系統，關鍵模組是哪一塊。",
  },
  {
    id: "result",
    label: "結果",
    re: /\d+(\.\d+)?\s*(%|ms|人|篇)?|rouge|f1|accuracy|延遲|準確|用戶|stars|上線/i,
    prompt: "（補）一個可被追問的數字：準確率、延遲、用戶、或對照實驗。",
  },
  {
    id: "contrib",
    label: "個人貢獻",
    re: /個人|負責|我[寫做負獨]|獨立|自己|commit/,
    prompt: "（補）哪一個模組／實驗／資料工作是你做的，不是整組掛名。",
  },
  {
    id: "limit",
    label: "限制／失敗",
    re: /失敗|做不出|限制|不足|尚未|瓶頸|無法|沒做成|沒跑過/,
    prompt: "（補）哪一段做不出來、後來怎麼處理。空著會被問穿。",
  },
];

function slotsFor(text: string): SlotCheck[] {
  return PROJECT_SLOTS.map((s) => ({
    id: s.id,
    label: s.label,
    ok: s.re.test(text),
  }));
}

function lineFor(text: string, id: SlotCheck["id"], ok: boolean): string {
  const def = PROJECT_SLOTS.find((s) => s.id === id)!;
  if (ok) {
    const clipped = text.trim().replace(/\s+/g, " ");
    const short = clipped.length > 80 ? `${clipped.slice(0, 78)}…` : clipped;
    return `${def.label}：${short}`;
  }
  return `${def.label}：${def.prompt}`;
}

function projectDraft(original: string, slots: SlotCheck[]): string {
  const body = slots
    .map((s) => lineFor(original, s.id, s.ok))
    .join("\n");
  if (!original.trim()) return body;
  return `${body}\n\n原文：${original.trim()}`;
}

function researchDraft(original: string, missingLab: boolean): string {
  const lines = [
    missingLab
      ? "節奏：（補）有無實驗室／RA／固定 meeting。沒有就寫專題如何自訂題。"
      : "節奏：已有實驗室或計畫接觸，口試請準備「你每週實際做什麼」。",
    original.trim()
      ? `主題：${original.trim()}`
      : "主題：（補）題目粒度、你能獨立推進的最小單位。",
    "閉環：（補）產出是筆記、poster、研討會還是期刊。預計投稿不算閉環。",
  ];
  return lines.join("\n");
}

export function rewriteMaterials(p: Profile): RewriteDraft[] {
  const out: RewriteDraft[] = [];

  const projectSlots = slotsFor(p.project);
  const projectMissing = projectSlots.filter((s) => !s.ok).map((s) => s.label);
  if (projectMissing.length > 0 || p.project.trim().length < 24) {
    out.push({
      field: "project",
      title: "專題敘事",
      slots: projectSlots,
      original: p.project,
      draft: projectDraft(p.project, projectSlots),
      missing: projectMissing.length ? projectMissing : ["完整度"],
    });
  }

  const research = p.research.trim();
  const hasLab = /實驗室|lab|研究助理|ra\b|seminar|國科會|nstc/i.test(
    `${p.research} ${p.highlights}`,
  );
  const researchThin = research.length < 36 || !hasLab;
  if (researchThin) {
    const slots: SlotCheck[] = [
      {
        id: "problem",
        label: "研究節奏",
        ok: hasLab,
      },
      {
        id: "method",
        label: "題目粒度",
        ok: research.length >= 36,
      },
      {
        id: "result",
        label: "產出閉環",
        ok: /論文|研討會|poster|期刊/.test(p.papers + p.research),
      },
    ];
    out.push({
      field: "research",
      title: "研究經驗",
      slots,
      original: p.research,
      draft: researchDraft(p.research, !hasLab),
      missing: slots.filter((s) => !s.ok).map((s) => s.label),
    });
  }

  const papers = p.papers.trim();
  const firstAuthor = /第一作者|first author|1st author|共同一作/i.test(papers);
  const hasPaper = /論文|paper|研討會|conference|workshop|ieee|acm|taai|接受|投稿/.test(
    papers,
  );
  if (hasPaper && !firstAuthor) {
    out.push({
      field: "papers",
      title: "論文貢獻邊界",
      slots: [
        { id: "contrib", label: "貢獻邊界", ok: false },
        { id: "result", label: "第幾作者", ok: firstAuthor },
      ],
      original: p.papers,
      draft: `${papers}\n貢獻邊界：（補）哪張圖、哪個實驗、哪段文字是你的；通訊作者是誰。非一作一定會被問。`,
      missing: ["貢獻邊界"],
    });
  }

  return out;
}
