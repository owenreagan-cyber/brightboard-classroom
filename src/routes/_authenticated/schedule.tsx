import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScaledSlide, SlideView } from "@/components/board/SlideView";
import { StagedBadge } from "@/components/board/Library";
import { DAYS, dayOf, weekGrid, type Day, type Folder } from "@/lib/library";
import { CLASSES, DEFAULT_ROSTERS, classFor, displayNames, type ClassName } from "@/lib/rosters";
import { artFor } from "@/lib/art";
import type { Slide, SlideData } from "@/lib/board";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Class Schedule — Hero Board" },
      { name: "description", content: "Plan each day's blocks, specials and boards for the week ahead." },
      { property: "og:title", content: "Class Schedule — Hero Board" },
      { property: "og:description", content: "Plan each day's blocks, specials and boards for the week ahead." },
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

  useEffect(() => {
    setNow(new Date());
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
  const today = now ? dayOf(now) : null;
  const mins = now ? now.getHours() * 60 + now.getMinutes() : -1;
  const grid = weekGrid(slides);
  const days = focus === "week" ? [...DAYS] : [focus];
  const names = (c: ClassName) => rosters[c] ?? DEFAULT_ROSTERS[c];
  const assessments = slides.filter((s) => s.data.folder === "Assessments");

  return (
    <div className="min-h-screen bg-secondary">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-2">
        <Button asChild variant="outline" size="sm"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <h1 className="font-display text-xl text-primary">Class Schedule</h1>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button size="sm" variant={focus === "week" ? "default" : "outline"} onClick={() => setFocus("week")}>Week</Button>
          {DAYS.map((d) => <Button key={d} size="sm" variant={focus === d ? "default" : "outline"} onClick={() => setFocus(d)}>{d}{d === today ? " •" : ""}</Button>)}
        </div>
      </header>
      <div className="flex flex-col gap-4 p-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 p-2 text-left">Block</th>
                {days.map((d) => <th key={d} className={`p-2 text-left font-display ${d === today ? "bg-accent text-accent-foreground" : ""}`}>{d}{d === today ? " (today)" : ""}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((b) => {
                const isNow = mins >= b.from && mins < b.to;
                return (
                  <tr key={b.folder} className={`border-t ${isNow ? "bg-primary/10" : ""}`}>
                    <td className="p-2 align-top">
                      <div className="flex items-center gap-2">
                        {artFor({ folder: b.folder }) && <img src={artFor({ folder: b.folder })!} alt="" className="h-10 w-10 rounded-md border-2 border-foreground object-cover" />}
                        <div>
                          <div className="font-bold">{b.folder === "Specials" ? "Specials" : b.cells[0]!.label}</div>
                          <div className="text-xs text-muted-foreground">{b.time}</div>
                          {isNow && <span className="rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">NOW</span>}
                        </div>
                      </div>
                    </td>
                    {b.cells.filter((c) => days.includes(c.day)).map((c) => (
                      <td key={c.day} className={`p-2 align-top ${c.day === today ? "bg-accent/20" : ""}`}>
                        {b.folder === "Specials" && <div className="mb-1 flex items-center gap-1 text-xs font-bold"><img src={artFor({ folder: "Specials", day: c.day }) ?? ""} alt="" className="h-5 w-5 rounded" />{c.label}</div>}
                        <div className="space-y-1">
                          {c.slides.map((s) => (
                            <button key={s.id} onClick={() => open(s)} className="block w-full max-w-48 rounded-lg p-1 text-left ring-1 ring-border hover:ring-primary">
                              <ScaledSlide className="aspect-video w-full rounded"><SlideView data={s.data} names={[]} thumb /></ScaledSlide>
                              <div className="mt-1 truncate text-xs font-bold">{s.title}</div>
                              {s.data.staged && <StagedBadge />}
                            </button>
                          ))}
                          {!c.slides.length && (
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => create(b.folder as Folder, c.day, b.folder === "Specials" ? c.label : b.folder)}><Plus className="h-3 w-3" /> Create board</Button>
                          )}
                        </div>
                        {b.folder !== "Specials" && ["Homeroom", "Reading", "Math"].includes(b.folder) && focus !== "week" && (
                          <p className="mt-1 text-xs text-muted-foreground">{classFor(b.folder)} class · {names(classFor(b.folder)).length} students</p>
                        )}
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
        <aside className="w-full shrink-0 rounded-2xl border bg-card p-3 lg:w-72">
          <h2 className="mb-2 font-display text-lg">Class lists</h2>
          <div className="mb-2 flex gap-1">{CLASSES.map((c) => <Button key={c} size="sm" variant={tab === c ? "default" : "outline"} onClick={() => setTab(c)}>{c}</Button>)}</div>
          <p className="mb-1 text-xs text-muted-foreground">{names(tab).length} students · used by {tab === "Homeroom" ? "every board except Reading and Math" : `${tab} boards`}</p>
          <ol className="list-decimal space-y-0.5 pl-5 text-sm">
            {names(tab).map((n, i) => <li key={n + i}>{n} <span className="text-xs text-muted-foreground">({displayNames(names(tab))[i]})</span></li>)}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Edit these from Class list on the board.</p>
        </aside>
      </div>
    </div>
  );
}
