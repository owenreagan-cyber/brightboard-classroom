import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeroAgency } from "@/lib/use-hero-agency";
import { supabase } from "@/integrations/supabase/client";
import { heroReports, normalizeHeroJobs } from "@/lib/hero-jobs";
import { displayNames } from "@/lib/rosters";

export const Route = createFileRoute("/_authenticated/hero-agency_/reports")({
  head: () => ({
    meta: [
      { title: "Hero Agency Reports — Hero Board" },
      { name: "description", content: "Review each student's weekly Hero Agency jobs, check-ins and stamps." },
      { property: "og:title", content: "Hero Agency Reports — Hero Board" },
      { property: "og:description", content: "Review each student's weekly Hero Agency jobs, check-ins and stamps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HeroAgencyReports,
});

function weekLabel(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function HeroAgencyReports() {
  const [names, setNames] = useState<string[]>([]);
  const [stored] = useHeroAgency();
  const [weekCount, setWeekCount] = useState(8);
  const [pick, setPick] = useState("all");
  const s = normalizeHeroJobs(stored);
  const report = useMemo(() => heroReports(s, names, weekCount), [s, names, weekCount]);
  const visible = pick === "all" ? report.students : report.students.filter((student) => student.name === pick);
  const totalCheckIns = report.students.reduce((sum, student) => sum + student.totalCheckIns, 0);
  const totalPoints = report.students.reduce((sum, student) => sum + student.totalPoints, 0);

  useEffect(() => {
    void supabase.from("rosters").select("name, students").eq("name", "Homeroom").maybeSingle().then(({ data }) => setNames(displayNames(data?.students ?? [])));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <Button asChild variant="outline"><Link to="/hero-agency" search={{ tab: "jobs" }}>⚡ Hero Agency</Link></Button>
        <h1 className="flex items-center gap-2 font-display text-3xl"><BarChart3 className="h-8 w-8 text-primary" /> Reports</h1>
      </div>

      <section className="rounded-3xl border-4 border-foreground bg-accent/35 p-4 shadow-pop">
        <h2 className="font-display text-xl">Weekly hero records</h2>
        <p className="mt-1 text-sm">The current week updates live. Tapping <strong>New week</strong> saves the old week's jobs, check-ins and stamps before rotating.</p>
        {!s.history.length && <p className="mt-2 text-sm font-bold">No earlier weeks are saved yet. Weeks from before this feature was added can't be reconstructed.</p>}
      </section>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-foreground bg-card p-3">
        <label className="grid gap-1 text-sm font-bold">
          Student
          <select aria-label="Report student" className="h-10 min-w-44 rounded-md border bg-background px-3" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="all">Every student</option>
            {names.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Time range
          <select aria-label="Report time range" className="h-10 rounded-md border bg-background px-3" value={weekCount} onChange={(e) => setWeekCount(Number(e.target.value))}>
            <option value={4}>Past 4 weeks</option>
            <option value={8}>Past 8 weeks</option>
            <option value={12}>Past 12 weeks</option>
            <option value={52}>Up to 52 weeks</option>
          </select>
        </label>
        <div className="ml-auto flex gap-5 rounded-xl bg-muted px-4 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-bold"><ClipboardList className="h-4 w-4" /> {s.history.length} archived week{s.history.length === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-1.5 font-bold"><CheckCircle2 className="h-4 w-4" /> {totalCheckIns} check-ins</span>
          <span className="flex items-center gap-1.5 font-bold"><Star className="h-4 w-4" /> {totalPoints} stamps</span>
        </div>
      </div>

      {!names.length ? (
        <p className="rounded-2xl border-2 border-foreground bg-card p-6 text-muted-foreground">Loading the homeroom class list…</p>
      ) : (
        <div className="space-y-4">
          {visible.map((student) => (
            <article key={student.name} className="overflow-hidden rounded-3xl border-4 border-foreground bg-card shadow-pop">
              <header className="flex flex-wrap items-center gap-3 bg-foreground px-4 py-3 text-background">
                <h2 className="font-display text-2xl">{student.name}</h2>
                <div className="ml-auto flex gap-4 text-sm font-bold">
                  <span>{student.totalCheckIns} check-ins</span>
                  <span className="text-accent">{student.totalPoints} stamps</span>
                </div>
              </header>
              <div className="divide-y divide-border">
                {student.weeks.map((week) => (
                  <div key={week.weekStart} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                    <div className="w-44">
                      <div className="font-bold">Week of {weekLabel(week.weekStart)}</div>
                      {week.weekStart === s.weekStart && <div className="text-xs font-bold uppercase tracking-wide text-primary">Current week</div>}
                    </div>
                    <div className="min-w-36 flex-1 font-display text-lg">{week.job?.title ?? "No job"}</div>
                    <div className="w-24 text-sm font-bold">✅ {week.checkIns} check-in{week.checkIns === 1 ? "" : "s"}</div>
                    <div className="ml-auto w-24 text-right font-display text-lg text-primary">{week.points} stamps</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
