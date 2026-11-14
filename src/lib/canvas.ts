/** Pure parsing for Canvas weekly agenda pages ("Q2W6 - November 16–20, 2026"). Runs on server and in tests. */
import type { Day } from "./library";

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
const DAY_NAMES: Record<string, Day> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri" };
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Week range from an agenda title, e.g. "November 30–December 4, 2026" → 2026-11-30..2026-12-04. */
export function agendaWeek(title: string): { start: string; end: string } | null {
  const m = title.toLowerCase().match(/([a-z]+)\s+(\d{1,2})\s*[–—-]\s*(?:([a-z]+)\s+)?(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const m1 = MONTHS.indexOf(m[1]!); const m2 = m[3] ? MONTHS.indexOf(m[3]) : m1;
  if (m1 < 0 || m2 < 0) return null;
  const y2 = +m[5]!; const y1 = m2 < m1 ? y2 - 1 : y2;
  return { start: iso(y1, m1, +m[2]!), end: iso(y2, m2, +m[4]!) };
}

const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const items = (html: string) => [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => text(x[1]!)).filter((x) => x && !/^none\.?$/i.test(x));

export type AgendaDay = { inClass: string[]; atHome: string[]; lesson: string | null };
export type Agenda = { reminders: string[]; days: Partial<Record<Day, AgendaDay>> };

/** "Lesson 50", "Investigation 5", "Test 9"… — the first numbered lesson-like item. */
export function lessonLabel(lines: string[]): string | null {
  for (const l of lines) { const m = l.match(/\b(lesson|investigation|test|unit|chapter|week|story|list)\s*#?\s*(\d+)/i); if (m) return `${m[1]![0]!.toUpperCase()}${m[1]!.slice(1).toLowerCase()} ${m[2]}`; }
  return lines[0] ?? null;
}

/** Split an agenda page into weekdays by <h3>Monday</h3>…, reading the "In Class" and "At Home" lists. */
export function parseAgenda(html: string): Agenda {
  const parts = html.split(/<h3[^>]*>/i).slice(1).map((p) => { const i = p.search(/<\/h3>/i); return { head: text(p.slice(0, i)), body: p.slice(i + 5) }; });
  const out: Agenda = { reminders: [], days: {} };
  for (const p of parts) {
    const day = DAY_NAMES[p.head.toLowerCase()];
    if (!day) {
      if (/remind/i.test(p.head)) out.reminders = [...p.body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((x) => text(x[1]!)).filter(Boolean);
      continue;
    }
    const sections = p.body.split(/<h4[^>]*>/i).slice(1);
    const pick = (re: RegExp) => { const s = sections.find((x) => re.test(text(x.slice(0, x.search(/<\/h4>/i))))); return s ? items(s) : []; };
    const inClass = pick(/in class/i); const atHome = pick(/at home|homework/i);
    out.days[day] = { inClass, atHome, lesson: lessonLabel(inClass) };
  }
  return out;
}

/** Choose the agenda page whose week contains `date` (YYYY-MM-DD). */
export function pickAgenda<T extends { title: string }>(pages: T[], date: string): T | null {
  return pages.find((p) => { const w = agendaWeek(p.title); return !!w && w.start <= date && date <= w.end; }) ?? null;
}

/** Best-guess Canvas course for each subject from course names. */
export function guessCourse(subject: string, courses: { id: number; name: string }[]): number | null {
  const s = subject.toLowerCase();
  return courses.find((c) => c.name.toLowerCase().includes(s))?.id ?? null;
}
