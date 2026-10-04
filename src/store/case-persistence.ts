import { z } from "zod";
import { EMPTY_PROFILE, DEFAULT_PREFS, PROFESSORS } from "@/lib/simulator";
const profileSchema = z.object({
  name: z.string().max(80), school: z.string().max(200), department: z.string().max(200),
  targetSchool: z.string().max(200), targetProgram: z.string().max(200),
  gpaValue: z.string().max(30), gpaScale: z.enum(["4.3", "4.0", "100"]),
  classRank: z.string().max(30), classSize: z.string().max(30),
  englishType: z.enum(["toeic", "toefl", "ielts", "gept", "none"]),
  englishVersion: z.enum(["toeic-lr", "toeic-sw", "toefl-ibt", "toefl-itp", "ielts-academic", "ielts-general", "gept-band", "none"]).optional(),
  englishScore: z.string().max(100), project: z.string().max(20000), research: z.string().max(20000),
  papers: z.string().max(20000), certs: z.string().max(20000), github: z.string().max(20000),
  internship: z.string().max(20000), highlights: z.string().max(20000),
  recommendation: z.enum(["strong-3", "strong-2", "mixed", "weak", "none"]),
});
const prefsSchema = z.object({
  dimScale: z.object({ academics: z.number().min(0.2).max(3), research: z.number().min(0.2).max(3), engineering: z.number().min(0.2).max(3), english: z.number().min(0.2).max(3) }),
  schoolTiers: z.record(z.string(), z.enum(["t0", "t1", "t2", "t3"])),
  deadline: z.enum(["2w", "6w", "term"]),
});
const schema = z.object({ profile: profileSchema, selectedIds: z.array(z.string()).max(20), prefs: prefsSchema });
export function restoreCase(value: unknown) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { profile: { ...EMPTY_PROFILE }, selectedIds: PROFESSORS.map(p => p.id), prefs: structuredClone(DEFAULT_PREFS) };
  const selectedIds = [...new Set(parsed.data.selectedIds)].filter(id => PROFESSORS.some(p => p.id === id));
  return { ...parsed.data, selectedIds: selectedIds.length ? selectedIds : PROFESSORS.map(p => p.id) };
}
