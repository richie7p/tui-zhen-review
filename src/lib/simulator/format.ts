import type {
  Band,
  CitedNote,
  EvidenceKind,
  Improvement,
  Stance,
  Verdict,
} from "./types";

export function bandTicks(band: Band): number {
  switch (band) {
    case "very-strong":
      return 5;
    case "strong":
      return 4;
    case "mid":
      return 3;
    case "weak":
      return 2;
    case "gap":
      return 1;
  }
}

export function stanceVariant(stance: Stance): "admit" | "hold" | "reject" | "accent" {
  if (stance === "strong-support" || stance === "support") return "admit";
  if (stance === "hold") return "hold";
  return "reject";
}

export function verdictVariant(v: Verdict): "admit" | "hold" | "reject" {
  if (v === "strong-admit" || v === "admit") return "admit";
  if (v === "borderline" || v === "waitlist") return "hold";
  return "reject";
}

export function verdictTextClass(v: Verdict): string {
  if (v === "reject") return "text-reject";
  if (v === "strong-admit" || v === "admit") return "text-admit";
  return "text-hold";
}

export function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function asNotes(items: unknown): CitedNote[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") {
      return { text: item, evidence: { field: "材料", kind: "inferred" } };
    }
    return item as CitedNote;
  });
}

export function asImprovements(items: unknown): Improvement[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") {
      return { text: item, horizon: "6w" as const, cost: "mid" as const, why: "" };
    }
    return item as Improvement;
  });
}

export function evidenceVariant(
  kind: EvidenceKind,
): "accent" | "hold" | "reject" {
  if (kind === "stated") return "accent";
  if (kind === "missing") return "reject";
  return "hold";
}
