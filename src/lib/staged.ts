import { parseTime } from "./board";

export type StagedGroup = { name: string; students: string[] };
export type Finale = { time: string; label: string };

export const HOMEROOM_GROUPS: StagedGroup[] = [
  { name: "Group 1", students: ["Alex", "Ava", "Caroline", "Charlotte", "Cole"] },
  { name: "Group 2", students: ["Faith", "Hannah", "Isaiah", "Jasmin", "Jay"] },
  { name: "Group 3", students: ["Liam", "Lux", "Magnus", "Nick", "Patricie"] },
  { name: "Group 4", students: ["Sophia", "Teagan", "Thaddeus", "Timothy", "Tito"] },
];

export const STAGED_PRESETS = {
  bathroom: { label: "Bathroom / locker", start: "09:05", end: "09:15", gapMin: 2.5, finale: [{ time: "09:15", label: "Ready for Shurley!" }] },
  lunch: { label: "Lunch", start: "12:15", end: "12:45", gapMin: 7.5, finale: [{ time: "12:45", label: "Clean up / sweep" }, { time: "12:48", label: "Ready for recess!" }] },
} as const;

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(date: string, n: number, shift: number): number[] {
  const r = rng(`${date}#${shift}`);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  if (n > 1 && a.every((v, i) => v === i)) a.push(a.shift()!);
  return a;
}

function prevDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Group order for a date (YYYY-MM-DD): stable per date, never 1-2-3-4, and starts with a different group than yesterday. */
export function dailyGroupOrder(date: string, n: number, shift = 0): number[] {
  const a = shuffled(date, n, shift);
  const y = shuffled(prevDay(date), n, 0);
  if (n > 1 && a[0] === y[0]) a.push(a.shift()!);
  if (n > 1 && a.every((v, i) => v === i)) a.push(a.shift()!);
  return a;
}

export type StagedState =
  | { status: "waiting"; startsInSec: number }
  | { status: "going"; slot: number; nextInSec: number }
  | { status: "allOut"; next: Finale; inSec: number }
  | { status: "finale"; label: string }
  | { status: "done" };

/** Seconds between group calls: spread evenly from start to end, or the saved gap for older slides. */
export function stagedGapSec(start: string, end: string | undefined, gapMin: number, groups: number): number {
  const span = end ? (parseTime(end) - parseTime(start)) * 60 : 0;
  return span > 0 && groups > 0 ? span / groups : Math.max(1, gapMin) * 60;
}

/** "9:07:30"-style label for a group's call time. */
export function slotLabel(start: string, gapSec: number, slot: number): string {
  const t = Math.round(parseTime(start) * 60 + slot * gapSec);
  const h = Math.floor(t / 3600) % 24, m = Math.floor((t % 3600) / 60), sec = t % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${sec ? `:${String(sec).padStart(2, "0")}` : ""}`;
}

export function getStagedState(start: string, gapSec: number, groups: number, finale: Finale[], now: Date): StagedState {
  const t = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const s = parseTime(start) * 60;
  const gap = Math.max(1, gapSec);
  if (t < s) return { status: "waiting", startsInSec: s - t };
  const slot = Math.floor((t - s) / gap);
  const fin = [...finale].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  const passed = fin.filter((f) => t >= parseTime(f.time) * 60);
  const last = fin[fin.length - 1];
  if (last && t >= parseTime(last.time) * 60 + 600) return { status: "done" };
  if (passed.length) return { status: "finale", label: passed[passed.length - 1]!.label };
  if (slot < groups) return { status: "going", slot, nextInSec: Math.ceil(s + (slot + 1) * gap - t) };
  const next = fin[0];
  return next ? { status: "allOut", next, inSec: parseTime(next.time) * 60 - t } : { status: "done" };
}
