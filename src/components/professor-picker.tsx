import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PREFS,
  DIMENSION_LABEL,
  PROFESSORS,
  profileReady,
  type Dimension,
} from "@/lib/simulator";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

const TILT = [
  { v: 0.7, label: "偏低" },
  { v: 1, label: "預設" },
  { v: 1.3, label: "偏高" },
];

const TILT_DIMS: (keyof typeof DEFAULT_PREFS.dimScale)[] = [
  "academics",
  "research",
  "engineering",
  "english",
];

export function ProfessorPicker() {
  const selected = useCaseStore((s) => s.selectedIds);
  const toggle = useCaseStore((s) => s.toggleProfessor);
  const setSelected = useCaseStore((s) => s.setSelectedIds);
  const setStep = useCaseStore((s) => s.setStep);
  const startReview = useCaseStore((s) => s.startReview);
  const profile = useCaseStore((s) => s.profile);
  const prefs = useCaseStore((s) => s.prefs);
  const setDimScale = useCaseStore((s) => s.setDimScale);
  const setPrefs = useCaseStore((s) => s.setPrefs);
  const ready = profileReady(profile);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl text-fg">選擇審查人格</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          同一份檔案，五種委員各自閱卷。權重公開如下，可再調這所比較看重的維度。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setSelected(PROFESSORS.map((p) => p.id))}
        >
          全選五席
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setSelected(["e"])}
        >
          只留嚴格委員
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PROFESSORS.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "rounded-xl bg-surface p-5 text-left shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 ease-out",
                "hover:shadow-[var(--shadow-border-hover)] active:scale-[0.99]",
                on && "ring-1 ring-accent/50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-surface-2 font-display text-lg text-accent">
                    {p.surname}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg">{p.surname}教授</p>
                    <p className="text-xs text-muted">{p.title}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    on ? "bg-accent text-accent-fg" : "bg-surface-2 text-subtle",
                  )}
                >
                  {on ? <Check className="size-3.5" /> : null}
                </span>
              </div>
              <p className="mt-3 text-xs tracking-wide text-accent">{p.focus}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.blurb}</p>
              <dl className="mt-4 grid grid-cols-4 gap-1">
                {TILT_DIMS.map((d) => {
                  const scale = prefs.dimScale[d];
                  const shown = Math.round(p.weights[d] * scale * 100);
                  return (
                    <div key={d} className="rounded-md bg-surface-2 px-1.5 py-2 text-center">
                      <dt className="text-xs text-subtle">{DIMENSION_LABEL[d as Dimension]}</dt>
                      <dd className="mt-1 font-mono text-xs tabular-nums text-fg">
                        {shown}
                        {scale !== 1 ? (
                          <span className="mt-0.5 block text-xs text-accent">
                            ×{scale}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h3 className="font-display text-lg text-fg">本所較看重</h3>
        <p className="mt-1 text-sm text-muted">
          預設是委員人格權重。調高某一維，所有委員對該訊號更敏感。這是模擬假設。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TILT_DIMS.map((d) => (
            <div key={d}>
              <p className="text-xs text-subtle">{DIMENSION_LABEL[d as Dimension]}</p>
              <div className="mt-2 flex gap-1">
                {TILT.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setDimScale(d, t.v)}
                    className={cn(
                      "min-h-11 flex-1 rounded-md text-sm",
                      prefs.dimScale[d] === t.v
                        ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] ring-1 ring-accent/50"
                        : "bg-surface-2 text-muted",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPrefs({ dimScale: DEFAULT_PREFS.dimScale })}
          >
            重設權重
          </Button>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep("profile")}>
          <ArrowLeft />
          返回檔案
        </Button>
        <Button
          type="button"
          disabled={!ready.ok || selected.length === 0}
          onClick={() => startReview()}
        >
          送交審查
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
