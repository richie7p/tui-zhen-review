import type {
  Deadline,
  Horizon,
  Improvement,
  Profile,
  Signals,
} from "./types";

const HORIZON_ORDER: Record<Horizon, number> = { "2w": 0, "6w": 1, term: 2 };
const COST_ORDER = { low: 0, mid: 1, high: 2 };

function pushUnique(out: Improvement[], item: Improvement) {
  if (out.some((x) => x.text === item.text)) return;
  out.push(item);
}

export function collectAdvice(
  p: Profile,
  s: Signals,
  opts?: { professorId?: string; deadline?: Deadline },
): Improvement[] {
  const out: Improvement[] = [];
  const prof = opts?.professorId;
  const deadline = opts?.deadline ?? "6w";

  if (s.flags.emptyCore) {
    pushUnique(out, {
      text: "先把專題寫成一頁：問題、方法、結果、你的貢獻、失敗過什麼。",
      horizon: "2w",
      cost: "low",
      why: "主材料空白，投稿或進實驗室都還太早",
    });
  } else if (!s.flags.projectSubstance) {
    pushUnique(out, {
      text: "把專題補成可被追問的敘事：模組邊界、個人 commit、做不出來的那段。",
      horizon: "2w",
      cost: "low",
      why: "專題還不夠具體，委員無法判斷貢獻",
    });
  } else {
    pushUnique(out, {
      text: "準備 8 分鐘專題白板：問題、方法、結果、限制。比再堆證照有效。",
      horizon: "2w",
      cost: "low",
      why: "專題已有骨幹，口試準備成本最低",
    });
  }

  if (s.flags.englishInvalid) {
    pushUnique(out, {
      text: "先把英文分數改成該考試版本的有效區間，無效數字不會被當成優勢。",
      horizon: "2w",
      cost: "low",
      why: "目前英文成績格式無效",
    });
  } else if (s.flags.englishMissing || s.english < 66) {
    pushUnique(out, {
      text: "報名最近一場 TOEIC 聽讀或 TOEFL iBT，先讓英文不再是空欄。",
      horizon: "2w",
      cost: "mid",
      why: "英文缺漏會被吳委員當硬門檻",
    });
    pushUnique(out, {
      text: "英文穩在 TOEIC 聽讀 800 或 TOEFL 90，並用英文講一次專題。",
      horizon: "6w",
      cost: "mid",
      why: "成績過線後，還要有使用證據",
    });
  }

  if (!s.flags.github && (prof === "c" || !prof)) {
    pushUnique(out, {
      text: "整理 1 個可 clone 的 repo：README、結果圖、清楚的個人 commit。",
      horizon: "2w",
      cost: "low",
      why: "實作目前只能靠自述",
    });
  }

  if (s.flags.hasPaper && !s.flags.firstAuthor) {
    pushUnique(out, {
      text: "把現有論文的貢獻寫成三句：哪張圖、哪個實驗、哪段文字是你的。",
      horizon: "2w",
      cost: "low",
      why: "已有產出，先釐清貢獻比再趕一篇划算",
    });
  }

  const researchReady =
    s.flags.projectSubstance && (s.flags.lab || s.flags.nstc);

  if (!s.flags.hasPaper && (prof === "b" || prof === "e" || !prof)) {
    if (researchReady) {
      pushUnique(out, {
        text: "專題已有方法與結果，投一場國內 workshop／poster 才划算。",
        horizon: "6w",
        cost: "mid",
        why: "已有可被追問的實驗閉環",
      });
    } else {
      pushUnique(out, {
        text: "先把專題收到可驗證的結果，現在趕論文成本太高、也撐不住口試。",
        horizon: "2w",
        cost: "low",
        why: "研究產出尚未成熟，不建議先投稿",
      });
    }
  }

  if (!s.flags.lab && !s.flags.nstc) {
    pushUnique(out, {
      text: "進實驗室當 RA／專題生至少一學期，讓推薦人寫得出研究節奏。",
      horizon: "term",
      cost: "high",
      why: "研究節奏不是兩週補得完的",
    });
  }

  if (s.flags.gpaWeak || (s.rankPct != null && s.rankPct > 20)) {
    pushUnique(out, {
      text: "學業弱項無法重考就不要藏：用後續課程、專題量化結果把故事改成後期拉起來。",
      horizon: "2w",
      cost: "low",
      why: "成績單改不了，只能改敘事與證據",
    });
  }

  if (!s.flags.anyInternship && prof === "c") {
    pushUnique(out, {
      text: "補一段可驗證的外部交付：實習、開源 PR、或與老師的系統原型。",
      horizon: "6w",
      cost: "mid",
      why: "張委員要看書面以外的交付",
    });
  }

  if (s.flags.recWeak) {
    pushUnique(out, {
      text: "找真的指導過你的老師寫『你解決過什麼問題』，不要遠距掛名推薦。",
      horizon: "6w",
      cost: "mid",
      why: "推薦信偏弱是程序風險",
    });
  }

  if (s.flags.schoolMismatch) {
    pushUnique(out, {
      text: "跨校要對齊實驗室：點名老師、讀三篇近作、寫你能接上的前置。",
      horizon: "2w",
      cost: "low",
      why: "目標所門檻高於出身學校的預設信任",
    });
  }

  if (out.length < 3) {
    pushUnique(out, {
      text: "找一位委員風格的老師，把專題當口試練一次。",
      horizon: "2w",
      cost: "low",
      why: "補強清單已短，口試練習是最低成本",
    });
  }

  return sortAdvice(out, deadline).slice(0, 5);
}

export function sortAdvice(
  items: Improvement[],
  deadline: Deadline,
): Improvement[] {
  const cap: Horizon = deadline === "2w" ? "2w" : deadline === "6w" ? "6w" : "term";
  return [...items]
    .filter((item) => {
      if (cap === "2w") return item.horizon === "2w" || item.cost === "low";
      if (cap === "6w") return item.horizon !== "term" || item.cost !== "high";
      return true;
    })
    .sort(
      (a, b) =>
        HORIZON_ORDER[a.horizon] - HORIZON_ORDER[b.horizon] ||
        COST_ORDER[a.cost] - COST_ORDER[b.cost],
    );
}

export function planFromAdvice(items: Improvement[]): {
  weeks2: Improvement[];
  weeks6: Improvement[];
} {
  return {
    weeks2: items.filter((i) => i.horizon === "2w").slice(0, 3),
    weeks6: items.filter((i) => i.horizon !== "2w").slice(0, 3),
  };
}
