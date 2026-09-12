import { useEffect, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { AfterBoard } from "@/components/after-board";
import { ReviewDiff } from "@/components/review-diff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  professorById,
  STANCE_LABEL,
  VERDICT_LABEL,
  VERDICT_ZH,
} from "@/lib/simulator";
import { stanceVariant, verdictTextClass, verdictVariant } from "@/lib/simulator/format";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

export function CommitteeSession() {
  const result = useCaseStore((s) => s.result);
  const setStep = useCaseStore((s) => s.setStep);
  const [shown, setShown] = useState(1);
  const [playedCase, setPlayedCase] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    const total = result.committee.transcript.length;
    if (playedCase === result.caseId) {
      setShown(total);
      return;
    }
    setShown(1);
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n + 1 >= total) {
          window.clearInterval(id);
          setPlayedCase(result.caseId);
          return total;
        }
        return n + 1;
      });
    }, 420);
    return () => window.clearInterval(id);
  }, [result, playedCase]);

  if (!result) {
    return (
      <div className="rounded-xl bg-surface p-8 text-sm text-muted shadow-[var(--shadow-border)]">
        尚無合議紀錄。
      </div>
    );
  }

  const { committee } = result;
  const total = committee.transcript.length;
  const done = shown >= total;
  const support = committee.votes.filter(
    (v) => v.stance === "strong-support" || v.stance === "support",
  ).length;
  const hold = committee.votes.filter((v) => v.stance === "hold").length;
  const against = committee.votes.length - support - hold;
  const interviewMark =
    (result.interviewBonus ?? 0) +
    Object.values(result.interviewByProfessor ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl text-fg">招生委員會</h2>
            <p className="mt-1 text-sm text-muted">
              委員依序發言。這是模擬合議紀錄，不是任何學校的真實會議。
            </p>
          </div>
          {!done ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShown(total);
                setPlayedCase(result.caseId);
              }}
            >
              顯示全部發言
            </Button>
          ) : null}
        </div>
        <ol className="flex flex-col gap-3">
          {committee.transcript.slice(0, shown).map((turn, i) => (
            <li
              key={`${turn.speaker}-${i}`}
              className="enter-up rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-fg">{turn.speaker}</p>
                <p className="text-xs text-subtle">{turn.role}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{turn.text}</p>
            </li>
          ))}
        </ol>
        {!done ? (
          <p className="text-xs text-subtle">委員發言中…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("reviews")}
              >
                <ArrowLeft />
                返回個別審查
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("profile")}
              >
                <RotateCcw />
                調整檔案再審一次
              </Button>
            </div>
          </>
        )}
      </div>

      <aside className="h-fit xl:sticky xl:top-24">
        <div
          key={result.createdAt}
          className={cn(
            "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
            done && "stamp-in",
          )}
        >
          <p className="text-xs font-medium tracking-wide text-subtle">模擬裁決</p>
          <p
            className={cn(
              "mt-3 font-display text-3xl tracking-tight",
              verdictTextClass(committee.verdict),
            )}
          >
            {VERDICT_LABEL[committee.verdict]}
          </p>
          <p className="mt-1 text-sm text-muted">{VERDICT_ZH[committee.verdict]}</p>
          <Badge className="mt-3" variant={verdictVariant(committee.verdict)}>
            非真實錄取預測
          </Badge>
          {interviewMark > 0 ? (
            <p className="mt-3 text-xs text-accent">本案含口試加權（估算）</p>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <VoteStat label="支持" value={support} />
            <VoteStat label="保留" value={hold} />
            <VoteStat label="反對" value={against} />
          </div>
          <ul className="mt-5 flex flex-col gap-2">
            {committee.votes.map((v) => {
              const prof = professorById(v.professorId);
              return (
                <li
                  key={v.professorId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-muted">
                    {prof.surname}教授
                    <span className="ml-1 text-xs text-subtle">{prof.title}</span>
                  </span>
                  <Badge variant={stanceVariant(v.stance)}>
                    {STANCE_LABEL[v.stance]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
        {done ? (
          <div className="mt-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <p className="text-xs font-medium tracking-wide text-subtle">合議摘要</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {committee.summary}
            </p>
            {committee.dissent ? (
              <p className="mt-3 text-sm text-hold">{committee.dissent}</p>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
    {done ? (
      <div className="flex flex-col gap-4">
        <ReviewDiff />
        <AfterBoard />
      </div>
    ) : null}
    </div>
  );
}

function VoteStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-3">
      <p className="font-display text-xl tabular-nums text-fg">{value}</p>
      <p className="text-xs text-subtle">{label}</p>
    </div>
  );
}
