import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { ReviewDiff } from "@/components/review-diff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  COST_LABEL,
  EVIDENCE_LABEL,
  HORIZON_LABEL,
  professorById,
  STANCE_LABEL,
} from "@/lib/simulator";
import {
  asImprovements,
  asNotes,
  evidenceVariant,
  stanceVariant,
} from "@/lib/simulator/format";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

export function ReviewBoard() {
  const result = useCaseStore((s) => s.result);
  const setStep = useCaseStore((s) => s.setStep);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!result) {
    return (
      <div className="rounded-xl bg-surface p-8 text-sm text-muted shadow-[var(--shadow-border)]">
        尚無審查結果。請先送交檔案。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-fg">個別審查</h2>
          <p className="mt-1 text-sm text-muted">
            案件 {result.caseId} · 點開委員看評語依據與口試題。
          </p>
        </div>
        <p className="text-xs text-subtle">內部審查強度非錄取率</p>
      </div>

      <ReviewDiff />

      <div className="flex flex-wrap gap-2">
        {result.reviews.map((rev) => {
          const prof = professorById(rev.professorId);
          return (
            <button
              key={rev.professorId}
              type="button"
              onClick={() =>
                setOpenId(openId === rev.professorId ? null : rev.professorId)
              }
              className="flex min-h-11 items-center gap-2 rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]"
            >
              <span className="font-display text-sm text-accent">{prof.surname}</span>
              <Badge variant={stanceVariant(rev.stance)}>
                {STANCE_LABEL[rev.stance]}
              </Badge>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {result.reviews.map((rev, i) => {
          const prof = professorById(rev.professorId);
          const open = openId === rev.professorId;
          return (
            <article
              key={rev.professorId}
              className="enter-up rounded-xl bg-surface shadow-[var(--shadow-border)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 p-5 text-left"
                onClick={() => setOpenId(open ? null : rev.professorId)}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2 font-display text-lg text-accent">
                  {prof.surname}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg">
                      {prof.surname}教授
                    </p>
                    <span className="text-xs text-subtle">{prof.title}</span>
                    <Badge variant={stanceVariant(rev.stance)}>
                      {STANCE_LABEL[rev.stance]}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {rev.maxRisk}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 size-4 shrink-0 text-subtle transition-transform duration-150",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open ? (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <p className="text-sm leading-relaxed text-fg">{rev.comment}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <NoteList title="優勢" items={asNotes(rev.strengths)} />
                    <NoteList title="弱點" items={asNotes(rev.weaknesses)} />
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium tracking-wide text-subtle">
                      最大風險
                    </p>
                    <p className="mt-1 text-sm text-fg">{rev.maxRisk}</p>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium tracking-wide text-subtle">
                      最可能被問
                    </p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-fg">
                      {rev.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium tracking-wide text-subtle">
                      建議補強
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-fg">
                      {asImprovements(rev.improvements).map((q) => (
                        <li key={q.text} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                          <span>
                            {q.text}
                            <span className="mt-1 block text-xs text-subtle">
                              {HORIZON_LABEL[q.horizon]} · {COST_LABEL[q.cost]}
                              {q.why ? ` · ${q.why}` : ""}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep("committee")}>
          <ArrowLeft />
          調整委員
        </Button>
        <Button type="button" onClick={() => setStep("session")}>
          召開招生委員會
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function NoteList({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof asNotes>;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-subtle">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-fg">
        {items.map((item) => (
          <li key={item.text} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
            <span>
              {item.text}
              <span className="mt-1 flex flex-wrap items-center gap-1">
                <Badge variant={evidenceVariant(item.evidence.kind)}>
                  {EVIDENCE_LABEL[item.evidence.kind]}
                </Badge>
                <span className="text-xs text-subtle">
                  {item.evidence.field}
                  {item.evidence.quote ? `「${item.evidence.quote}」` : ""}
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
