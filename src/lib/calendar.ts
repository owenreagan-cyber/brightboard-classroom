import type { Day } from "./library";
export type CalEvent = { id: string; summary: string; start: string; end: string; allDay: boolean; calendar?: string };
const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const OFF = /\b(no school|holiday|break|teacher workday|workday|closed|day off|vacation|thanksgiving|track[ -]?out)\b/i;
export const schoolClosed = (events: CalEvent[], date: string) => eventsOn(events, date).some((e) => e.allDay && OFF.test(e.summary));

/** Local calendar date (YYYY-MM-DD) from the browser clock. */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Monday of the week containing d (weekends jump to the next Monday). */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  x.setDate(x.getDate() + (wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd));
  return x;
}
export const weekDates = (monday: Date) => DAYS.map((_, i) => ymd(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));

/** Events touching a date. All-day end dates are exclusive. */
export function eventsOn(events: CalEvent[], date: string): CalEvent[] {
  return events.filter((e) => (e.allDay ? e.start <= date && date < e.end : e.start.slice(0, 10) === date));
}
/** Weekdays an all-day "no school"-type event covers. */
export function offDaysFor(events: CalEvent[], dates: string[]): Day[] {
  return DAYS.filter((_, i) => { const date = dates[i]; return date ? schoolClosed(events, date) : false; });
}

export function schoolYear(date: Date) {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return { from: `${year}-07-01`, to: `${year + 1}-06-30` };
}
export function monthDates(date: Date): string[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  first.setDate(first.getDate() - (first.getDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, i) => ymd(new Date(first.getFullYear(), first.getMonth(), first.getDate() + i)));
}
export function schoolDayStatus(events: CalEvent[], date: string, verified = true): { kind: "school" | "off" | "weekend" | "outside" | "unknown"; label: string } {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  if (day === 0 || day === 6) return { kind: "weekend", label: "Weekend" };
  if (!verified) return { kind: "unknown", label: "Calendar unavailable" };
  const closed = eventsOn(events, date).find((e) => e.allDay && OFF.test(e.summary));
  if (closed) return { kind: "off", label: closed.summary };
  const first = events.find((e) => e.allDay && /\bfirst day of school\b/i.test(e.summary));
  const last = events.find((e) => e.allDay && /\blast day of school\b/i.test(e.summary));
  if ((first && date < first.start) || (last && date >= last.end)) return { kind: "outside", label: "Outside school term" };
  return { kind: "school", label: "School day" };
}
