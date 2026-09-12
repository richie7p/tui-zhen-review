import { bandTicks } from "@/lib/simulator/format";
import type { Band } from "@/lib/simulator/types";
import { BAND_LABEL } from "@/lib/simulator/types";
import { cn } from "@/lib/utils";

export function SignalMeter({
  label,
  band,
  warn,
}: {
  label: string;
  band: Band;
  warn?: boolean;
}) {
  const ticks = warn ? 0 : bandTicks(band);
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs text-muted">{label}</span>
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < ticks ? "bg-accent" : "bg-border",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "w-12 shrink-0 text-right text-xs tabular-nums text-subtle",
          warn && "text-reject",
        )}
      >
        {warn ? "無效" : BAND_LABEL[band]}
      </span>
    </div>
  );
}
