import { useState } from "react";
import { usePersisted } from "./games";
import { HERO_JOBS, JOB_PROTOCOLS, autoAssign, mentorFor, newHeroJobs, pay, rotate, type HeroJob, type HeroJobsState } from "@/lib/hero-jobs";

const IMGS = import.meta.glob("@/assets/heroes/*.webp", { eager: true, import: "default" }) as Record<string, string>;
const heroImg = (id: string) => Object.entries(IMGS).find(([k]) => k.endsWith(`/${id}.webp`))?.[1] ?? "";
const HERO_NAMES: Record<string, string> = {
  deku: "Deku", shoto: "Shoto", hawks: "Hawks", endeavor: "Endeavor", eraserhead: "Eraser Head", nighteye: "Sir Nighteye", sugarman: "Sugarman", shoji: "Shoji",
  cementoss: "Cementoss", allmight: "All Might", uravity: "Uravity", froppy: "Froppy", creati: "Creati", mirko: "Mirko", mina: "Pinky", nejire: "Nejire", jiro: "Earphone Jack", mtlady: "Mt. Lady", mandalay: "Mandalay",
};
const btn = "rounded-full px-3 py-1.5 text-sm font-bold disabled:opacity-40";
const valid = (v: unknown) => !!v && typeof v === "object" && typeof (v as HeroJobsState).assign === "object" && typeof (v as HeroJobsState).checkIns === "object";

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

/** Hero Agency jobs: each job has a hero mentor, a read-aloud briefing, check-ins and weekly hero points. */
export function HeroJobs({ names }: { names: string[] }) {
  const [s, set] = usePersisted<HeroJobsState>("hb-hero-jobs", newHeroJobs, valid, true);
  const [open, setOpen] = useState<HeroJob | null>(null);
  const [tab, setTab] = useState<"jobs" | "pay">("jobs");
  const [confirm, setConfirm] = useState(false);
  const who = open ? s.assign[open.id] : undefined;
  const checkIn = (n: string, d: 1 | -1) => set({ ...s, checkIns: { ...s.checkIns, [n]: Math.max(0, Math.min(5, (s.checkIns[n] ?? 0) + d)) } });

  return (
    <div className="w-[min(640px,calc(100vw-48px))] space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg">⚡ Hero Agency jobs</span>
        <button onClick={() => setTab("jobs")} className={`${btn} ${tab === "jobs" ? "bg-foreground text-background" : "bg-muted"}`}>Jobs</button>
        <button onClick={() => setTab("pay")} className={`${btn} ${tab === "pay" ? "bg-foreground text-background" : "bg-muted"}`}>Hero points</button>
        <button disabled={!names.length} onClick={() => set(autoAssign(s, names))} className={`${btn} ml-auto bg-primary text-primary-foreground`}>Fill empty jobs</button>
        {confirm
          ? <><button onClick={() => { set(rotate(s, names)); setConfirm(false); }} className={`${btn} bg-destructive text-destructive-foreground`}>Yes, new week</button><button onClick={() => setConfirm(false)} className={`${btn} bg-muted`}>Cancel</button></>
          : <button disabled={!names.length} onClick={() => setConfirm(true)} className={`${btn} bg-accent text-accent-foreground`}>New week</button>}
      </div>

      {open ? (
        <div className="flex gap-3 rounded-2xl border-4 border-foreground p-3">
          <img src={heroImg(mentorFor(open))} alt={HERO_NAMES[mentorFor(open)]} className="h-40 w-32 rounded-xl object-cover" />
          <div className="flex-1 space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agency briefing · mentor {HERO_NAMES[mentorFor(open)]}</div>
            <div className="font-display text-2xl">{open.title}</div>
            <p className="text-sm">{JOB_PROTOCOLS[open.title]}</p>
            <select aria-label="Student for this job" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={who ?? ""}
              onChange={(e) => { const assign = Object.fromEntries(Object.entries(s.assign).filter(([id, n]) => id !== open.id && n !== e.target.value)); if (e.target.value) assign[open.id] = e.target.value; set({ ...s, assign }); }}>
              <option value="">— Empty —</option>{names.map((n) => <option key={n}>{n}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => speak(`${who ? who + ", " : ""}you are our ${open.title}! ${JOB_PROTOCOLS[open.title]} Plus Ultra!`)} className={`${btn} bg-primary text-primary-foreground`}>🔊 Read briefing</button>
              <button onClick={() => setOpen(null)} className={`${btn} bg-muted`}>Back</button>
            </div>
          </div>
        </div>
      ) : tab === "jobs" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {HERO_JOBS.map((j) => (
            <button key={j.id} onClick={() => setOpen(j)} className="overflow-hidden rounded-xl border-2 border-foreground text-left hover:border-primary">
              <img src={heroImg(mentorFor(j))} alt="" loading="lazy" className="h-20 w-full object-cover object-top" />
              <div className="p-1.5"><div className="text-xs font-bold">{j.title}</div><div className="truncate font-display text-sm text-primary">{s.assign[j.id] ?? "—"}</div></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground">3 check-ins this week earn the job's hero points.</p>
          {names.filter((n) => Object.values(s.assign).includes(n)).map((n) => (
            <div key={n} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1">
              <span className="flex-1 font-bold">{n}</span>
              <button aria-label={`${n} remove check-in`} onClick={() => checkIn(n, -1)} className={`${btn} bg-card`}>−</button>
              <span className="w-16 text-center text-sm">{"✅".repeat(Math.min(3, s.checkIns[n] ?? 0)) || "0"}</span>
              <button aria-label={`${n} check in`} onClick={() => checkIn(n, 1)} className={`${btn} bg-primary text-primary-foreground`}>+</button>
              <span className="w-14 text-right font-display">{pay(s, n)} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
