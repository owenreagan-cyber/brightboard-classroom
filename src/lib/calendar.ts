import type { Day } from "./library";
export type CalEvent = { id: string; summary: string; start: string; end: string; allDay: boolean };
const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const OFF = /\b(no school|holiday|break|teacher workday|workday|closed|day off|vacation|thanksgiving)\b/i;

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
  return DAYS.filter((_, i) => eventsOn(events, dates[i]!).some((e) => e.allDay && OFF.test(e.summary)));
}
