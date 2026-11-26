import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useHeroAgency } from "@/lib/use-hero-agency";
import { Button } from "@/components/ui/button";
import { HERO_JOBS, JOB_PROTOCOLS, autoAssign, mentorFor, normalizeHeroJobs, pay, rotate, type HeroJob } from "@/lib/hero-jobs";

const IMGS = import.meta.glob("@/assets/heroes/*.webp", { eager: true, import: "default" }) as Record<string, string>;
export const heroImg = (id: string) => Object.entries(IMGS).find(([k]) => k.endsWith(`/${id}.webp`))?.[1] ?? "";
export const HERO_NAMES: Record<string, string> = {
  deku: "Deku", shoto: "Shoto", hawks: "Hawks", endeavor: "Endeavor", eraserhead: "Eraser Head", nighteye: "Sir Nighteye", sugarman: "Sugarman", shoji: "Shoji",
  cementoss: "Cementoss", allmight: "All Might", uravity: "Uravity", froppy: "Froppy", creati: "Creati", mirko: "Mirko", mina: "Pinky", nejire: "Nejire", jiro: "Earphone Jack", mtlady: "Mt. Lady", mandalay: "Mandalay",
};
const btn = "rounded-full px-3 py-1.5 text-sm font-bold disabled:opacity-40";

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

/** Hero Agency jobs: each job has a hero mentor, a read-aloud briefing, check-ins and weekly stamps. */
export function HeroJobs({ names, wide = false }: { names: string[]; wide?: boolean }) {
  const [stored, set, sync] = useHeroAgency();
  const s = normalizeHeroJobs(stored);
  const [open, setOpen] = useState<HeroJob | null>(null);
  const [tab, setTab] = useState<"jobs" | "pay">("jobs");
  const [confirm, setConfirm] = useState(false);
  const who = open ? s.assign[open.id] : undefined;
  const checkIn = (n: string, d: 1 | -1) => set({ ...s, checkIns: { ...s.checkIns, [n]: Math.max(0, Math.min(5, (s.checkIns[n] ?? 0) + d)) } });

  return (
    <div className={`${wide ? "w-full" : "w-[min(640px,calc(100vw-48px))]"} space-y-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" aria-live="polite"><span>{sync.status === "loading" ? "Loading saved jobs…" : sync.status === "saving" ? "Saving…" : sync.status === "error" ? "Not saved" : "Saved to Classroom Companion"}</span><Button asChild variant="ghost" size="sm"><Link to="/hero-agency/widget">Phone widget</Link></Button></div>
      {sync.error && <p role="alert" className="text-sm text-destructive">{sync.error}</p>}
      <fieldset disabled={sync.status === "loading" || sync.status === "saving" || sync.status === "error"} className="min-w-0 space-y-2 border-0 p-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg">⚡ Hero Agency jobs</span>
        <button onClick={() => setTab("jobs")} className={`${btn} ${tab === "jobs" ? "bg-foreground text-background" : "bg-muted"}`}>Jobs</button>
        <button onClick={() => setTab("pay")} className={`${btn} ${tab === "pay" ? "bg-foreground text-background" : "bg-muted"}`}>Stamps</button>
        <Link to="/hero-agency" search={{ tab: "licenses" }} className={`${btn} bg-muted`}>🪪 Licenses</Link>
        <button disabled={!names.length} onClick={() => set(autoAssign(s, names))} className={`${btn} ml-auto bg-primary text-primary-foreground`}>Fill empty jobs</button>
        {confirm
          ? <><button onClick={() => { set(rotate(s, names)); setConfirm(false); }} className={`${btn} bg-destructive text-destructive-foreground`}>Yes, new week</button><button onClick={() => setConfirm(false)} className={`${btn} bg-muted`}>Cancel</button></>
          : <button disabled={!names.length} onClick={() => setConfirm(true)} className={`${btn} bg-accent text-accent-foreground`}>New week</button>}
      </div>

      {open ? (
        <div className="flex flex-col gap-3 rounded-lg border-4 border-foreground p-3 sm:flex-row">
          <img src={heroImg(mentorFor(open))} alt={HERO_NAMES[mentorFor(open)]} className="h-32 w-full rounded-lg object-cover sm:h-40 sm:w-32" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agency briefing · mentor {HERO_NAMES[mentorFor(open)]}</div>
            <div className="font-display text-2xl">{open.title}</div>
            <p className="text-sm">{JOB_PROTOCOLS[open.title]}</p>
            <select aria-label="Student for this job" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={who ?? ""}
              onChange={(e) => { const assign = Object.fromEntries(Object.entries(s.assign).filter(([id, n]) => id !== open.id && n !== e.target.value)); if (e.target.value) assign[open.id] = e.target.value; set({ ...s, assign }); }}>
              <option value="">— Empty —</option>{names.map((n) => <option key={n}>{n}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
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
          <p className="text-xs text-muted-foreground">3 check-ins this week earn the job's stamps.</p>
          {names.filter((n) => Object.values(s.assign).includes(n)).map((n) => (
            <div key={n} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-1">
              <span className="min-w-16 flex-1 font-bold">{n}</span>
              <button aria-label={`${n} remove check-in`} onClick={() => checkIn(n, -1)} className={`${btn} bg-card`}>−</button>
              <span className="w-16 text-center text-sm">{"✅".repeat(Math.min(3, s.checkIns[n] ?? 0)) || "0"}</span>
              <button aria-label={`${n} check in`} onClick={() => checkIn(n, 1)} className={`${btn} bg-primary text-primary-foreground`}>+</button>
              <span className="w-20 shrink-0 text-right font-display text-sm">{pay(s, n)} stamps</span>
            </div>
          ))}
        </div>
      )}
      </fieldset>
    </div>
  );
}

/** Standard lanyard and trading-card hero license (2.125 × 3.375 inches). */
export function LicenseCard({ job, name, size = "trading" }: { job: HeroJob; name: string; size?: "trading" | "lanyard" }) {
  const hero = mentorFor(job);
  return (
    <div className={`license-card license-${size} flex flex-col overflow-hidden rounded-xl border-4 border-foreground bg-card text-card-foreground`}>
      {size === "lanyard" && <div className="h-6 shrink-0 text-center text-xs text-muted-foreground">◯</div>}
      <div className="bg-foreground px-2 py-1 text-center font-display text-[9px] text-background">HERO AGENCY LICENSE</div>
      <img src={heroImg(hero)} alt={HERO_NAMES[hero]} className="h-[1.15in] w-full object-cover object-top" />
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <div className="font-display text-base leading-tight text-primary">{name}</div>
        <div className="font-display text-xs leading-tight">{job.title}</div>
        <div className="text-[9px] leading-snug">{JOB_PROTOCOLS[job.title]}</div>
        <div className="mt-auto flex justify-between text-[9px] font-bold"><span>Mentor: {HERO_NAMES[hero]}</span><span>{job.gp} stamps</span></div>
      </div>
    </div>
  );
}
