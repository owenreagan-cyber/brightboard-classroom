import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePersisted } from "./games";
import { figureForKey } from "@/lib/art";
import { HERO_JOBS, pay } from "@/lib/hero-jobs";
import { useHeroAgency } from "@/lib/use-hero-agency";
import { activeBlocks } from "@/lib/library";
import {
  BRAIN_BREAKS, DEFAULT_JOBS, TEAMS, absentToday, addPoint, dayKey, jobsFor, joinQueue, leaveQueue, makeGroups, present, shuffle, syllables, teamScores, toggleAbsent,
  type Attendance, type TeamState,
} from "@/lib/classroom";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const btn = "rounded-full px-3 py-1.5 text-sm font-bold disabled:opacity-40";
const today = () => dayKey(new Date());
const ATT = "hb-attend";
const validAtt = (v: unknown) => isObj(v) && typeof v["date"] === "string" && Array.isArray(v["absent"]);

/** Today's absent students, kept in step with the Attendance tool and the teacher's account. */
export function useAbsent(): string[] {
  const [a, setA] = useState<Attendance | null>(null);
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(ATT) ?? "null"); if (validAtt(v)) setA(v); } catch { /* ignore */ }
    void supabase.auth.getUser().then(({ data }) => {
      const v = (data.user?.user_metadata?.["games"] as Record<string, unknown> | undefined)?.[ATT];
      if (validAtt(v)) setA(v as Attendance);
    });
    const on = (e: Event) => setA((e as CustomEvent<Attendance>).detail);
    window.addEventListener(ATT, on);
    return () => window.removeEventListener(ATT, on);
  }, []);
  return absentToday(a, today());
}

export function AttendanceTool({ names }: { names: string[] }) {
  const [a, set] = usePersisted<Attendance>(ATT, () => ({ date: today(), absent: [] }), validAtt, true);
  const absent = absentToday(a, today());
  useEffect(() => { window.dispatchEvent(new CustomEvent(ATT, { detail: a })); }, [a]);
  return (
    <div className="max-w-sm space-y-2">
      <div className="font-display text-lg">Who's here? <span className="text-sm text-muted-foreground">{names.length - absent.length}/{names.length}</span></div>
      <p className="text-xs text-muted-foreground">Tap a name to mark absent today. Pickers and groups skip them.</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((n) => (
          <button key={n} onClick={() => set(toggleAbsent(a, n, today()))} aria-pressed={absent.includes(n)}
            className={`${btn} ${absent.includes(n) ? "bg-muted text-muted-foreground line-through" : "bg-primary text-primary-foreground"}`}>{n}</button>
        ))}
      </div>
      {!names.length && <p className="text-xs">Add names in Class list first.</p>}
    </div>
  );
}

export function TeamPoints({ onScore }: { onScore?: () => void }) {
  const [raw, set] = usePersisted<TeamState>("hb-teams", () => teamScores(null, new Date()), (v) => isObj(v) && Array.isArray(v["scores"]), true);
  const s = teamScores(raw, new Date());
  const [cheer, setCheer] = useState(-1);
  const max = Math.max(...s.scores);
  return (
    <div className="space-y-2">
      <div className="font-display text-lg">Team points <span className="text-xs text-muted-foreground">this week</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TEAMS.map((t, i) => (
          <div key={t} className={`rounded-2xl border-4 p-2 text-center ${max > 0 && s.scores[i] === max ? "border-accent" : "border-foreground"}`}>
            <div className="font-display">{t}</div>
            <div className={`font-display text-4xl ${cheer === i ? "animate-bounce" : ""}`}>{s.scores[i]}</div>
            <div className="flex justify-center gap-1">
              <button aria-label={`${t} minus one`} onClick={() => set(addPoint(s, i, -1, new Date()))} className={`${btn} bg-muted`}>−1</button>
              <button aria-label={`${t} plus one`} onClick={() => { set(addPoint(s, i, 1, new Date())); setCheer(i); onScore?.(); setTimeout(() => setCheer(-1), 900); }} className={`${btn} bg-primary text-primary-foreground`}>+1</button>
            </div>
          </div>
        ))}
      </div>
      {cheer >= 0 && <div className="text-center font-display text-primary">🐱 Go team {TEAMS[cheer]}!</div>}
    </div>
  );
}

export function GroupsMaker({ names }: { names: string[] }) {
  const [size, setSize] = useState(3);
  const [groups, setGroups] = useState<string[][]>([]);
  return (
    <div className="max-w-xl space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg">Groups of</span>
        {[2, 3, 4, 5].map((n) => <button key={n} onClick={() => setSize(n)} aria-pressed={size === n} className={`${btn} ${size === n ? "bg-foreground text-background" : "bg-muted"}`}>{n}</button>)}
        <button disabled={names.length < 2} onClick={() => setGroups(makeGroups(names, size))} className={`${btn} bg-primary text-primary-foreground`}>{groups.length ? "Reshuffle" : "Make groups"}</button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {groups.map((g, i) => (
          <div key={i} className="rounded-xl border-2 border-foreground p-2">
            <div className="font-display text-sm text-primary">Group {i + 1}</div>
            <div className="text-sm">{g.join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobsChart({ names }: { names: string[] }) {
  const [jobs, setJobs] = usePersisted<string[]>("hb-jobs", () => DEFAULT_JOBS, (v) => Array.isArray(v), true);
  const [edit, setEdit] = useState(false);
  // When Hero Agency jobs are assigned, the chart follows them.
  const [hero] = useHeroAgency();
  const heroRows = HERO_JOBS.flatMap((j) => {
    const name = hero.assign[j.id];
    return name ? [{ job: `${j.title}${HERO_JOBS.filter((x) => x.title === j.title).length > 1 ? ` ${HERO_JOBS.filter((x) => x.title === j.title).indexOf(j) + 1}` : ""}`, name, stamps: pay(hero, name) }] : [];
  });
  return (
    <div className="max-w-sm space-y-2">
      <div className="flex items-center justify-between"><span className="font-display text-lg">Today's jobs</span>
        <button onClick={() => setEdit((e) => !e)} className={`${btn} bg-muted`}>{edit ? "Done" : "Edit jobs"}</button></div>
      {edit ? (
        <textarea aria-label="Jobs, one per line" rows={6} className="w-full rounded-md border bg-background p-2 text-sm" value={jobs.join("\n")}
          onChange={(e) => setJobs(e.target.value.split("\n").map((j) => j.trimStart()).filter((j, i, all) => j || i === all.length - 1))} />
      ) : (
        <ul className="space-y-1">{(heroRows.length ? heroRows : jobsFor(names, jobs.filter(Boolean), new Date())).map((j) => (
          <li key={j.job} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted px-3 py-1.5"><span className="font-bold">{j.job}</span><span>{j.name}{"stamps" in j ? ` · ${j.stamps} stamps` : ""}</span></li>
        ))}</ul>
      )}
      <p className="text-xs text-muted-foreground">{heroRows.length ? "Showing Hero Agency jobs — they update when students move jobs." : "Jobs move to the next student each school day."}</p>
    </div>
  );
}

const fmt = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}`;
export function DailyAgenda() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(t); }, []);
  const mins = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="max-w-md">
      <div className="mb-2 font-display text-lg">Today's plan</div>
      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {activeBlocks().map((b) => {
          const done = mins >= b.to, nowB = mins >= b.from && mins < b.to;
          const key = b.folders[0]!.toLowerCase().replace(/[^a-z]/g, "");
          return (
            <li key={b.folders[0]} className={`relative rounded-xl border-2 p-1 text-center text-xs ${nowB ? "border-primary bg-primary/10" : "border-border"} ${done ? "opacity-40" : ""}`}>
              <img src={figureForKey(key)} alt="" className="mx-auto h-12 object-contain" />
              <div className="font-bold">{b.folders[0]}</div><div>{fmt(b.from)}</div>
              {done && <span className="absolute right-1 top-0 text-base">✓</span>}
              {nowB && <span className="font-display text-primary">NOW</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function BrainBreak() {
  const [move, setMove] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [spin, setSpin] = useState(false);
  useEffect(() => { if (left <= 0) return; const t = window.setTimeout(() => setLeft(left - 1), 1000); return () => window.clearTimeout(t); }, [left]);
  const go = () => {
    setSpin(true); let n = 0;
    const order = shuffle(BRAIN_BREAKS);
    const t = window.setInterval(() => { setMove(order[n % order.length]!); if (++n > 12) { window.clearInterval(t); setSpin(false); setLeft(30); } }, 100);
  };
  return (
    <div className="w-80 space-y-2 text-center">
      <div className="font-display text-lg">Brain break</div>
      <div className={`min-h-20 rounded-2xl bg-foreground p-3 font-display text-2xl text-background ${spin ? "" : "animate-in zoom-in"}`}>{move ?? "Spin for a move!"}</div>
      {left > 0 && <div className="font-display text-3xl text-primary">{left}s</div>}
      <button disabled={spin} onClick={go} className={`${btn} w-full bg-primary py-3 text-primary-foreground`}>🌀 Spin</button>
    </div>
  );
}

export function HelpQueue({ names }: { names: string[] }) {
  const [q, set] = usePersisted<string[]>("hb-help", () => [], (v) => Array.isArray(v), true);
  const [pick, setPick] = useState("");
  return (
    <div className="w-80 space-y-2">
      <div className="font-display text-lg">Help line</div>
      <div className="flex gap-2">
        <select aria-label="Student" className="h-9 flex-1 rounded-md border bg-background px-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Choose a student…</option>{names.filter((n) => !q.includes(n)).map((n) => <option key={n}>{n}</option>)}
        </select>
        <button disabled={!pick} onClick={() => { set(joinQueue(q, pick)); setPick(""); }} className={`${btn} bg-primary text-primary-foreground`}>Add</button>
      </div>
      <ol className="space-y-1">{q.map((n, i) => (
        <li key={n} className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${i === 0 ? "bg-accent font-display text-accent-foreground" : "bg-muted"}`}>
          <span>{i + 1}. {n}</span><button onClick={() => set(leaveQueue(q, n))} className="text-xs font-bold underline">Done</button>
        </li>
      ))}</ol>
      {!q.length && <p className="text-xs text-muted-foreground">No one is waiting.</p>}
    </div>
  );
}

export function WordOfDay() {
  const [w, set] = usePersisted<{ date: string; word: string }>("hb-word", () => ({ date: today(), word: "rabbit" }), (v) => isObj(v) && typeof v["word"] === "string", true);
  return (
    <div className="w-80 space-y-2 text-center">
      <div className="font-display text-lg">Word of the day</div>
      <div className="font-display text-5xl text-primary">{w.word}</div>
      <div className="flex justify-center gap-1">{syllables(w.word).filter(Boolean).map((s, i) => <span key={i} className="rounded-lg bg-accent px-2 py-1 font-display text-xl text-accent-foreground">{s}</span>)}</div>
      <input aria-label="Word" className="h-9 w-full rounded-md border bg-background px-2 text-center" value={w.word} onChange={(e) => set({ date: today(), word: e.target.value.slice(0, 20) })} />
    </div>
  );
}
