import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listCalendarEvents } from "./calendar.functions";
import { canvasWeek, listCanvasCourses } from "./canvas.functions";
import { guessCourse, type Agenda } from "./canvas";
import { offDaysFor, weekDates, type CalEvent } from "./calendar";
import { cleanBlockTimes, setBlockTimes, setOffDays, type BlockTimes } from "./library";

/** Subjects that can be linked to a Canvas course. */
export const CANVAS_SUBJECTS = ["Homeroom", "Math", "Reading", "Spelling", "Writing", "History", "Science"] as const;
const NAME_HINT: Record<string, string> = { Writing: "Language Arts" };
export type CourseMap = Record<string, number>;
export type WeekAgendas = Record<string, (Agenda & { title: string; url: string }) | null>;

export async function loadSettings(): Promise<{ times: BlockTimes; courses: CourseMap | null }> {
  const { data } = await supabase.auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  const times = cleanBlockTimes(meta["blockTimes"]);
  setBlockTimes(times);
  const c = meta["canvasCourses"];
  return { times, courses: c && typeof c === "object" ? (c as CourseMap) : null };
}
export async function saveBlockTimes(times: BlockTimes) {
  setBlockTimes(times);
  return supabase.auth.updateUser({ data: { blockTimes: times } });
}
export const saveCourses = (courses: CourseMap) => supabase.auth.updateUser({ data: { canvasCourses: courses } });

export async function defaultCourses(): Promise<{ courses: CourseMap; all: { id: number; name: string }[]; error?: string }> {
  const r = await listCanvasCourses();
  const courses: CourseMap = {};
  for (const s of CANVAS_SUBJECTS) { const id = guessCourse(NAME_HINT[s] ?? s, r.courses); if (id) courses[s] = id; }
  return { courses, all: r.courses, ...(r.error ? { error: r.error } : {}) };
}

/** Calendar events + off days for a Mon–Fri week. */
export async function loadWeekEvents(monday: Date): Promise<{ events: CalEvent[]; error?: string }> {
  const dates = weekDates(monday);
  const end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5);
  const r = await listCalendarEvents({ data: { from: dates[0]!, to: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}` } });
  return r;
}
export const applyOffDays = (events: CalEvent[], monday: Date) => setOffDays(offDaysFor(events, weekDates(monday)));

const agendaCache = new Map<string, Promise<{ agendas: WeekAgendas; error?: string }>>();
export function loadAgendas(courses: CourseMap, date: string, fresh = false) {
  const k = date + JSON.stringify(courses);
  if (fresh || !agendaCache.has(k)) agendaCache.set(k, canvasWeek({ data: { courses, date } }));
  return agendaCache.get(k)!;
}

/** For slide cards: today's agenda for one subject (refreshes every 10 minutes). */
export function useTodayAgenda(subject: string, date: string) {
  const [state, setState] = useState<{ agenda: WeekAgendas[string] | undefined; error?: string }>({ agenda: undefined });
  useEffect(() => {
    let live = true;
    const run = async () => {
      const s = await loadSettings();
      const courses = s.courses ?? (await defaultCourses()).courses;
      const id = courses[subject];
      if (!id) { if (live) setState({ agenda: null, error: `No Canvas course linked to ${subject}.` }); return; }
      const r = await loadAgendas({ [subject]: id }, date);
      if (live) setState({ agenda: r.agendas[subject] ?? null, ...(r.error ? { error: r.error } : {}) });
    };
    run();
    const t = setInterval(run, 10 * 60_000);
    return () => { live = false; clearInterval(t); };
  }, [subject, date]);
  return state;
}
