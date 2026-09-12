import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { SignalMeter } from "@/components/signal-meter";
import {
  BAR_LABEL,
  DEADLINE_LABEL,
  DEPT_PRESETS,
  DIMENSION_LABEL,
  ENGLISH_VERSION_OPTIONS,
  PROGRAM_PRESETS,
  SAMPLES,
  SCHOOL_PRESETS,
  TIER_LABEL,
  defaultEnglishVersion,
  extractSignals,
  matchTier,
  validateProfile,
  type Deadline,
  type EnglishType,
  type EnglishVersion,
  type GpaScale,
  type RecLetters,
  type SchoolTier,
} from "@/lib/simulator";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs break-words text-reject" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

const TIERS: SchoolTier[] = ["t0", "t1", "t2", "t3"];

function TierOverride({
  name,
  detected,
}: {
  name: string;
  detected: SchoolTier;
}) {
  const override = useCaseStore((s) => s.prefs.schoolTiers[name]);
  const setSchoolTier = useCaseStore((s) => s.setSchoolTier);
  if (!name.trim()) return null;
  const value = override ?? detected;
  return (
    <div className="sm:col-span-2">
      <p className="text-xs text-subtle">
        校名規則目前歸類為 {TIER_LABEL[detected]}
        {override ? "（已改寫）" : ""}。這是模擬假設，不是官方分級。
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSchoolTier(name, t)}
            className={cn(
              "min-h-11 rounded-md px-3 text-xs shadow-[var(--shadow-border)]",
              value === t
                ? "bg-surface-2 text-fg ring-1 ring-accent/50"
                : "bg-surface-2 text-muted",
            )}
          >
            {t.toUpperCase()}
          </button>
        ))}
        {override ? (
          <button
            type="button"
            onClick={() => setSchoolTier(name, null)}
            className="min-h-11 rounded-md px-3 text-xs text-muted"
          >
            重設
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileForm() {
  const profile = useCaseStore((s) => s.profile);
  const prefs = useCaseStore((s) => s.prefs);
  const patch = useCaseStore((s) => s.patchProfile);
  const setProfile = useCaseStore((s) => s.setProfile);
  const setStep = useCaseStore((s) => s.setStep);
  const setPrefs = useCaseStore((s) => s.setPrefs);
  const startReview = useCaseStore((s) => s.startReview);
  const hasPrior = useCaseStore((s) => Boolean(s.result || s.priorResult));
  const signals = useMemo(
    () => extractSignals(profile, prefs),
    [profile, prefs],
  );
  const check = useMemo(() => validateProfile(profile), [profile]);
  const isBlank = !profile.school && !profile.gpaValue && !profile.name;
  const versionOpts =
    profile.englishType === "none"
      ? []
      : ENGLISH_VERSION_OPTIONS[profile.englishType];
  const schoolDetected = matchTier(profile.school);
  const targetDetected = matchTier(profile.targetSchool);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex flex-col gap-6">
        {isBlank ? (
          <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <h2 className="font-display text-xl text-fg">從一份樣本開始</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              載入案件、看五位委員怎麼打同一份檔，再改成你自己的材料重審。
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="min-h-11 rounded-lg bg-surface-2 px-3 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
                  onClick={() => setProfile(s.profile)}
                >
                  <span className="block text-sm text-fg">{s.label}</span>
                  <span className="mt-1 block text-xs text-subtle">{s.hint}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-fg">
                {profile.name || "未具名申請人"} · {profile.school}{" "}
                {profile.department}
              </p>
              <p className="text-xs text-muted">
                {check.ok
                  ? hasPrior
                    ? "材料改完可直接再審。合議會標出改票與消失的風險。"
                    : "檔案已可送審。可先核對下方材料，或直接進入委員選擇。"
                  : check.reason}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={hasPrior ? "secondary" : "default"}
                disabled={!check.ok}
                onClick={() => setStep("committee")}
              >
                選擇委員
                <ArrowRight />
              </Button>
              {hasPrior ? (
                <Button
                  type="button"
                  disabled={!check.ok}
                  onClick={() => startReview()}
                >
                  用目前材料再審
                </Button>
              ) : null}
            </div>
          </div>
        )}

        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg text-fg">申請人檔案</h2>
          <p className="mt-1 text-sm text-muted">
            寫得越具體，委員評語越能對準你的材料。空白本身也是訊號。
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="姓名（可匿名）">
              <Input
                value={profile.name}
                placeholder="例如 林子安"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="目前學校" hint="可輸入或選常用校名" error={check.errors.school}>
              <Input
                list="school-presets"
                value={profile.school}
                placeholder="國立台灣大學"
                aria-invalid={Boolean(check.errors.school)}
                onChange={(e) => patch({ school: e.target.value })}
              />
              <datalist id="school-presets">
                {SCHOOL_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <TierOverride name={profile.school} detected={schoolDetected} />
            <Field label="科系" error={check.errors.department}>
              <Input
                list="dept-presets"
                value={profile.department}
                placeholder="資訊工程"
                aria-invalid={Boolean(check.errors.department)}
                onChange={(e) => patch({ department: e.target.value })}
              />
              <datalist id="dept-presets">
                {DEPT_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="目標學校">
              <Input
                list="target-school-presets"
                value={profile.targetSchool}
                placeholder="國立成功大學"
                onChange={(e) => patch({ targetSchool: e.target.value })}
              />
              <datalist id="target-school-presets">
                {SCHOOL_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <TierOverride name={profile.targetSchool} detected={targetDetected} />
            <Field label="目標所別" hint="影響門檻估算與口試題">
              <Input
                list="program-presets"
                value={profile.targetProgram}
                placeholder="資訊工程研究所"
                onChange={(e) => patch({ targetProgram: e.target.value })}
              />
              <datalist id="program-presets">
                {PROGRAM_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </div>
        </section>

        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg text-fg">學業</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <Field label="GPA 數字" error={check.errors.gpaValue}>
              <Input
                inputMode="decimal"
                value={profile.gpaValue}
                placeholder="3.85"
                aria-invalid={Boolean(check.errors.gpaValue)}
                onChange={(e) => patch({ gpaValue: e.target.value })}
              />
            </Field>
            <Field label="GPA 制度">
              <SelectNative
                value={profile.gpaScale}
                onChange={(e) => patch({ gpaScale: e.target.value as GpaScale })}
              >
                <option value="4.3">4.3 制</option>
                <option value="4.0">4.0 制</option>
                <option value="100">百分制</option>
              </SelectNative>
            </Field>
            <Field label="班排名" error={check.errors.classRank}>
              <Input
                inputMode="numeric"
                value={profile.classRank}
                placeholder="5"
                aria-invalid={Boolean(check.errors.classRank)}
                onChange={(e) => patch({ classRank: e.target.value })}
              />
            </Field>
            <Field label="班級人數" error={check.errors.classSize}>
              <Input
                inputMode="numeric"
                value={profile.classSize}
                placeholder="58"
                aria-invalid={Boolean(check.errors.classSize)}
                onChange={(e) => patch({ classSize: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg text-fg">英文</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="成績種類">
              <SelectNative
                value={profile.englishType}
                onChange={(e) => {
                  const englishType = e.target.value as EnglishType;
                  patch({
                    englishType,
                    englishVersion: defaultEnglishVersion(englishType),
                    englishScore:
                      englishType === "none" ? "" : profile.englishScore,
                  });
                }}
              >
                <option value="toeic">TOEIC</option>
                <option value="toefl">TOEFL</option>
                <option value="ielts">IELTS</option>
                <option value="gept">GEPT</option>
                <option value="none">沒有英文成績</option>
              </SelectNative>
            </Field>
            <Field
              label="版本"
              hint={
                versionOpts.find((o) => o.id === profile.englishVersion)?.hint
              }
            >
              <SelectNative
                value={profile.englishVersion ?? defaultEnglishVersion(profile.englishType)}
                disabled={profile.englishType === "none"}
                onChange={(e) =>
                  patch({ englishVersion: e.target.value as EnglishVersion })
                }
              >
                {profile.englishType === "none" ? (
                  <option value="none">—</option>
                ) : (
                  versionOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))
                )}
              </SelectNative>
            </Field>
            <Field
              label="分數／級距"
              hint={
                profile.englishType === "gept"
                  ? "可填中高級、高級，或 0–100"
                  : undefined
              }
              error={check.errors.englishScore}
            >
              <Input
                value={profile.englishScore}
                placeholder={
                  profile.englishType === "gept"
                    ? "中高級"
                    : profile.englishType === "ielts"
                      ? "6.5"
                      : "800"
                }
                disabled={profile.englishType === "none"}
                aria-invalid={Boolean(check.errors.englishScore)}
                onChange={(e) => patch({ englishScore: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg text-fg">研究、專題與產出</h2>
          <div className="mt-5 grid gap-4">
            <Field
              label="專題"
              hint="問題、方法、結果、你的貢獻。空著會被當成主材料缺失。"
            >
              <Textarea
                rows={4}
                value={profile.project}
                placeholder="例如：以 Transformer 做中文新聞摘要，ROUGE-L 41.8，個人負責資料與實驗。"
                onChange={(e) => patch({ project: e.target.value })}
              />
            </Field>
            <Field label="研究經驗">
              <Textarea
                rows={3}
                value={profile.research}
                placeholder="實驗室、國科會大專生計畫、RA、seminar 頻率…"
                onChange={(e) => patch({ research: e.target.value })}
              />
            </Field>
            <Field label="論文／研討會">
              <Textarea
                rows={3}
                value={profile.papers}
                placeholder="TAAI 2025 口頭（第二作者）；無期刊。"
                onChange={(e) => patch({ papers: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg text-fg">實作、實習與推薦</h2>
          <div className="mt-5 grid gap-4">
            <Field label="GitHub／作品集">
              <Textarea
                rows={3}
                value={profile.github}
                placeholder="github.com/you — 哪些 repo、是否開源、個人 commit。"
                onChange={(e) => patch({ github: e.target.value })}
              />
            </Field>
            <Field label="實習">
              <Textarea
                rows={3}
                value={profile.internship}
                placeholder="機構、期間、你獨立交付的最小單位。"
                onChange={(e) => patch({ internship: e.target.value })}
              />
            </Field>
            <Field label="證照">
              <Input
                value={profile.certs}
                placeholder="可留空。證照通常不是主訊號。"
                onChange={(e) => patch({ certs: e.target.value })}
              />
            </Field>
            <Field
              label="推薦信情況"
              hint="模擬無法驗證真實推薦內容，只處理你提供的情況。"
            >
              <SelectNative
                value={profile.recommendation}
                onChange={(e) =>
                  patch({ recommendation: e.target.value as RecLetters })
                }
              >
                <option value="strong-3">三封強推（自述）</option>
                <option value="strong-2">兩封強推（自述）</option>
                <option value="mixed">有推薦，強度普通／不明</option>
                <option value="weak">偏弱、或不熟的老師</option>
                <option value="none">尚未確認</option>
              </SelectNative>
            </Field>
            <Field label="其他亮點">
              <Textarea
                rows={3}
                value={profile.highlights}
                placeholder="助教、競賽、對齊的實驗室、特殊經歷。"
                onChange={(e) => patch({ highlights: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle">
            {check.ok
              ? hasPrior
                ? "改完可直接再審，或先調整委員與權重。"
                : "檔案可送審。下一步選擇委員與審查假設。"
              : check.reason}
          </p>
          <div className="flex flex-wrap gap-2">
            {hasPrior ? (
              <Button
                type="button"
                disabled={!check.ok}
                onClick={() => startReview()}
              >
                用目前材料再審
              </Button>
            ) : null}
            <Button
              type="button"
              variant={hasPrior ? "secondary" : "default"}
              disabled={!check.ok}
              onClick={() => setStep("committee")}
            >
              {hasPrior ? "調整委員" : "下一步：選擇委員"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] xl:sticky xl:top-24">
        <p className="text-xs font-medium tracking-wide text-subtle">
          即時訊號 · 估算
        </p>
        <p className="mt-1 text-xs text-muted">
          出身 {TIER_LABEL[signals.schoolTier]} · 目標門檻{" "}
          {BAR_LABEL[signals.targetBar]}
        </p>
        {signals.flags.englishInvalid ? (
          <p className="mt-2 text-xs text-reject">英文：分數無效，不計正面訊號</p>
        ) : null}
        {signals.flags.gpaInvalid ? (
          <p className="mt-2 text-xs text-reject">GPA：超出制度範圍，不計正面訊號</p>
        ) : null}
        {signals.flags.rankInvalid ? (
          <p className="mt-2 text-xs text-reject">班排：無效，百分位不計</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-3">
          {(
            [
              "academics",
              "research",
              "engineering",
              "english",
              "letters",
              "completeness",
            ] as const
          ).map((d) => (
            <SignalMeter
              key={d}
              label={DIMENSION_LABEL[d]}
              band={signals.bands[d]}
              warn={
                (d === "english" && signals.flags.englishInvalid) ||
                (d === "academics" && signals.flags.gpaInvalid)
              }
            />
          ))}
        </div>
        <div className="mt-5">
          <p className="text-xs font-medium tracking-wide text-subtle">距截止</p>
          <div className="mt-2 flex flex-col gap-1">
            {(["2w", "6w", "term"] as Deadline[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPrefs({ deadline: d })}
                className={cn(
                  "min-h-11 rounded-md px-3 text-left text-sm",
                  prefs.deadline === d
                    ? "bg-surface-2 text-fg shadow-[var(--shadow-border)]"
                    : "text-muted hover:bg-surface-2/60",
                )}
              >
                {DEADLINE_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-subtle">
          五格為粗分帶，不是分數、也不是錄取率。無效欄位不會加成。
        </p>
      </aside>
    </div>
  );
}
