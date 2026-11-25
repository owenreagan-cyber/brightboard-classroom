import { useEffect, useState } from "react";
import { BookOpen, Minus, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CANVAS_SUBJECTS, type WeekAgendas } from "@/lib/school-sync";
import { DAYS, type Folder } from "@/lib/library";
import { listCalendarEvents } from "@/lib/calendar.functions";
import { schoolClosed } from "@/lib/calendar";
import { artFor } from "@/lib/art";
import { cleanLessonMessages, cleanLessonPlans, contextSignature, dateSchema, lessonOn, messageContext, type DailyMessage, type LessonMessages, type LessonPlan, type LessonPlans } from "@/lib/lesson-planner";
import { resumeLessonWriting, writeLessonMessage } from "@/lib/lesson-messages.functions";

type Props = { dates: string[]; offDates: string[]; agendas: WeekAgendas; onUse: (subject: string, date: string, message: DailyMessage) => Promise<void>; onCounters: (plans: LessonPlans, off: string[]) => void };
export function LessonPlanner({ dates, offDates, agendas, onUse, onCounters }: Props) {
  const [plans, setPlans] = useState<LessonPlans>({});
  const [messages, setMessages] = useState<LessonMessages>({});
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState("Math");
  const [selected, setSelected] = useState("Mon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<LessonPlan | null>(null);
  const [preview, setPreview] = useState<DailyMessage | null>(null);
  const [calendarOff, setCalendarOff] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarWarning, setCalendarWarning] = useState("");
  const allOff = [...new Set([...offDates, ...calendarOff])];
  const date = dates[DAYS.indexOf(selected as typeof DAYS[number])] ?? dates[0] ?? "";
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) { setError(error.message); return; }
      setPlans(cleanLessonPlans(data.user?.user_metadata["lessonPlans"]));
      setMessages(cleanLessonMessages(data.user?.user_metadata["lessonMessages"]));
      setReady(true);
    });
  }, []);
  const plan = plans[subject];
  const firstDate = Object.values(plans).map((p) => p.startDate).sort()[0];
  const endDate = dates[4];
  useEffect(() => {
    if (!firstDate || !endDate || firstDate > endDate) return;
    let live = true;
    setCalendarLoading(true);
    listCalendarEvents({ data: { from: firstDate, to: endDate } }).then((r) => {
      if (!live) return;
      setCalendarWarning(r.error ?? "");
      const off: string[] = [];
      const d = new Date(firstDate + "T12:00:00Z");
      for (let key = firstDate; key <= endDate; key = d.toISOString().slice(0, 10)) {
        if (schoolClosed(r.events, key)) off.push(key);
        d.setUTCDate(d.getUTCDate() + 1);
      }
      setCalendarOff(off);
    }).catch(() => live && setCalendarWarning("Couldn't check earlier no-school days. Mark missed lessons with Skip lesson.")).finally(() => live && setCalendarLoading(false));
    return () => { live = false; };
  }, [firstDate, endDate]);
  useEffect(() => { onCounters(plans, allOff); }, [plans, JSON.stringify(allOff), onCounters]);
  const number = plan ? lessonOn(plan, date, allOff) : null;
  const context = plan ? messageContext(plan, date, allOff) : null;
  const signature = context ? contextSignature(context) : "";
  const saved = messages[subject]?.[date];
  const current = saved?.signature === signature ? saved : null;
  useEffect(() => { setPreview(current ?? null); setError(""); }, [subject, date, signature, current]);
  const savePlan = async (next: LessonPlan) => {
    const nextPlans = { ...plans, [subject]: next };
    const { error } = await supabase.auth.updateUser({ data: { lessonPlans: nextPlans } });
    if (error) { setError(error.message); return; }
    setPlans(nextPlans); setDraft(null); toast.success("Lesson counter saved");
  };
  const startEditing = () => {
    const first = agendas[subject]?.days.Mon?.lesson?.match(/\blesson\s+(\d+)/i);
    setDraft(plan ?? { startDate: dates[0] ?? date, startLesson: first?.[1] ? +first[1] : 1, materials: subject === "Math" ? "pen, pencil, and power up pack" : "pencil and class materials", skipped: [], corrections: {} });
  };
  const generate = async () => {
    if (!plan || !context || number === null) return;
    setBusy(true); setError("");
    try {
      const day = DAYS[DAYS.indexOf(selected as typeof DAYS[number])];
      const agenda = day ? agendas[subject]?.days[day] : undefined;
      const out = await writeLessonMessage({ data: { subject, date, lesson: number, homeworkLesson: context.homeworkLesson, materials: plan.materials, details: agenda?.lesson === `Lesson ${number}` ? agenda.inClass.join("; ") : "" } });
      if ("error" in out) { setError(out.error); return; }
      const message = { ...out, signature };
      setPreview(message);
      const next = { ...messages, [subject]: { ...messages[subject], [date]: message } };
      const { error } = await supabase.auth.updateUser({ data: { lessonMessages: next } });
      if (error) { setError(error.message); return; }
      setMessages(next);
    } catch { setError("Couldn't write the message. Your counter is unchanged."); }
    finally { setBusy(false); }
  };
  return <section className="border-b bg-card p-4" aria-label="Lesson planner">
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <BookOpen className="h-5 w-5 text-primary" /><h2 className="font-display text-lg">Lesson counter & daily message</h2>
        <label className="flex items-center gap-2 text-sm">Subject<select aria-label="Lesson subject" className="h-9 rounded-md border bg-background px-2" value={subject} onChange={(e) => { setSubject(e.target.value); setDraft(null); }} disabled={busy}>{CANVAS_SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <Button variant="outline" size="sm" disabled={!ready || busy} onClick={startEditing}>{plan ? "Counter settings" : "Set starting lesson"}</Button>
      </div>
      {draft && <form className="mb-4 flex flex-wrap items-end gap-3 border-b pb-4" onSubmit={(e) => { e.preventDefault(); if (!dateSchema.safeParse(draft.startDate).success || draft.startLesson < 1 || !draft.materials.trim()) { setError("Choose a start date, positive lesson number, and materials."); return; } void savePlan(draft); }}>
        <label className="text-sm">Starting date<Input aria-label="Starting date" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} required /></label>
        <label className="w-32 text-sm">Starting lesson<Input aria-label="Starting lesson" type="number" min={1} max={10000} value={draft.startLesson} onChange={(e) => setDraft({ ...draft, startLesson: +e.target.value })} required /></label>
        <label className="min-w-48 flex-1 text-sm">Materials<Input aria-label="Lesson materials" maxLength={500} value={draft.materials} onChange={(e) => setDraft({ ...draft, materials: e.target.value })} required /></label>
        <Button type="submit" size="sm">Save counter</Button><Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
      </form>}
      {plan && <>
        <div className="grid grid-cols-5 gap-1 sm:gap-2">{DAYS.map((d, i) => {
          const dt = dates[i]; if (!dt) return null;
          const n = lessonOn(plan, dt, allOff);
          return <Button key={d} variant={selected === d ? "default" : "outline"} className="h-auto min-h-16 flex-col gap-1 px-1 py-2" onClick={() => setSelected(d)} disabled={busy}><span>{d}</span><span className="text-xs">{n === null ? (allOff.includes(dt) ? "Break" : "No lesson") : `Lesson ${n}`}</span></Button>;
        })}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex items-start gap-3"><img src={artFor({ folder: subject as Folder }) ?? ""} alt={`${subject} schedule card`} className="h-16 w-16 rounded-md object-cover" /><div className="min-w-0">
            <h3 className="font-bold">{subject} · {date}</h3><p className="mt-1 text-sm">{number === null ? "No lesson planned" : `Lesson ${number}`}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Button size="icon" variant="outline" aria-label="Decrease lesson number" disabled={busy || number === null || number <= 1} onClick={() => number !== null && void savePlan({ ...plan, corrections: { ...plan.corrections, [date]: number - 1 } })}><Minus className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" aria-label="Increase lesson number" disabled={busy || number === null} onClick={() => number !== null && void savePlan({ ...plan, corrections: { ...plan.corrections, [date]: number + 1 } })}><Plus className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={busy || offDates.includes(date) || date < plan.startDate} onClick={() => void savePlan({ ...plan, skipped: plan.skipped.includes(date) ? plan.skipped.filter((d) => d !== date) : [...plan.skipped, date] })}>{plan.skipped.includes(date) ? "Restore lesson" : "Skip lesson"}</Button>
            </div>
            <Button size="sm" className="mt-3" disabled={busy || calendarLoading || number === null} onClick={() => void generate()}><Sparkles className="h-4 w-4" />{busy ? "Writing…" : calendarLoading ? "Checking dates…" : current ? "Rewrite message" : "Write with AI"}</Button>
          </div></div>
          <div className="min-w-0">
            {preview && <><Input aria-label="Message heading" value={preview.heading} maxLength={200} onChange={(e) => setPreview({ ...preview, heading: e.target.value })} /><Textarea aria-label="Daily message" className="mt-2 min-h-24" value={preview.body} maxLength={1500} onChange={(e) => setPreview({ ...preview, body: e.target.value })} /><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={async () => { const next = { ...messages, [subject]: { ...messages[subject], [date]: preview } }; const { error } = await supabase.auth.updateUser({ data: { lessonMessages: next } }); if (error) { setError(error.message); return; } setMessages(next); toast.success("Message saved"); }}>Save message</Button><Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await onUse(subject, date, preview); } finally { setBusy(false); } }}>Use on board</Button></div></>}
            {saved && !current && !preview && <p className="text-sm text-muted-foreground">Lesson changed — write a fresh message.</p>}
            {error && <div role="alert" className="mt-2 text-sm text-destructive">{error}<Button variant="ghost" size="sm" onClick={async () => { const r = await resumeLessonWriting(); if (r.error) setError(r.error); else setError(""); }}>Resume after resolving access</Button></div>}
          </div>
        </div>
      </>}
      {calendarWarning && <p className="mt-2 text-sm text-destructive">{calendarWarning}</p>}
      {!plan && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  </section>;
}