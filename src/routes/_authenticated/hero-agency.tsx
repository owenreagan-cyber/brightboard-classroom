import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { displayNames } from "@/lib/rosters";
import { HERO_JOBS, newHeroJobs, normalizeHeroJobs, validHeroJobs, type HeroJobsState } from "@/lib/hero-jobs";
import { HeroJobs, LicenseCard } from "@/components/board/HeroJobs";
import { usePersisted } from "@/components/board/games";
import type { LicenseLayout, LicenseSize } from "@/lib/hero-license-pdf";

type Tab = "jobs" | "licenses";
export const Route = createFileRoute("/_authenticated/hero-agency")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined } => ({ tab: s["tab"] === "licenses" ? "licenses" : s["tab"] === "jobs" ? "jobs" : undefined }),
  head: () => ({
    meta: [
      { title: "Hero Agency Jobs — Hero Board" },
      { name: "description", content: "Assign classroom hero jobs, track check-ins and stamps, and download lanyard and trading-card student license PDFs." },
      { property: "og:title", content: "Hero Agency Jobs — Hero Board" },
      { property: "og:description", content: "Assign classroom hero jobs, track check-ins and stamps, and download lanyard and trading-card student license PDFs." },
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
  const [layout, setLayout] = useState<LicenseLayout>("letter");
  const [size, setSize] = useState<LicenseSize>("trading");
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [pdfError, setPdfError] = useState("");
  useEffect(() => {
    void supabase.from("rosters").select("name, students").eq("name", "Homeroom").maybeSingle().then(({ data }) => setNames(displayNames(data?.students ?? [])));
  }, []);
  const licenses = useMemo(() => HERO_JOBS.flatMap(job => {
    const name = stored.assign[job.id];
    return name && (pick === "all" || name === pick) ? [{ job, name }] : [];
  }), [stored.assign, pick]);
  useEffect(() => {
    let cancelled = false;
    setPdf(null); setPdfError("");
    if (tab !== "licenses" || !licenses.length) return;
    void (async () => {
      try {
        const [{ buildLicensePdf }, response] = await Promise.all([
          import("@/lib/hero-license-pdf"), fetch(`/downloads/hero-agency-${size}-templates.pdf`),
        ]);
        if (!response.ok) throw new Error("License artwork could not be loaded. Please try again.");
        const bytes = await buildLicensePdf(licenses, await response.arrayBuffer(), layout, size);
        if (!cancelled) setPdf(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      } catch {
        if (!cancelled) setPdfError("The license PDF could not be prepared. Please reopen License cards to try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [licenses, layout, tab, size]);
  const [deliver, setDeliver] = useState<((blob: Blob, filename: string) => Promise<void>) | null>(null);
  useEffect(() => {
    void import("@/lib/hero-license-pdf").then(module => setDeliver(() => module.deliverLicensePdf));
  }, []);

  return (
    <div className="hero-agency-page mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <h1 className="font-display text-3xl">⚡ Hero Agency</h1>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button variant={tab === "jobs" ? "default" : "outline"} onClick={() => navigate({ search: { tab: "jobs" } })}>Jobs & stamps</Button>
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
            <select aria-label="Card size" className="h-9 rounded-md border bg-background px-2 text-sm" value={size} onChange={e => setSize(e.target.value === "lanyard" ? "lanyard" : "trading")}><option value="trading">Trading card · 2.5 × 3.5 in</option><option value="lanyard">Lanyard · 3 × 4 in</option></select>
            <select aria-label="PDF page size" className="h-9 rounded-md border bg-background px-2 text-sm" value={layout} onChange={e => setLayout(e.target.value === "cards" ? "cards" : "letter")}>
              <option value="letter">Letter sheets · {size === "trading" ? 6 : 4} per page</option>
              <option value="cards">Individual card pages</option>
            </select>
            <Button disabled={!pdf || !deliver} onClick={() => { if (pdf && deliver) void deliver(pdf, `hero-agency-${size}-${layout}.pdf`); }}>
              {!pdf && licenses.length > 0 && !pdfError ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {!pdf && licenses.length > 0 && !pdfError ? "Preparing PDF…" : "Download PDF"}
            </Button>
            <Button variant="outline" disabled={!licenses.length} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            <span className="w-full text-sm text-muted-foreground">{size === "trading" ? "Trading cards: 2.5 × 3.5 in." : "Lanyard cards: 3 × 4 in; punch the dotted circle."} Print at Actual size / 100%; cut along the borders.</span>
          </div>
          {pdfError && <p role="alert" className="no-print text-sm text-destructive">{pdfError}</p>}
          {!licenses.length && <p className="no-print text-muted-foreground">No jobs assigned yet. Open "Jobs & stamps" and tap "Fill empty jobs".</p>}
          <div className="print-area flex flex-wrap justify-center gap-3">
            {licenses.map(({ job, name }) => <LicenseCard key={job.id} job={job} name={name} size={size} />)}
          </div>
        </>
      )}
    </div>
  );
}
