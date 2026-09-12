import { Badge } from "@/components/ui/badge";
import {
  STANCE_LABEL,
  VERDICT_LABEL,
  professorById,
  reviewDelta,
} from "@/lib/simulator";
import { stanceVariant, verdictTextClass } from "@/lib/simulator/format";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

export function ReviewDiff() {
  const prior = useCaseStore((s) => s.priorResult);
  const result = useCaseStore((s) => s.result);
  if (!prior || !result || prior.createdAt === result.createdAt) return null;
  const delta = reviewDelta(prior, result);
  const idle =
    delta.flips.length === 0 &&
    delta.risksGone.length === 0 &&
    delta.shift === "裁決不變" &&
    delta.reasons.length === 0;
  if (idle) return null;

  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h3 className="font-display text-lg text-fg">相對上次送審</h3>
      <p className="mt-1 text-sm text-muted">
        這是兩次模擬的差異，不是錄取率變化。
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-subtle">上次裁決</p>
          <p className="font-display text-xl text-fg">
            {VERDICT_LABEL[delta.verdictFrom]}
          </p>
        </div>
        <p className="text-xs text-muted">{delta.shift}</p>
        <div className="text-right">
          <p className="text-xs text-subtle">本次</p>
          <p className={cn("font-display text-xl", verdictTextClass(delta.verdictTo))}>
            {VERDICT_LABEL[delta.verdictTo]}
          </p>
        </div>
      </div>
      {delta.reasons.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm text-fg">
          {delta.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {delta.flips.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {delta.flips.map((f) => {
            const prof = professorById(f.professorId);
            return (
              <li key={f.professorId} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg">{prof.surname}教授</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={stanceVariant(f.from)}>
                      {STANCE_LABEL[f.from]}
                    </Badge>
                    <span className="text-xs text-subtle">→</span>
                    <Badge variant={stanceVariant(f.to)}>
                      {STANCE_LABEL[f.to]}
                    </Badge>
                  </span>
                </div>
                <p className="mt-1 text-xs text-subtle">{f.why}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">沒有委員改票。</p>
      )}
      {delta.risksGone.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-subtle">風險變化</p>
          <ul className="mt-2 space-y-2 text-sm">
            {delta.risksGone.map((r, i) => (
              <li key={`${r.professorId}-${i}`}>
                <p className="text-muted">
                  {professorById(r.professorId).surname}教授原風險：{r.text}
                </p>
                {delta.risksNew[i] ? (
                  <p className="text-fg">改為：{delta.risksNew[i].text}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
