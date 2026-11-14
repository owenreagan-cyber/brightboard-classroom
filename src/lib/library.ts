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

export type Block = (typeof BLOCKS)[number];
/** Teacher's edited times, keyed by the block's first folder (minutes since midnight). */
export type BlockTimes = Record<string, { from: number; to: number }>;

/** School bell schedule with the teacher's edits applied, sorted by start time. Bad edits are ignored. */
export function effectiveBlocks(over: BlockTimes = {}): Block[] {
  return BLOCKS.map((b) => {
    const o = over[b.folders[0]!];
    return o && Number.isFinite(o.from) && Number.isFinite(o.to) && o.from >= 0 && o.to <= 24 * 60 && o.from < o.to ? { ...b, from: o.from, to: o.to } : b;
  }).sort((a, b) => a.from - b.from);
}
export function cleanBlockTimes(v: unknown): BlockTimes {
  if (!v || typeof v !== "object") return {};
  const out: BlockTimes = {};
  for (const [k, t] of Object.entries(v as Record<string, { from?: unknown; to?: unknown }>)) {
    if (BLOCKS.some((b) => b.folders[0] === k) && typeof t?.from === "number" && typeof t?.to === "number") out[k] = { from: t.from, to: t.to };
  }
  return out;
}
let customTimes: BlockTimes = {};
let offDays = new Set<Day>();
export const setBlockTimes = (t: BlockTimes) => { customTimes = t; };
export const activeBlocks = () => effectiveBlocks(customTimes);
/** Days the teacher's calendar marks as no school; nothing is suggested then. */
export const setOffDays = (d: Day[]) => { offDays = new Set(d); };
export const isDayOff = (d: Day) => offDays.has(d);
export const parseHM = (s: string) => { const m = s.match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1]! * 60 + +m[2]! : NaN; };
export const toHM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

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
export function suggest(slides: Slide[], now: Date, blocks: Block[] = activeBlocks()): { current: Slide | null; next: Slide | null } {
  const day = dayOf(now);
  if (!day || isDayOff(day)) return { current: null, next: null };
  const mins = now.getHours() * 60 + now.getMinutes();
  const find = (folders: readonly Folder[]) => {
    for (const f of folders) { const hit = slides.find((s) => s.data.folder === f && s.data.day === day && !s.data.staged); if (hit) return hit; }
    return null;
  };
  const i = blocks.findIndex((b) => mins >= b.from && mins < b.to);
  const nextBlock = i >= 0 ? blocks[i + 1] : blocks.find((b) => b.from > mins);
  return { current: i >= 0 ? find(blocks[i]!.folders) : null, next: nextBlock ? find(nextBlock.folders) : null };
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
  z.object({ type: z.literal("lesson"), subject: z.string() }),
]);
export const BoardSchema = z.object({
  title: z.string().min(1),
  folder: z.enum([...FOLDERS, ...LEGACY_FOLDERS]).optional(),
  day: z.enum(DAYS).optional(),
  heading: z.string().default(""),
  body: z.string().default(""),
  bg: z.enum(["sakura", "sky", "stars", "cream"]).default("sky"),
  backgroundStyle: z.enum(["subject", "alternate"]).optional(),
  widgets: z.array(widget).default([]),
});
export const LibrarySchema = z.object({ version: z.literal(1), boards: z.array(BoardSchema).min(1) });
export type BoardJson = z.infer<typeof BoardSchema>;

export const SCHEMA_EXAMPLE = {
  version: 1,
  boards: [{
    title: "Math Tuesday", folder: "Math", day: "Tue", heading: "Welcome to Math! 🔢", body: "Get your journal\nSharpen your pencil", bg: "sky",
    widgets: [{ type: "timer", seconds: 600, label: "Warm-up" }, { type: "sequence", start: "7:50", steps: [{ minutes: 10, label: "Mini lesson", symbol: "eyes" }] }],
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
      data: { heading: b.heading, body: b.body, bg: b.bg, backgroundStyle: b.backgroundStyle, folder: b.folder, day: b.day, staged: true, widgets: b.widgets.map((w) => ({ ...w, id: uid() }) as Widget) },
    })),
  };
}

export function toBoardJson(s: Slide): BoardJson {
  const { heading, body, bg, backgroundStyle, folder, day, widgets } = s.data;
  return { title: s.title, folder, day, heading, body, bg, backgroundStyle, widgets: widgets.map(({ id: _id, ...w }) => w) as BoardJson["widgets"] };
}
export const exportLibrary = (slides: Slide[]) => JSON.stringify({ version: 1, boards: slides.map(toBoardJson) }, null, 2);

export const fmtTime = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")}`; };

/** Week planner: for each bell block and weekday, the boards filed there (legacy folders included). */
export function weekGrid(slides: Slide[], blocks: Block[] = activeBlocks()) {
  return blocks.map((b) => ({
    ...b,
    time: `${fmtTime(b.from)}–${fmtTime(b.to)}`,
    folder: b.folders[0]!,
    cells: DAYS.map((day) => ({
      day,
      label: b.folders[0] === "Specials" ? specialFor(day) : b.folders.filter((f) => !(LEGACY_FOLDERS as readonly string[]).includes(f)).join(" / "),
      slides: slides.filter((s) => s.data.day === day && s.data.folder && (b.folders as readonly string[]).includes(s.data.folder)),
    })),
  }));
}
