import type { ProfessorDef, SchoolTier } from "./types";

export const SCHOOL_TIERS: { tier: SchoolTier; aliases: string[] }[] = [
  {
    tier: "t0",
    aliases: [
      "台大",
      "台灣大學",
      "台湾大学",
      "ntu",
      "national taiwan university",
      "清大",
      "清華",
      "清华",
      "nthu",
      "陽明交大",
      "陽明交通",
      "阳明交大",
      "交通大學",
      "交通",
      "交大",
      "nycu",
      "nctu",
    ],
  },
  {
    tier: "t1",
    aliases: [
      "成大",
      "成功大學",
      "成功大学",
      "ncku",
      "政大",
      "政治大學",
      "nccu",
      "中央",
      "中央大學",
      "ncu",
      "中山",
      "中山大學",
      "nsysu",
      "台科大",
      "台灣科技",
      "台湾科技",
      "ntust",
      "北科大",
      "台北科技",
      "ntut",
      "台師大",
      "師大",
      "師範",
      "ntnu",
      "中興",
      "興大",
      "nchu",
      "台北大學",
      "北大",
      "ntpu",
    ],
  },
  {
    tier: "t2",
    aliases: [
      "中正",
      "ccu",
      "中原",
      "cycu",
      "淡江",
      "tku",
      "逢甲",
      "fcu",
      "元智",
      "yzu",
      "義守",
      "isu",
      "高雄大學",
      "nuk",
      "嘉義",
      "ncyu",
      "海洋",
      "ntou",
      "台北教育",
      "ntue",
      "東華",
      "ndhu",
      "暨南",
      "ncnu",
      "輔大",
      "輔仁",
      "fju",
      "世新",
      "文化",
      "靜宜",
      "東海",
      "thu",
      "高科大",
      "nkust",
      "雲科大",
      "yuntech",
    ],
  },
];

export const SCHOOL_PRESETS = [
  "國立台灣大學",
  "國立清華大學",
  "國立陽明交通大學",
  "國立成功大學",
  "國立政治大學",
  "國立中央大學",
  "國立中山大學",
  "國立台灣科技大學",
  "國立台北科技大學",
  "國立台灣師範大學",
  "國立中興大學",
  "國立台北大學",
  "國立中正大學",
  "中原大學",
  "淡江大學",
  "逢甲大學",
  "元智大學",
  "義守大學",
];

export const DEPT_PRESETS = [
  "資訊工程",
  "資訊管理",
  "電機工程",
  "電子工程",
  "資訊工程學系",
  "資訊管理學系",
  "人工智慧",
  "數據科學",
  "應用數學",
  "統計",
  "工業工程",
  "通訊工程",
];

export const PROGRAM_PRESETS = [
  "資訊工程研究所",
  "資訊管理研究所",
  "電機工程研究所",
  "人工智慧研究所",
  "數據科學研究所",
  "資訊網路與多媒體研究所",
  "電信工程研究所",
  "工業工程研究所",
];

export const PROFESSORS: ProfessorDef[] = [
  {
    id: "a",
    surname: "林",
    title: "學業審查",
    focus: "GPA / 班排名",
    blurb:
      "先看成績單與班排，再決定要不要認真看其餘材料。認為學業位置是推甄最穩的訊號。",
    weights: {
      academics: 0.48,
      research: 0.12,
      engineering: 0.12,
      english: 0.1,
      letters: 0.13,
      completeness: 0.05,
    },
    harshness: 1,
    weakestLink: false,
  },
  {
    id: "b",
    surname: "陳",
    title: "研究潛力",
    focus: "定題 / 論文閉環",
    blurb:
      "實驗室主持人。在找能獨立推進題目的人，成績只是入場券，怕收進只會考試的學生。",
    weights: {
      academics: 0.14,
      research: 0.48,
      engineering: 0.12,
      english: 0.1,
      letters: 0.12,
      completeness: 0.04,
    },
    harshness: 1.05,
    weakestLink: false,
  },
  {
    id: "c",
    surname: "張",
    title: "工程實作",
    focus: "專題 / 實習 / 作品",
    blurb:
      "系統與產學案很多。想確認你能把東西做完、做對、講清楚，而不是只會投影片。",
    weights: {
      academics: 0.14,
      research: 0.14,
      engineering: 0.48,
      english: 0.08,
      letters: 0.1,
      completeness: 0.06,
    },
    harshness: 1,
    weakestLink: false,
  },
  {
    id: "d",
    surname: "吳",
    title: "英文與國際化",
    focus: "英文門檻 / 表達",
    blurb:
      "常送學生出國、接英文論文。Seminar 與文獻是英文的，這條線過不了會直接卡住。",
    weights: {
      academics: 0.16,
      research: 0.18,
      engineering: 0.1,
      english: 0.42,
      letters: 0.1,
      completeness: 0.04,
    },
    harshness: 1.08,
    weakestLink: false,
  },
  {
    id: "e",
    surname: "黃",
    title: "嚴格審查",
    focus: "專門挑弱點",
    blurb:
      "專門找洞。一份漂亮申請書在他手上會被拆成風險清單，弱項不過線就不會給強支持。",
    weights: {
      academics: 0.2,
      research: 0.2,
      engineering: 0.18,
      english: 0.16,
      letters: 0.16,
      completeness: 0.1,
    },
    harshness: 1.22,
    weakestLink: true,
  },
];

export const CHAIR = {
  surname: "何",
  title: "召集人",
  role: "招生委員會主席",
};

export function matchTier(
  name: string,
  overrides?: Record<string, SchoolTier>,
): SchoolTier {
  const raw = name.trim();
  if (raw && overrides?.[raw]) return overrides[raw];
  const n = raw.toLowerCase().replace(/\s+/g, "");
  if (!n) return "t3";
  for (const group of SCHOOL_TIERS) {
    if (group.aliases.some((alias) => n.includes(alias.toLowerCase()))) {
      return group.tier;
    }
  }
  return "t3";
}

export function professorById(id: string): ProfessorDef {
  const found = PROFESSORS.find((p) => p.id === id);
  if (!found) throw new Error(`未知委員：${id}`);
  return found;
}
