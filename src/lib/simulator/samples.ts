import type { Profile } from "./types";
import { EMPTY_PROFILE } from "./types";

export interface SampleCase {
  id: string;
  label: string;
  hint: string;
  profile: Profile;
}

export const SAMPLES: SampleCase[] = [
  {
    id: "strong",
    label: "台大資工 · 前段學業",
    hint: "學業與實習都強，研究產出中等",
    profile: {
      ...EMPTY_PROFILE,
      name: "林子安",
      school: "國立台灣大學",
      department: "資訊工程",
      targetSchool: "國立台灣大學",
      targetProgram: "資訊工程研究所",
      gpaValue: "4.12",
      gpaScale: "4.3",
      classRank: "3",
      classSize: "62",
      englishType: "toeic",
      englishScore: "915",
      project:
        "專題：以 Transformer 做中文新聞摘要。自建 12 萬篇語料、對比 BART／本模型，ROUGE-L 41.8。個人負責資料管線與 decoding 實驗。指導教授王○。GitHub 公開 repo。",
      research:
        "大三起進入 NLP 實驗室一年，參與國科會大專生研究計畫（主題：低資源摘要）。每週 seminar、協助學長姐 annotation pipeline。",
      papers: "TAAI 2025 口頭一篇（第二作者，指導教授為通訊作者）。無期刊。",
      certs: "TOEIC 915；Google Data Analytics（補充）",
      github: "github.com/tzu-an-lin — 摘要專題 repo、兩個 course compiler homework 整理成可跑範例。",
      internship: "台積電 IT 暑期實習（2025），維護內部資料校驗服務，獨立交付一個批次對帳模組並寫監控。",
      recommendation: "strong-3",
      highlights: "程式競賽校內前 8；擔任演算法課助教一學期。",
    },
  },
  {
    id: "builder",
    label: "逢甲資工 · 實作強",
    hint: "作品與開源明顯，學業與論文較薄",
    profile: {
      ...EMPTY_PROFILE,
      name: "陳嘉惠",
      school: "逢甲大學",
      department: "資訊工程",
      targetSchool: "國立成功大學",
      targetProgram: "資訊工程研究所",
      gpaValue: "3.41",
      gpaScale: "4.0",
      classRank: "12",
      classSize: "48",
      englishType: "toeic",
      englishScore: "750",
      project:
        "專題：校園即時車位與導航 App（React Native + Go）。上線後日活用戶約 400。個人寫 backend、車牌辨識模組與部署。",
      research: "無實驗室；專題偏工程產品，沒有研究問題定義。",
      papers: "無。",
      certs: "AWS Cloud Practitioner；TOEIC 750",
      github:
        "github.com/chia-hui — 車位 App 開源、自幹的 tiny-load-balancer（stars 80+）、數個 PR 到開源 RSS reader。",
      internship: "新創後端實習八個月，負責付款 webhook 與故障 replay。沒有大廠品牌。",
      recommendation: "strong-2",
      highlights: "黑客松佳作；獨立接過兩個校內系統維護案。",
    },
  },
  {
    id: "research",
    label: "成大電機 · 研究強英文缺",
    hint: "計畫與研討會有，英文成績空白",
    profile: {
      ...EMPTY_PROFILE,
      name: "黃士傑",
      school: "國立成功大學",
      department: "電機工程",
      targetSchool: "國立清華大學",
      targetProgram: "電機工程研究所",
      gpaValue: "3.91",
      gpaScale: "4.3",
      classRank: "8",
      classSize: "90",
      englishType: "none",
      englishScore: "",
      project: "專題：嵌入式異常偵測，於 STM32 上跑小型 autoencoder，延遲 < 12ms。",
      research:
        "國科會大專生研究計畫一年，主題為工業感測之輕量異常偵測。實驗室 RA 兩學期，跟教授 meeting 固定。",
      papers: "IEEE ICASI 2025 口頭（第二作者）。預計整理成期刊，尚未投稿。",
      certs: "無特別證照。",
      github: "實驗 code 在實驗室 GitLab，未公開。",
      internship: "無實習。",
      recommendation: "strong-2",
      highlights: "希望轉往邊緣 AI 實驗室；已讀過指導教授近三年三篇論文。",
    },
  },
];
