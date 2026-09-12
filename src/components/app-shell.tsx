import { useEffect, useState } from "react";
import { ChevronDown, FileText, RotateCcw, Scale, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLES, type Step } from "@/lib/simulator";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: "profile", label: "申請檔", hint: "材料" },
  { id: "committee", label: "委員", hint: "人格" },
  { id: "reviews", label: "個別審查", hint: "閱卷" },
  { id: "session", label: "合議", hint: "裁決" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const step = useCaseStore((s) => s.step);
  const setStep = useCaseStore((s) => s.setStep);
  const result = useCaseStore((s) => s.result);
  const reset = useCaseStore((s) => s.reset);
  const setProfile = useCaseStore((s) => s.setProfile);
  const profile = useCaseStore((s) => s.profile);
  const [sampleOpen, setSampleOpen] = useState(false);

  useEffect(() => {
    if (!sampleOpen) return;
    const onDoc = () => setSampleOpen(false);
    window.addEventListener("click", onDoc);
    return () => window.removeEventListener("click", onDoc);
  }, [sampleOpen]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-accent shadow-[var(--shadow-border)]">
              <Scale className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg leading-tight text-fg">
                推甄審查室
              </p>
              <p className="truncate text-xs text-subtle">
                研究所推甄模擬器 · Admissions Board
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSampleOpen((v) => !v)}
              >
                載入樣本
                <ChevronDown className="size-3.5" />
              </Button>
              {sampleOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg bg-surface-2 p-1 shadow-[var(--shadow-border)]">
                  {SAMPLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="flex w-full flex-col rounded-md px-3 py-2.5 text-left hover:bg-surface"
                      onClick={() => {
                        setProfile(s.profile);
                        setStep("profile");
                        setSampleOpen(false);
                      }}
                    >
                      <span className="text-sm text-fg">{s.label}</span>
                      <span className="text-xs text-subtle">{s.hint}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="新案件"
              onClick={() => reset()}
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">新案件</span>
            </Button>
          </div>
        </div>
        <div className="border-t border-border bg-surface-2/60">
          <p className="mx-auto max-w-6xl px-4 py-2 text-xs text-muted sm:px-6">
            這是模擬審查，不是真實錄取率預測。訊號與裁決皆為估算，不能代表任何學校的官方結果。
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto lg:sticky lg:top-28 lg:h-fit lg:flex-col lg:overflow-visible">
          {STEPS.map((item, i) => {
            const locked =
              (item.id === "reviews" || item.id === "session") && !result;
            const active = item.id === step;
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => setStep(item.id)}
                className={cn(
                  "flex min-h-11 min-w-36 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 lg:min-w-0 lg:w-full",
                  active ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted hover:bg-surface/60",
                  locked && "opacity-40",
                )}
              >
                <span className="flex size-6 items-center justify-center rounded-sm bg-surface-2 font-mono text-xs tabular-nums text-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm">{item.label}</span>
                  <span className="hidden text-xs text-subtle lg:block">{item.hint}</span>
                </span>
              </button>
            );
          })}
          <div className="mt-4 hidden rounded-lg bg-surface p-3 shadow-[var(--shadow-border)] lg:block">
            <p className="flex items-center gap-2 text-xs text-subtle">
              <FileText className="size-3.5" />
              本案摘要
            </p>
            <p className="mt-2 truncate text-sm text-fg">
              {profile.name || "未具名申請人"}
            </p>
            <p className="truncate text-xs text-muted">
              {profile.school || "學校未填"} {profile.department}
            </p>
            <p className="mt-2 truncate text-xs text-subtle">
              目標 {profile.targetSchool || "—"} {profile.targetProgram}
            </p>
            {result ? (
              <p className="mt-2 font-mono text-xs text-accent">{result.caseId}</p>
            ) : null}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle">
              <Users className="size-3.5" />
              步驟 {stepIndex + 1} / {STEPS.length}
            </p>
          </div>
        </nav>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
