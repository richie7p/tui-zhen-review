import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BAR_LABEL,
  COST_LABEL,
  DEADLINE_LABEL,
  HORIZON_LABEL,
  STANCE_LABEL,
  VERDICT_LABEL,
  availableMoves,
  applyWhatIf,
  buildPlan,
  compareAllSchools,
  gpaSweep,
  pickDrillQuestions,
  professorById,
  rankSweep,
  rewriteMaterials,
  scoreInterviewDetailed,
  simulateVariant,
  verdictShift,
  voteDiff,
  type Deadline,
  type SweepPoint,
  type Verdict,
  type WhatIfId,
  type Improvement,
} from "@/lib/simulator";
import { stanceVariant, verdictTextClass } from "@/lib/simulator/format";
import { useCaseStore } from "@/store/case-store";
import { cn } from "@/lib/utils";

type Pane = "moves" | "sensitivity" | "schools" | "drill" | "rewrite";

const PANES: { id: Pane; label: string }[] = [
  { id: "moves", label: "試算補強" },
  { id: "sensitivity", label: "學業敏感度" },
  { id: "schools", label: "多所對照" },
  { id: "drill", label: "口試對打" },
  { id: "rewrite", label: "材料與時程" },
];

export function AfterBoard() {
  const profile = useCaseStore((s) => s.profile);
  const selectedIds = useCaseStore((s) => s.selectedIds);
  const result = useCaseStore((s) => s.result);
  const prefs = useCaseStore((s) => s.prefs);
  const commitCase = useCaseStore((s) => s.commitCase);
  const setPrefs = useCaseStore((s) => s.setPrefs);
  const [pane, setPane] = useState<Pane>("moves");
  const [moves, setMoves] = useState<WhatIfId[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [gpaKey, setGpaKey] = useState<string | null>(null);
  const [rankKey, setRankKey] = useState<string | null>(null);

  const options = useMemo(() => availableMoves(profile, prefs), [profile, prefs]);
  const questions = useMemo(
    () => (result ? pickDrillQuestions(result.reviews) : []),
    [result],
  );
  const plan = useMemo(() => buildPlan(profile, prefs), [profile, prefs]);
  const drafts = useMemo(
    () => (pane === "rewrite" ? rewriteMaterials(profile) : []),
    [pane, profile],
  );
  const gpaPoints = useMemo(
    () => (pane === "sensitivity" ? gpaSweep(profile, selectedIds, prefs) : []),
    [pane, profile, selectedIds, prefs],
  );
  const rankPoints = useMemo(
    () => (pane === "sensitivity" ? rankSweep(profile, selectedIds, prefs) : []),
    [pane, profile, selectedIds, prefs],
  );
  const schoolRows = useMemo(
    () => (pane === "schools" ? compareAllSchools(profile, selectedIds, prefs) : []),
    [pane, profile, selectedIds, prefs],
  );

  useEffect(() => {
    setMoves([]);
    setGpaKey(null);
    setRankKey(null);
  }, [result?.caseId]);

  const interview = useMemo(
    () => scoreInterviewDetailed(questions, answers),
    [questions, answers],
  );
  const interviewReady = interview.items.some((i) => i.gained > 0);

  const whatIf = useMemo(() => {
    if (!result || moves.length === 0) return null;
    return simulateVariant(profile, selectedIds, moves, undefined, undefined, prefs);
  }, [result, moves, profile, selectedIds, prefs]);

  const drillAlt = useMemo(() => {
    if (!result || !interviewReady) return null;
    return simulateVariant(profile, selectedIds, [], undefined, {
      spillover: interview.spillover,
      byProfessor: interview.byProfessor,
    }, prefs);
  }, [result, interviewReady, interview, profile, selectedIds, prefs]);

  const gpaPoint = gpaPoints.find((p) => p.key === gpaKey && !p.current) ?? null;
  const rankPoint = rankPoints.find((p) => p.key === rankKey && !p.current) ?? null;
  const senseAlt = useMemo(() => {
    if (!result) return null;
    const patch = { ...(gpaPoint?.profilePatch ?? {}), ...(rankPoint?.profilePatch ?? {}) };
    if (Object.keys(patch).length === 0) return null;
    return simulateVariant({ ...profile, ...patch }, selectedIds, [], undefined, undefined, prefs);
  }, [result, gpaPoint, rankPoint, profile, selectedIds, prefs]);

  if (!result) return null;

  function toggle(id: WhatIfId) {
    setMoves((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl text-fg">裁決之後</h2>
        <p className="mt-1 text-sm text-muted">
          試算、改票、改投、改寫。全部標為估算，不是錄取率。
        </p>
      </div>

      <div className="flex flex-nowrap gap-1 overflow-x-auto">
        {PANES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={pane === item.id}
            onClick={() => setPane(item.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-3 text-sm transition-colors duration-150",
              pane === item.id
                ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                : "text-muted hover:bg-surface/60 hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {pane === "moves" ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg text-fg">試算補強</h3>
          <p className="mt-1 text-sm text-muted">
            勾選假設條件，立刻看哪一票會翻。可預覽，也可寫進本案重審。
          </p>
          {options.length === 0 ? (
            <p className="mt-4 text-sm text-subtle">
              這份檔目前沒有明顯可一鍵試算的缺口。改材料或換目標所再看。
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {options.map((m) => {
                const on = moves.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "min-h-11 rounded-lg px-3 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150",
                      on ? "bg-surface-2 ring-1 ring-accent/50" : "bg-surface-2",
                    )}
                  >
                    <span className="block text-sm text-fg">{m.label}</span>
                    <span className="mt-1 block text-xs text-subtle">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          )}
          {whatIf ? (
            <>
              <CompareBlock
                from={result.committee.verdict}
                to={whatIf.committee.verdict}
                flips={voteDiff(result, whatIf)}
              />
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    commitCase(applyWhatIf(profile, moves));
                    setMoves([]);
                  }}
                >
                  把勾選寫進材料並重審
                </Button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {pane === "sensitivity" ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg text-fg">學業敏感度</h3>
          <p className="mt-1 text-sm text-muted">
            只動 GPA 或班排，看林委員與合議怎麼走。數字是估算，不是改成績單。
          </p>
          <SweepRow
            title="GPA"
            points={gpaPoints}
            selected={gpaKey}
            onSelect={setGpaKey}
          />
          <SweepRow
            title="班排"
            points={rankPoints}
            selected={rankKey}
            onSelect={setRankKey}
          />
          {senseAlt ? (
            <>
              <CompareBlock
                from={result.committee.verdict}
                to={senseAlt.committee.verdict}
                flips={voteDiff(result, senseAlt)}
                note="僅學業位置試算"
              />
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    commitCase({
                      ...(gpaPoint?.profilePatch ?? {}),
                      ...(rankPoint?.profilePatch ?? {}),
                    });
                    setGpaKey(null);
                    setRankKey(null);
                  }}
                >
                  以此學業重審
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-subtle">
              點一個與目前不同的格，看裁決怎麼移。
            </p>
          )}
        </section>
      ) : null}

      {pane === "schools" ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg text-fg">多所對照</h3>
          <p className="mt-1 text-sm text-muted">
            同一份檔、同一組委員，只換目標校門檻。這不是各校錄取率。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-xl text-left text-sm">
              <thead>
                <tr className="text-xs text-subtle">
                  <th className="py-2 pr-3 font-medium">學校</th>
                  <th className="py-2 pr-3 font-medium">門檻</th>
                  <th className="py-2 pr-3 font-medium">裁決</th>
                  <th className="py-2 pr-3 font-medium">票</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {schoolRows.map((row) => (
                  <tr
                    key={row.school}
                    className={cn(
                      "border-t border-border",
                      row.current && "bg-surface-2",
                    )}
                  >
                    <td className="py-3 pr-3 text-fg">
                      {row.school}
                      {row.current ? (
                        <span className="ml-2 text-xs text-subtle">本案</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-muted">{BAR_LABEL[row.bar]}</td>
                    <td className={cn("py-3 pr-3 font-display", verdictTextClass(row.verdict))}>
                      {VERDICT_LABEL[row.verdict]}
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-muted">
                      {row.support}/{row.hold}/{row.against}
                    </td>
                    <td className="py-3 text-right">
                      {row.current ? (
                        <span className="text-xs text-subtle">目前目標</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => commitCase({ targetSchool: row.school })}
                        >
                          改投並重審
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-subtle">票數為 支持／保留／反對。</p>
        </section>
      ) : null}

      {pane === "drill" ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg text-fg">口試對打</h3>
          <p className="mt-1 text-sm text-muted">
            針對最可能被問的三題寫短答。寫得具體，該席委員可能加權——可預覽，也可寫進本案改票。
          </p>
          <ol className="mt-4 flex flex-col gap-4">
            {questions.map((q, i) => {
              const prof = professorById(q.professorId);
              const item = interview.items[i];
              return (
                <li key={q.text}>
                  <p className="text-sm text-fg">{q.text}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {prof.surname}教授可能追問
                    {item && item.gained > 0 ? ` · ${item.note}` : ""}
                  </p>
                  <Textarea
                    className="mt-2"
                    rows={3}
                    value={answers[i] ?? ""}
                    placeholder="用你實際做過的事回答。空著不加分。"
                    onChange={(e) => {
                      const next = [...answers];
                      next[i] = e.target.value;
                      setAnswers(next);
                    }}
                  />
                </li>
              );
            })}
          </ol>
          {drillAlt ? (
            <>
              <CompareBlock
                from={result.committee.verdict}
                to={drillAlt.committee.verdict}
                flips={voteDiff(result, drillAlt)}
                note={`口試加權估算：全體 +${interview.spillover}，並依答題席次加權`}
              />
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() =>
                    commitCase(undefined, {
                      interviewBonus: interview.spillover,
                      interviewByProfessor: interview.byProfessor,
                    })
                  }
                >
                  把口試寫進本案並改票
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-subtle">
              至少寫滿一題（約 24 字）才會開始加權。
            </p>
          )}
        </section>
      ) : null}

      {pane === "rewrite" ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg text-fg">材料改寫</h3>
          <p className="mt-1 text-sm text-muted">
            依委員會追問的結構補洞。草稿是模板，不是代寫論文。
          </p>
          {drafts.length === 0 ? (
            <p className="mt-4 text-sm text-subtle">
              專題／研究敘事結構已大致齊全。口試仍要能講失敗過什麼。
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {drafts.map((d) => (
                <article
                  key={d.field}
                  className="rounded-lg bg-surface-2 p-4 shadow-[var(--shadow-border)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-fg">{d.title}</p>
                    <div className="flex flex-wrap gap-1">
                      {d.slots.map((slot) => (
                        <Badge
                          key={slot.id}
                          variant={slot.ok ? "admit" : "hold"}
                        >
                          {slot.ok ? slot.label : `缺 ${slot.label}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
                    {d.draft}
                  </pre>
                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => commitCase({ [d.field]: d.draft })}
                    >
                      套用草稿並重審
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6">
            <h4 className="font-display text-lg text-fg">補強時程（估算）</h4>
            <p className="mt-1 text-sm text-muted">
              依目前缺口與距截止時間排序。研究尚未成熟時，不會一律叫你趕論文。
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {(["2w", "6w", "term"] as Deadline[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPrefs({ deadline: d })}
                  className={cn(
                    "min-h-11 rounded-md px-3 text-sm",
                    prefs.deadline === d
                      ? "bg-surface-2 text-fg shadow-[var(--shadow-border)] ring-1 ring-accent/50"
                      : "bg-surface-2 text-muted",
                  )}
                >
                  {DEADLINE_LABEL[d]}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <PlanCol title="兩週內" items={plan.weeks2} />
              <PlanCol title="六週內" items={plan.weeks6} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SweepRow({
  title,
  points,
  selected,
  onSelect,
}: {
  title: string;
  points: SweepPoint[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-medium tracking-wide text-subtle">{title}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {points.map((p) => {
          const on = selected === p.key || (selected == null && p.current);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelect(p.key)}
              className={cn(
                "flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-lg px-3 py-2 shadow-[var(--shadow-border)]",
                on ? "bg-surface-2 ring-1 ring-accent/50" : "bg-surface-2",
                p.current && "ring-1 ring-border",
              )}
            >
              <span className="text-xs text-subtle">
                {p.current
                  ? "目前"
                  : p.linStance
                    ? `林 ${STANCE_LABEL[p.linStance]}`
                    : p.hint}
              </span>
              <span className="text-sm text-fg">{p.label}</span>
              <span className={cn("font-display text-xs", verdictTextClass(p.verdict))}>
                {VERDICT_LABEL[p.verdict]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompareBlock({
  from,
  to,
  flips,
  note,
}: {
  from: Verdict;
  to: Verdict;
  flips: ReturnType<typeof voteDiff>;
  note?: string;
}) {
  return (
    <div className="mt-5 rounded-lg bg-surface-2 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-subtle">原裁決</p>
          <p className="font-display text-xl text-fg">{VERDICT_LABEL[from]}</p>
        </div>
        <p className="text-xs text-muted">{verdictShift(from, to)}</p>
        <div className="text-right">
          <p className="text-xs text-subtle">試算後</p>
          <p className={cn("font-display text-xl", verdictTextClass(to))}>
            {VERDICT_LABEL[to]}
          </p>
        </div>
      </div>
      {note ? <p className="mt-2 text-xs text-subtle">{note}</p> : null}
      <ul className="mt-4 flex flex-col gap-2">
        {flips.map((f) => {
          const prof = professorById(f.professorId);
          return (
            <li
              key={f.professorId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className={cn("text-muted", f.flipped && "text-fg")}>
                {prof.surname}教授
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={stanceVariant(f.from)}>
                  {STANCE_LABEL[f.from]}
                </Badge>
                {f.flipped ? (
                  <>
                    <span className="text-xs text-subtle">→</span>
                    <Badge variant={stanceVariant(f.to)}>
                      {STANCE_LABEL[f.to]}
                    </Badge>
                  </>
                ) : (
                  <span className="text-xs text-subtle">不變</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlanCol({ title, items }: { title: string; items: Improvement[] }) {
  return (
    <div className="rounded-md bg-surface-2 p-3">
      <p className="text-xs font-medium tracking-wide text-subtle">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-fg">
        {items.map((item) => (
          <li key={item.text} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
            <span>
              {item.text}
              <span className="mt-1 block text-xs text-subtle">
                {HORIZON_LABEL[item.horizon]} · {COST_LABEL[item.cost]}
                {item.why ? ` · ${item.why}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
