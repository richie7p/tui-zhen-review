import { PROFESSORS } from "@/lib/simulator";
import { useCaseStore } from "@/store/case-store";

export function ReviewingOverlay() {
  const selected = useCaseStore((s) => s.selectedIds);
  const names = PROFESSORS.filter((p) => selected.includes(p.id));

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl bg-surface px-6 py-16 text-center shadow-[var(--shadow-border)]">
      <p className="font-display text-2xl text-fg">委員正在閱卷</p>
      <p className="mt-2 max-w-md text-sm text-muted">
        同一份申請檔，不同審查人格各自標記優勢、弱點與口試風險。
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {names.map((p, i) => (
          <span
            key={p.id}
            className="enter-up flex size-12 items-center justify-center rounded-md bg-surface-2 font-display text-lg text-accent shadow-[var(--shadow-border)]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {p.surname}
          </span>
        ))}
      </div>
    </div>
  );
}
