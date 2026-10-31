import { z } from "zod";
import { uid, type Slide, type SlideData, type Widget } from "./board";

/** Folders follow Mr. Reagan's real bell schedule, in day order. */
export const FOLDERS = ["Homeroom", "Math", "Snack", "Writing", "Movement", "Spelling", "Reading", "Lunch", "Recess", "History", "Science", "Specials", "Pack Up", "Dismissal", "Assessments"] as const;
/** Older folder names still accepted on stored/imported boards. */
export const LEGACY_FOLDERS = ["Morning", "Lunch/Recess/Pack-up"] as const;
export type Folder = (typeof FOLDERS)[number] | (typeof LEGACY_FOLDERS)[number];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type Day = (typeof DAYS)[number];

export const SPECIALS: Record<Day, "Music" | "P.E." | "Art" | "Industrial Arts" | "Latin"> = { Mon: "Music", Tue: "P.E.", Wed: "Art", Thu: "Industrial Arts", Fri: "Latin" };
export const specialFor = (d: Day) => SPECIALS[d];

const t = (h: number, m: number) => h * 60 + m;
/** Daily bell schedule for smart suggestions (minutes since midnight). History & Science share 1:15; Assessments never appear. */
export const BLOCKS: { folders: Exclude<Folder, "Assessments">[]; from: number; to: number }[] = [
  { folders: ["Homeroom", "Morning"], from: t(7, 20), to: t(7, 50) },
  { folders: ["Math"], from: t(7, 50), to: t(9, 5) },
  { folders: ["Snack"], from: t(9, 5), to: t(9, 20) },
  { folders: ["Writing"], from: t(9, 20), to: t(10, 5) },
  { folders: ["Movement"], from: t(10, 5), to: t(10, 40) },
  { folders: ["Spelling"], from: t(10, 40), to: t(11, 10) },
  { folders: ["Reading"], from: t(11, 10), to: t(12, 15) },
  { folders: ["Lunch", "Lunch/Recess/Pack-up"], from: t(12, 15), to: t(12, 50) },
  { folders: ["Recess", "Lunch/Recess/Pack-up"], from: t(12, 50), to: t(13, 15) },
  { folders: ["History", "Science"], from: t(13, 15), to: t(13, 50) },
  { folders: ["Specials"], from: t(13, 50), to: t(14, 35) },
  { folders: ["Pack Up", "Lunch/Recess/Pack-up"], from: t(14, 35), to: t(14, 40) },
  { folders: ["Dismissal"], from: t(14, 40), to: t(15, 5) },
];

export const isAssessment = (d: SlideData) => d.folder === "Assessments";

/** Strip games (picker, music) for Assessment Mode. */
export function assessmentWidgets(ws: Widget[]): Widget[] {
  return ws.filter((w) => w.type !== "picker" && w.type !== "spotify");
}

export function dayOf(now: Date): Day | null {
  const d = now.getDay();
  return d >= 1 && d <= 5 ? DAYS[d - 1]! : null;
}

/** The board to suggest right now, plus the following block's board for "Next". */
export function suggest(slides: Slide[], now: Date): { current: Slide | null; next: Slide | null } {
  const day = dayOf(now);
  if (!day) return { current: null, next: null };
  const mins = now.getHours() * 60 + now.getMinutes();
  const find = (folder: Folder) => slides.find((s) => s.data.folder === folder && s.data.day === day && !s.data.staged) ?? null;
  const i = BLOCKS.findIndex((b) => mins >= b.from && mins < b.to);
  const nextBlock = i >= 0 ? BLOCKS[i + 1] : BLOCKS.find((b) => b.from > mins);
  return { current: i >= 0 ? find(BLOCKS[i]!.folder) : null, next: nextBlock ? find(nextBlock.folder) : null };
}

/** Copy widgets + layout (bg, heading, body) from source to every other day in the same folder. */
export function applyToAllDays(slides: Slide[], source: Slide): { updates: Slide[]; missing: Day[] } {
  const folder = source.data.folder;
  if (!folder) return { updates: [], missing: [] };
  const updates: Slide[] = [];
  const missing: Day[] = [];
  for (const day of DAYS) {
    if (day === source.data.day) continue;
    const target = slides.find((s) => s.data.folder === folder && s.data.day === day);
    const data: SlideData = { ...structuredClone(source.data), day, staged: target?.data.staged, widgets: source.data.widgets.map((w) => ({ ...structuredClone(w), id: uid() })) };
    if (target) updates.push({ ...target, data });
    else missing.push(day);
  }
  return { updates, missing };
}

// ---------- JSON schema ----------
const step = z.object({ minutes: z.number().min(0), label: z.string(), symbol: z.string() });
const widget = z.discriminatedUnion("type", [
  z.object({ type: z.literal("timer"), seconds: z.number().int().min(1), label: z.string().optional() }),
  z.object({ type: z.literal("sequence"), start: z.string().regex(/^\d{1,2}:\d{2}$/, "start must be HH:MM"), steps: z.array(step).min(1) }),
  z.object({ type: z.literal("picker") }),
  z.object({ type: z.literal("symbols"), symbols: z.array(z.string()) }),
  z.object({ type: z.literal("spotify"), url: z.string() }),
  z.object({ type: z.literal("clock") }),
]);
export const BoardSchema = z.object({
  title: z.string().min(1),
  folder: z.enum(FOLDERS).optional(),
  day: z.enum(DAYS).optional(),
  heading: z.string().default(""),
  body: z.string().default(""),
  bg: z.enum(["sakura", "sky", "stars", "cream"]).default("sky"),
  widgets: z.array(widget).default([]),
});
export const LibrarySchema = z.object({ version: z.literal(1), boards: z.array(BoardSchema).min(1) });
export type BoardJson = z.infer<typeof BoardSchema>;

export const SCHEMA_EXAMPLE = {
  version: 1,
  boards: [{
    title: "Math Tuesday", folder: "Math", day: "Tue", heading: "Welcome to Math! 🔢", body: "Get your journal\nSharpen your pencil", bg: "sky",
    widgets: [{ type: "timer", seconds: 600, label: "Warm-up" }, { type: "sequence", start: "10:30", steps: [{ minutes: 10, label: "Mini lesson", symbol: "eyes" }] }],
  }],
};

/** Accepts a library ({version, boards}), an array of boards, or a single board. */
export function parseImport(text: string): { ok: true; boards: { title: string; data: SlideData }[] } | { ok: false; errors: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { return { ok: false, errors: ["Not valid JSON: " + (e as Error).message] }; }
  const wrapped = Array.isArray(raw) ? { version: 1, boards: raw } : raw && typeof raw === "object" && "boards" in raw ? raw : { version: 1, boards: [raw] };
  const res = LibrarySchema.safeParse(wrapped);
  if (!res.success) return { ok: false, errors: res.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`) };
  return {
    ok: true,
    boards: res.data.boards.map((b) => ({
      title: b.title,
      data: { heading: b.heading, body: b.body, bg: b.bg, folder: b.folder, day: b.day, staged: true, widgets: b.widgets.map((w) => ({ ...w, id: uid() }) as Widget) },
    })),
  };
}

export function toBoardJson(s: Slide): BoardJson {
  const { heading, body, bg, folder, day, widgets } = s.data;
  return { title: s.title, folder, day, heading, body, bg, widgets: widgets.map(({ id: _id, ...w }) => w) as BoardJson["widgets"] };
}
export const exportLibrary = (slides: Slide[]) => JSON.stringify({ version: 1, boards: slides.map(toBoardJson) }, null, 2);
