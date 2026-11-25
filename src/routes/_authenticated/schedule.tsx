import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Lock, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScaledSlide, SlideView } from "@/components/board/SlideView";
import { StagedBadge } from "@/components/board/Library";
import { DAYS, dayOf, parseHM, toHM, weekGrid, type BlockTimes, type Day, type Folder } from "@/lib/library";
import { Input } from "@/components/ui/input";
import { eventsOn, schoolDayStatus, schoolYear, ymd, weekDates, weekStart, type CalEvent } from "@/lib/calendar";
import { listCalendarEvents } from "@/lib/calendar.functions";
import { SchoolCalendar } from "@/components/board/SchoolCalendar";
import { CANVAS_SUBJECTS, applyOffDays, defaultCourses, loadAgendas, loadSettings, saveBlockTimes, saveCourses, type CourseMap, type WeekAgendas } from "@/lib/school-sync";
import { CLASSES, DEFAULT_ROSTERS, classFor, displayNames, type ClassName } from "@/lib/rosters";
import { artFor } from "@/lib/art";
import type { Slide, SlideData } from "@/lib/board";
import { LessonPlanner } from "@/components/board/LessonPlanner";
import { lessonOn, type DailyMessage, type LessonPlans } from "@/lib/lesson-planner";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Class Schedule — Hero Board" },
      { name: "description", content: "Browse real school days, holidays and track-outs, and plan daily lessons and classroom boards." },
      { property: "og:title", content: "Class Schedule — Hero Board" },
      { property: "og:description", content: "Browse real school days, holidays and track-outs, and plan daily lessons and classroom boards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Schedule,
});

function Schedule() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [rosters, setRosters] = useState<Record<string, string[]>>({});
  const [now, setNow] = useState<Date | null>(null);
  const [focus, setFocus] = useState<Day | "week">("week");
  const [tab, setTab] = useState<ClassName>("Homeroom");
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);
  const [showMonth, setShowMonth] = useState(true);
  const [calendarVerified, setCalendarVerified] = useState(false);
  const [calendarSources, setCalendarSources] = useState<string[]>([]);
  const [times, setTimes] = useState<BlockTimes>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calError, setCalError] = useState<string>();
  const [courses, setCourses] = useState<CourseMap>({});
  const [allCourses, setAllCourses] = useState<{ id: number; name: string }[]>([]);
  const [agendas, setAgendas] = useState<WeekAgendas>({});
  const [canvasError, setCanvasError] = useState<string>();
  const [syncing, setSyncing] = useState(false);
  const [tick, setTick] = useState(0);
  const [lessonPlans, setLessonPlans] = useState<LessonPlans>({});
  const [lessonOff, setLessonOff] = useState<string[]>([]);
  const receiveCounters = useCallback((plans: LessonPlans, off: string[]) => { setLessonPlans(plans); setLessonOff(off); }, []);

  const monday = (() => { const m = weekStart(now ?? new Date()); m.setDate(m.getDate() + weekOffset * 7); return m; })();
  const mondayKey = monday.toDateString();
  const year = schoolYear(calendarMonth ?? now ?? new Date());

  useEffect(() => {
    (async () => {
      const st = await loadSettings();
      setTimes(st.times);
      const d = await defaultCourses();
      setAllCourses(d.all);
      if (d.error) setCanvasError(d.error);
      setCourses(st.courses ?? d.courses);
    })();
    const t = setInterval(() => setTick((x) => x + 1), 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!now) return;
    let live = true;
    setSyncing(true);
    const fresh = tick > 0;
    Promise.all([
      Object.keys(courses).length ? loadAgendas(courses, weekDates(monday)[0]!, fresh).then((r) => { if (!live) return; setAgendas(r.agendas); setCanvasError(r.error); }) : Promise.resolve(),
    ]).finally(() => live && setSyncing(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mondayKey, courses, tick, !!now]);

  useEffect(() => {
    if (!now) return;
    let live = true;
    setCalendarVerified(false);
    listCalendarEvents({ data: year }).then((r) => {
      if (!live) return;
      setEvents(r.events); setCalError(r.error); setCalendarVerified(!!r.schoolCalendar && !r.error); setCalendarSources(r.sources ?? []);
      // Browsing another year must not change today's automatic suggestions.
      if (schoolYear(now).from === year.from) applyOffDays(r.events, weekStart(now));
    }).catch(() => { if (live) { setCalError("Couldn't read the school calendar."); setCalendarVerified(false); } });
    return () => { live = false; };
  }, [year.from, year.to, tick, !!now]);

  useEffect(() => {
    setNow(new Date());
    setCalendarMonth(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    (async () => {
      const { data, error } = await supabase.from("slides").select("id, position, title, data").order("position");
      if (error) { toast.error(error.message); return; }
      setSlides(data as unknown as Slide[]);
      const r = await supabase.from("rosters").select("name, students");
      setRosters(Object.fromEntries((r.data ?? []).map((x) => [x.name, x.students])));
    })();
    return () => clearInterval(t);
  }, []);

  if (!slides) return <div className="flex min-h-screen items-center justify-center font-display text-2xl text-primary">Loading schedule…</div>;
  const open = (s: Slide) => navigate({ to: "/board", search: { slide: slides.indexOf(s) + 1 } });
  const create = async (folder: Folder, day: Day, label: string) => {
    const data: SlideData = { heading: `${label} time!`, body: "", bg: "sky", widgets: [], folder, day };
    const { error } = await supabase.from("slides").insert({ title: `${label} ${day}`, position: slides.length, data: data as never });
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/board", search: { slide: slides.length + 1 } });
  };
  const today = now && weekOffset === 0 ? dayOf(now) : null;
  const mins = now ? now.getHours() * 60 + now.getMinutes() : -1;
  const grid = weekGrid(slides, undefined);
  const dates = weekDates(monday);
  const dateOf = (d: Day) => dates[DAYS.indexOf(d)]!;
  const off = DAYS.filter((d) => ["off", "outside"].includes(schoolDayStatus(events, dateOf(d), calendarVerified).kind));
  const isThisWeek = weekOffset === 0;
  const saveTime = async (key: string) => {
    const from = parseHM(draft.from), to = parseHM(draft.to);
    if (!(from < to)) { toast.error("Start must be before end"); return; }
    const next = { ...times, [key]: { from, to } };
    const { error } = await saveBlockTimes(next);
    if (error) { toast.error(error.message); return; }
    setTimes(next); setEditing(null); toast.success("Time saved");
  };
  const resetTimes = async () => { await saveBlockTimes({}); setTimes({}); toast.success("Back to the school schedule"); };
  const setCourse = async (subject: string, id: string) => {
    const next = { ...courses }; if (id) next[subject] = +id; else delete next[subject];
    setCourses(next); await saveCourses(next);
  };
  const lessonFor = (folder: string, d: Day) => agendas[folder]?.days[d];
  const days = focus === "week" ? [...DAYS] : [focus];
  const selectDate = (date: string) => {
    const chosen = new Date(date + "T12:00");
    // Keep the selected week in the same school year as the month being browsed.
    const base = weekStart(now ?? new Date());
    const target = weekStart(chosen);
    setWeekOffset(Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())) / 604800000));
    setCalendarMonth(chosen);
    setFocus(dayOf(chosen) ?? "week");
  };
  const moveWeek = (offset: number) => {
    const target = new Date(monday); target.setDate(target.getDate() + (offset - weekOffset) * 7);
    setWeekOffset(offset); setCalendarMonth(target);
  };
  const names = (c: ClassName) => rosters[c] ?? DEFAULT_ROSTERS[c];
  const assessments = slides.filter((s) => s.data.folder === "Assessments");
  const useMessage = async (subject: string, date: string, message: DailyMessage) => {
    const day = DAYS[new Date(date + "T12:00").getDay() - 1];
    if (!day) return;
    const existing = slides.find((s) => s.data.folder === subject && s.data.day === day);
    if (existing && !window.confirm(`Replace the text on ${existing.title}?`)) return;
    const data: SlideData = { ...(existing?.data ?? { bg: "sky", widgets: [] }), folder: subject as Folder, day, heading: message.heading, body: message.body };
    const result = existing
      ? await supabase.from("slides").update({ data: data as never }).eq("id", existing.id)
      : await supabase.from("slides").insert({ title: `${subject} ${day} · Lesson welcome`, position: slides.length, data: data as never });
    if (result.error) { toast.error(result.error.message); return; }
    toast.success("Daily message added to the board");
    navigate({ to: "/board", search: { slide: existing ? slides.indexOf(existing) + 1 : slides.length + 1 } });
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-2">
        <Button asChild variant="outline" size="sm"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <h1 className="font-display text-xl text-primary">Class Schedule</h1>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Button size="icon" variant="outline" aria-label="Previous week" onClick={() => moveWeek(weekOffset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-bold">{isThisWeek ? "This week" : weekOffset === 1 ? "Next week" : "Week of"} · {monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          <Button size="icon" variant="outline" aria-label="Next week" onClick={() => moveWeek(weekOffset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Input type="date" aria-label="Go to date" className="h-9 w-36" value={dateOf(focus === "week" ? "Mon" : focus)} onChange={(e) => e.target.value && selectDate(e.target.value)} />
          <Button size="sm" variant="outline" onClick={() => { setWeekOffset(0); setCalendarMonth(new Date()); setFocus("week"); }}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => setTick((value) => value + 1)} disabled={syncing} aria-busy={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing with Canvas…" : "Sync with Canvas"}</Button>
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button size="sm" variant={showMonth ? "default" : "outline"} onClick={() => setShowMonth(!showMonth)}>Month</Button>
          <Button size="sm" variant={focus === "week" ? "default" : "outline"} onClick={() => setFocus("week")}>Week</Button>
          {DAYS.map((d) => <Button key={d} size="sm" variant={focus === d ? "default" : "outline"} onClick={() => setFocus(d)}>{d}{d === today ? " •" : ""}</Button>)}
        </div>
      </header>
      {showMonth && calendarMonth && <SchoolCalendar month={calendarMonth} events={events} verified={calendarVerified} today={now ? ymd(now) : ""} onMonth={setCalendarMonth} onDate={selectDate} />}
      <LessonPlanner dates={dates} offDates={off.map(dateOf)} agendas={agendas} onUse={useMessage} onCounters={receiveCounters} />
      <div className="flex flex-col gap-4 p-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 p-2 text-left">Block</th>
                {days.map((d) => <th key={d} className={`p-2 text-left font-display ${d === today ? "bg-accent text-accent-foreground" : ""}`}>{d} <span className="font-sans text-xs font-normal">{new Date(dateOf(d) + "T12:00").toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>{d === today ? " (today)" : ""}</th>)}
              </tr>
              <tr>
                <td className="p-2 text-xs text-muted-foreground">School calendar</td>
                {days.map((d) => (
                  <td key={d} className={`p-2 align-top ${off.includes(d) ? "bg-destructive/10" : ""}`}>
                    {eventsOn(events, dateOf(d)).filter((e) => e.allDay).map((e) => <div key={e.id} className="mb-1 rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">📅 {e.summary}</div>)}
                    <div className={`text-xs font-bold ${off.includes(d) ? "text-destructive" : "text-primary"}`}>{schoolDayStatus(events, dateOf(d), calendarVerified).label}</div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((b) => {
                const isNow = !!today && !off.includes(today) && mins >= b.from && mins < b.to;
                return (
                  <tr key={b.folder} className={`border-t ${isNow ? "bg-primary/10" : ""}`}>
                    <td className="p-2 align-top">
                      <div className="flex items-center gap-2">
                        {artFor({ folder: b.folder }) && <img src={artFor({ folder: b.folder })!} alt="" className="h-10 w-10 rounded-md border-2 border-foreground object-cover" />}
                        <div>
                          <div className="font-bold">{b.folder === "Specials" ? "Specials" : b.cells[0]!.label}</div>
                          {editing === b.folder ? (
                            <div className="mt-1 flex flex-col gap-1">
                              <Input type="time" aria-label="Start" className="h-8 w-28" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
                              <Input type="time" aria-label="End" className="h-8 w-28" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
                              <div className="flex gap-1"><Button size="sm" className="h-7" onClick={() => saveTime(b.folder)}>Save</Button><Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(null)}>Cancel</Button></div>
                            </div>
                          ) : (
                            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" onClick={() => { setEditing(b.folder); setDraft({ from: toHM(b.from), to: toHM(b.to) }); }}>
                              <Clock className="h-3 w-3" />{b.time}{times[b.folder] ? " ✎" : ""}
                            </button>
                          )}
                          {isNow && <span className="rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">NOW</span>}
                        </div>
                      </div>
                    </td>
                    {b.cells.filter((c) => days.includes(c.day)).map((c) => (
                      <td key={c.day} className={`p-2 align-top ${c.day === today ? "bg-accent/20" : ""}`}>
                        {off.includes(c.day) ? <span className="text-xs text-muted-foreground">No class</span> : <>
                        {lessonPlans[b.folder] && <div className="mb-1 text-xs font-bold text-primary">{(() => { const p = lessonPlans[b.folder]; const n = p ? lessonOn(p, dateOf(c.day), lessonOff) : null; return n === null ? "No lesson" : `Planned lesson ${n}`; })()}</div>}
                        {b.folder === "Specials" && <div className="mb-1 flex items-center gap-1 text-xs font-bold"><img src={artFor({ folder: "Specials", day: c.day }) ?? ""} alt="" className="h-5 w-5 rounded" />{c.label}</div>}
                        {eventsOn(events, dateOf(c.day)).filter((e) => !e.allDay && (() => { const t = new Date(e.start); const m = t.getHours() * 60 + t.getMinutes(); return m >= b.from && m < b.to; })()).map((e) => (
                          <div key={e.id} className="mb-1 rounded bg-accent px-1 text-[11px] font-bold text-accent-foreground">📅 {new Date(e.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} {e.summary}</div>
                        ))}
                        {(lessonFor(b.folder, c.day)?.inClass.length || lessonFor(b.folder, c.day)?.atHome.length) ? (
                          <div className="mb-1 rounded border border-primary/40 bg-primary/5 p-1 text-[11px]">
                            <div className="font-bold">📚 Canvas: {lessonFor(b.folder, c.day)?.lesson ?? "—"}</div>
                            {lessonFor(b.folder, c.day)!.atHome.length > 0 && <div>🏠 {lessonFor(b.folder, c.day)!.atHome.join("; ")}</div>}
                          </div>
                        ) : null}
                        <div className="space-y-1">
                          {c.slides.map((s) => (
                            <div role="button" tabIndex={0} key={s.id} onClick={() => open(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(s); } }} className="block w-full max-w-48 cursor-pointer rounded-lg p-1 text-left ring-1 ring-border hover:ring-primary">
                              <div inert className="pointer-events-none"><ScaledSlide className="aspect-video w-full rounded"><SlideView data={s.data} names={[]} thumb /></ScaledSlide></div>
                              <div className="mt-1 truncate text-xs font-bold">{s.title}</div>
                              {s.data.staged && <StagedBadge />}
                            </div>
                          ))}
                          {!c.slides.length && (
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => create(b.folder as Folder, c.day, b.folder === "Specials" ? c.label : b.folder)}><Plus className="h-3 w-3" /> Create board</Button>
                          )}
                        </div>
                        {b.folder !== "Specials" && ["Homeroom", "Reading", "Math"].includes(b.folder) && focus !== "week" && (
                          <p className="mt-1 text-xs text-muted-foreground">{classFor(b.folder)} class · {names(classFor(b.folder)).length} students</p>
                        )}
                        </>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t p-3">
            <div className="mb-2 flex items-center gap-1 font-bold"><Lock className="h-4 w-4" /> Assessments (open manually, never on the calendar)</div>
            <div className="flex flex-wrap gap-2">
              {assessments.length ? assessments.map((s) => <Button key={s.id} size="sm" variant="outline" onClick={() => open(s)}>{s.title}</Button>) : <span className="text-xs text-muted-foreground">No assessment boards yet.</span>}
            </div>
          </div>
        </div>
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <div className="rounded-2xl border bg-card p-3 text-sm">
            <h2 className="mb-1 font-display text-lg">Sync</h2>
            <p className="text-xs text-muted-foreground">Dates and times use this computer's clock. Refreshes every 5 minutes.</p>
            <p className="mt-1 text-xs">{calError ? `⚠️ ${calError}` : calendarVerified ? `📅 ${calendarSources.join(" + ")} · ${year.from.slice(0, 4)}–${year.to.slice(0, 4)}` : "Loading school calendar…"}</p>
            {Object.keys(times).length > 0 && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={resetTimes}>Reset to school schedule</Button>}
          </div>
          <div className="rounded-2xl border bg-card p-3 text-sm">
            <h2 className="mb-1 font-display text-lg">Canvas courses</h2>
            {canvasError && <p className="mb-1 text-xs text-destructive">⚠️ {canvasError}</p>}
            {CANVAS_SUBJECTS.map((sub) => (
              <label key={sub} className="mb-1 flex items-center gap-2 text-xs">
                <span className="w-20 font-bold">{sub}</span>
                <select className="h-8 min-w-0 flex-1 rounded-md border bg-card px-1" value={courses[sub] ?? ""} onChange={(e) => setCourse(sub, e.target.value)}>
                  <option value="">Not linked</option>
                  {allCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            ))}
            {Object.entries(agendas).filter(([, a]) => a?.reminders.length).map(([sub, a]) => (
              <p key={sub} className="mt-2 rounded bg-accent/40 p-1 text-xs"><b>{sub}:</b> {a!.reminders.join(" ")}</p>
            ))}
          </div>
        <div className="rounded-2xl border bg-card p-3">
          <h2 className="mb-2 font-display text-lg">Class lists</h2>
          <div className="mb-2 flex gap-1">{CLASSES.map((c) => <Button key={c} size="sm" variant={tab === c ? "default" : "outline"} onClick={() => setTab(c)}>{c}</Button>)}</div>
          <p className="mb-1 text-xs text-muted-foreground">{names(tab).length} students · used by {tab === "Homeroom" ? "every board except Reading and Math" : `${tab} boards`}</p>
          <ol className="list-decimal space-y-0.5 pl-5 text-sm">
            {names(tab).map((n, i) => <li key={n + i}>{n} <span className="text-xs text-muted-foreground">({displayNames(names(tab))[i]})</span></li>)}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Edit these from Class list on the board.</p>
        </div>
        </aside>
      </div>
    </div>
  );
}
