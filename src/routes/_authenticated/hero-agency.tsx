import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { displayNames } from "@/lib/rosters";
import { HERO_JOBS, newHeroJobs, normalizeHeroJobs, validHeroJobs, type HeroJobsState } from "@/lib/hero-jobs";
import { HeroJobs, LicenseCard } from "@/components/board/HeroJobs";
import { usePersisted } from "@/components/board/games";

type Tab = "jobs" | "licenses";
export const Route = createFileRoute("/_authenticated/hero-agency")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({ tab: s["tab"] === "licenses" ? "licenses" : s["tab"] === "jobs" ? "jobs" : undefined }),
  head: () => ({
    meta: [
      { title: "Hero Agency Jobs — Hero Board" },
      { name: "description", content: "Assign classroom hero jobs, track check-ins and hero points, and print license cards." },
      { property: "og:title", content: "Hero Agency Jobs — Hero Board" },
      { property: "og:description", content: "Assign classroom hero jobs, track check-ins and hero points, and print license cards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HeroAgency,
});

function HeroAgency() {
  const { tab = "jobs" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [names, setNames] = useState<string[]>([]);
  const [stored] = usePersisted<HeroJobsState>("hb-hero-jobs", newHeroJobs, validHeroJobs, true);
  const s = normalizeHeroJobs(stored);
  const [pick, setPick] = useState<string>("all");
  useEffect(() => {
    void supabase.from("rosters").select("name, students").eq("name", "Homeroom").maybeSingle().then(({ data }) => setNames(displayNames(data?.students ?? [])));
  }, []);
  const cards = HERO_JOBS.filter((j) => s.assign[j.id] && (pick === "all" || s.assign[j.id] === pick));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <h1 className="font-display text-3xl">⚡ Hero Agency</h1>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button variant={tab === "jobs" ? "default" : "outline"} onClick={() => navigate({ search: { tab: "jobs" } })}>Jobs & points</Button>
          <Button variant={tab === "licenses" ? "default" : "outline"} onClick={() => navigate({ search: { tab: "licenses" } })}>🪪 License cards</Button>
          <Button asChild variant="outline"><Link to="/hero-agency/reports"><BarChart3 className="h-4 w-4" /> Reports</Link></Button>
        </div>
      </div>
      {tab === "jobs" ? (
        <div className="rounded-3xl border-4 border-foreground bg-card p-4"><HeroJobs names={names} wide /></div>
      ) : (
        <>
          <div className="no-print flex flex-wrap items-center gap-2">
            <select aria-label="Which licenses" className="h-9 rounded-md border bg-background px-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="all">Everyone with a job</option>
              {HERO_JOBS.map((j) => s.assign[j.id]).filter((n): n is string => !!n).map((n) => <option key={n}>{n}</option>)}
            </select>
            <Button disabled={!cards.length} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print {cards.length} card{cards.length === 1 ? "" : "s"}</Button>
            <span className="text-sm text-muted-foreground">Wallet size (2.5 × 3.5 in), 9 per page.</span>
          </div>
          {!cards.length && <p className="no-print text-muted-foreground">No jobs assigned yet. Open "Jobs & points" and tap "Fill empty jobs".</p>}
          <div className="print-area flex flex-wrap justify-center gap-3">
            {cards.map((j) => <LicenseCard key={j.id} job={j} name={s.assign[j.id]!} />)}
          </div>
        </>
      )}
    </div>
  );
}
