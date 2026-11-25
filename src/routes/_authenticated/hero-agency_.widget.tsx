import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroJobs } from "@/components/board/HeroJobs";
import { supabase } from "@/integrations/supabase/client";
import { displayNames } from "@/lib/rosters";

export const Route = createFileRoute("/_authenticated/hero-agency_/widget")({
  head: () => ({ meta: [
    { title: "Hero Agency Phone Widget — Hero Board" },
    { name: "description", content: "Open classroom jobs and stamps on your phone with separately saved Hero Agency records." },
    { property: "og:title", content: "Hero Agency Phone Widget — Hero Board" },
    { property: "og:description", content: "Teacher phone controls for saved classroom jobs, check-ins and stamps." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: HeroPhoneWidget,
});
function HeroPhoneWidget() {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => { void supabase.from("rosters").select("students").eq("name", "Homeroom").maybeSingle().then(({ data }) => setNames(displayNames(data?.students ?? []))); }, []);
  return <main className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
    <header className="flex items-center gap-3"><Button asChild variant="outline" size="icon"><Link to="/hero-agency" search={{ tab: "jobs" }} aria-label="Back to Hero Agency"><ArrowLeft className="h-4 w-4" /></Link></Button><h1 className="font-display text-2xl">Hero Agency</h1></header>
    <HeroJobs names={names} wide />
  </main>;
}