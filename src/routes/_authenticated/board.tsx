import { setSpotifyPresenting } from "@/lib/spotify";
import { CLASSES, DEFAULT_ROSTERS, classFor, displayNames, upgradeRoster, type ClassName } from "@/lib/rosters";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Download, Layers, Upload, LogOut, Play, Plus, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScaledSlide, SlideView } from "@/components/board/SlideView";
import { FloatingLayer } from "@/components/board/floating";
import { SlideEditor } from "@/components/board/SlideEditor";
import { formatSec, templateSlides, type Slide, type SlideData } from "@/lib/board";
import { DAYS, FOLDERS, applyToAllDays, guessFolder, blockCountdown, suggest, exportLibrary, isAssessment, toBoardJson, type Folder } from "@/lib/library";
import { ImportDialog, LibraryList, StagedBadge, SuggestionBar, download } from "@/components/board/Library";
import mascot from "@/assets/mascot-hero.png";
import { cleanTheme, setSubjectThemes } from "@/lib/subject-theme";
import { applyOffDays, loadSettings, loadWeekEvents } from "@/lib/school-sync";
import { weekStart } from "@/lib/calendar";

type Search = { slide?: number | undefined };

export const Route = createFileRoute("/_authenticated/board")({
  validateSearch: (s: Record<string, unknown>): Search => ({ slide: s["slide"] ? Number(s["slide"]) : undefined }),
  head: () => ({
    meta: [
      { title: "My Class Board — Hero Board" },
      { name: "description", content: "Edit and present your classroom slides, timers and tools." },
      { property: "og:title", content: "My Class Board — Hero Board" },
      { property: "og:description", content: "Edit and present your classroom slides, timers and tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Board,
});

function Board() {
  const navigate = useNavigate({ from: "/board" });
  const { slide: slideParam } = Route.useSearch();
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [pane, setPane] = useState<"list" | "slide" | "edit">("slide");
  const [rosters, setRosters] = useState<Record<string, { id: string; students: string[] }>>({});
  const [rosterClass, setRosterClass] = useState<ClassName>("Homeroom");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterText, setRosterText] = useState("");
  const [presenting, setPresenting] = useState(false);
  useEffect(() => setSpotifyPresenting(presenting), [presenting]);
  const [importOpen, setImportOpen] = useState(false);
  const idx = Math.min(Math.max(0, (slideParam ?? 1) - 1), Math.max(0, (slides?.length ?? 1) - 1));
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const go = useCallback((i: number) => navigate({ search: { slide: i + 1 }, replace: true }), [navigate]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const saved = (auth.user?.user_metadata?.["subjectThemes"] ?? {}) as Record<string, unknown>;
      setSubjectThemes(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, cleanTheme(v)])));
      await loadSettings();
      const monday = weekStart(new Date());
      loadWeekEvents(monday).then((r) => applyOffDays(r.events, monday)).catch(() => {});
      const { data, error } = await supabase.from("slides").select("id, position, title, data").order("position");
      if (error) { toast.error(error.message); return; }
      let rows = data as unknown as Slide[];
      if (!rows.length) {
        const ins = await supabase.from("slides").insert(templateSlides().map((s) => ({ ...s, data: s.data as never }))).select("id, position, title, data").order("position");
        if (ins.error) { toast.error(ins.error.message); return; }
        rows = ins.data as unknown as Slide[];
      }
      setSlides(rows);
      const r = await supabase.from("rosters").select("id, name, students");
      const map: Record<string, { id: string; students: string[] }> = {};
      (r.data ?? []).forEach((x) => { map[x.name] = { id: x.id, students: x.students }; });
      const missing = CLASSES.filter((c) => !map[c]);
      if (missing.length) {
        const ins = await supabase.from("rosters").insert(missing.map((c) => ({ name: c, students: DEFAULT_ROSTERS[c] }))).select("id, name, students");
        (ins.data ?? []).forEach((x) => { map[x.name] = { id: x.id, students: x.students }; });
      }
      for (const c of CLASSES) {
        const up = map[c] && upgradeRoster(c, map[c].students);
        if (up && map[c]) { await supabase.from("rosters").update({ students: up }).eq("id", map[c].id); map[c] = { ...map[c], students: up }; }
      }
      setRosters(map);
    })();
  }, []);

  useEffect(() => {
    if (slides?.[idx]) document.title = `${idx + 1}/${slides.length} — ${slides[idx]!.title}`;
  }, [idx, slides]);

  const save = (s: Slide) => {
    setSlides((all) => all?.map((x) => (x.id === s.id ? s : x)) ?? null);
    clearTimeout(timers.current[s.id]);
    timers.current[s.id] = setTimeout(async () => {
      const { error } = await supabase.from("slides").update({ title: s.title, data: s.data as never, updated_at: new Date().toISOString() }).eq("id", s.id);
      if (error) toast.error("Couldn't save: " + error.message);
    }, 600);
  };

  const addSlide = async (from?: Slide) => {
    if (!slides) return;
    const data: SlideData = from ? structuredClone(from.data) : { heading: "New message ✨", body: "Type your first line", bg: "sky", widgets: [] };
    const { data: row, error } = await supabase.from("slides")
      .insert({ title: from ? from.title + " copy" : "New slide", position: slides.length, data: data as never })
      .select("id, position, title, data").single();
    if (error) { toast.error(error.message); return; }
    setSlides([...slides, row as unknown as Slide]);
    go(slides.length);
  };

  const deleteSlide = async (s: Slide) => {
    if (!slides || slides.length <= 1) { toast("Keep at least one slide"); return; }
    const { error } = await supabase.from("slides").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setSlides(slides.filter((x) => x.id !== s.id));
    go(Math.max(0, idx - 1));
  };

  const move = async (dir: -1 | 1) => {
    if (!slides) return;
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    const a = next[idx]!; next[idx] = next[j]!; next[j] = a;
    const withPos = next.map((s, i) => ({ ...s, position: i }));
    setSlides(withPos);
    go(j);
    await Promise.all(withPos.map((s) => supabase.from("slides").update({ position: s.position }).eq("id", s.id)));
  };

  const insertMany = async (rows: { title: string; data: SlideData }[]) => {
    if (!slides || !rows.length) return [];
    const { data, error } = await supabase.from("slides")
      .insert(rows.map((r, i) => ({ title: r.title, position: slides.length + i, data: r.data as never })))
      .select("id, position, title, data").order("position");
    if (error) { toast.error(error.message); return []; }
    const added = data as unknown as Slide[];
    setSlides([...slides, ...added]);
    return added;
  };

  const createWeek = async (folder: Folder) => {
    if (!slides) return;
    const missing = DAYS.filter((d) => !slides.some((s) => s.data.folder === folder && s.data.day === d));
    const added = await insertMany(missing.map((day) => ({ title: `${folder} ${day}`, data: { heading: `${folder} ✨`, body: "Type your first line", bg: folder === "Assessments" ? "cream" : "sky", widgets: [], folder, day } })));
    if (added[0]) { go(slides.length); toast.success(`Created ${added.length} ${folder} boards`); }
  };

  const applyAll = async () => {
    if (!slides) return;
    const cur = slides[idx]!;
    if (!cur.data.folder || !cur.data.day) { toast("Pick a folder and day for this board first"); return; }
    const { updates, missing } = applyToAllDays(slides, cur);
    updates.forEach(save);
    const added = await insertMany(missing.map((day) => ({ title: `${cur.data.folder} ${day}`, data: { ...structuredClone(cur.data), day } })));
    toast.success(`Layout copied to ${updates.length + added.length} other days`);
  };

  const importBoards = async (rows: { title: string; data: SlideData }[]) => {
    const added = await insertMany(rows);
    if (added.length && slides) { go(slides.length); toast.success(`Staged ${added.length} board(s) for review`); }
  };

  const saveRoster = async () => {
    const list = rosterText.split("\n").map((n) => n.trim()).filter(Boolean);
    const existing = rosters[rosterClass];
    const res = existing
      ? await supabase.from("rosters").update({ students: list }).eq("id", existing.id).select("id").single()
      : await supabase.from("rosters").insert({ name: rosterClass, students: list }).select("id").single();
    if (res.error) { toast.error(res.error.message); return; }
    setRosters({ ...rosters, [rosterClass]: { id: res.data.id, students: list } });
    setRosterOpen(false);
    toast.success(`Saved ${list.length} students`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (!slides) return <div className="flex min-h-screen items-center justify-center font-display text-2xl text-primary">Loading your board…</div>;
  const current = slides[idx]!;
  const names = displayNames(rosters[classFor(current.data.folder)]?.students ?? []);
  const openRoster = (c: ClassName) => { setRosterClass(c); setRosterText((rosters[c]?.students ?? []).join("\n")); };

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-2">
        <img src={mascot} alt="" width={40} height={40} className="h-10 w-10" />
        <span className="font-display text-xl text-primary">Hero Board</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/schedule"><CalendarDays className="h-4 w-4" /> Schedule</Link></Button>
          <Button asChild variant="outline"><Link to="/music">🎵 Music</Link></Button>
          <Button asChild variant="outline"><Link to="/characters" search={{ slide: undefined }}>🥷 Characters</Link></Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Import JSON</Button>
          <Button variant="outline" onClick={() => download(`${current.title}.json`, JSON.stringify({ version: 1, boards: [toBoardJson(current)] }, null, 2))}><Download className="h-4 w-4" /> Export board</Button>
          <Button variant="outline" onClick={() => download("hero-board-library.json", exportLibrary(slides))}><Download className="h-4 w-4" /> Export library</Button>
          <Button variant="outline" onClick={() => { openRoster(classFor(current.data.folder)); setRosterOpen(true); }}><Users className="h-4 w-4" /> Class list</Button>
          <Button onClick={() => { setPresenting(true); document.documentElement.requestFullscreen?.().catch(() => {}); }}><Play className="h-4 w-4" /> Present</Button>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex border-b bg-card md:hidden" role="tablist" aria-label="Board sections">
        {([["list", "Boards"], ["slide", "Slide"], ["edit", "Edit"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={pane === k} onClick={() => setPane(k)} className={`flex-1 py-2 text-sm font-bold ${pane === k ? "border-b-4 border-primary text-primary" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className={`${pane === "list" ? "block" : "hidden"} w-full shrink-0 space-y-3 overflow-y-auto border-r bg-card p-3 pb-24 md:block md:w-56`}>
          <LibraryList slides={slides} currentId={current.id} names={names} onOpen={(s) => { go(slides.indexOf(s)); setPane("slide"); }} onCreateWeek={createWeek} />
          <Button variant="secondary" className="w-full" onClick={() => addSlide()}><Plus className="h-4 w-4" /> New slide</Button>
        </aside>

        <main className={`${pane === "slide" ? "flex" : "hidden"} min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pb-24 md:flex md:p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /> Move up</Button>
            <Button size="sm" variant="outline" onClick={() => move(1)}>Move down <ChevronRight className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => addSlide(current)}><Copy className="h-4 w-4" /> Duplicate</Button>
            <Button size="sm" variant="outline" asChild><Link to="/characters" search={{ slide: current.id }}>🥷 Swap characters</Link></Button>
            <Button size="sm" variant="outline" onClick={() => deleteSlide(current)}><Trash2 className="h-4 w-4" /> Delete</Button>
            <select aria-label="Folder" className="h-9 rounded-md border bg-card px-2 text-sm" value={current.data.folder ?? ""}
              onChange={(e) => save({ ...current, data: { ...current.data, folder: (e.target.value || undefined) as SlideData["folder"] } })}>
              <option value="">No folder</option>{FOLDERS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <select aria-label="Day" className="h-9 rounded-md border bg-card px-2 text-sm" value={current.data.day ?? ""}
              onChange={(e) => save({ ...current, data: { ...current.data, day: (e.target.value || undefined) as SlideData["day"] } })}>
              <option value="">No day</option>{DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={applyAll}><Layers className="h-4 w-4" /> Apply this layout to all days</Button>
            {current.data.staged && <><StagedBadge /><Button size="sm" onClick={() => save({ ...current, data: { ...current.data, staged: false } })}><Check className="h-4 w-4" /> Approve</Button></>}
            {!current.data.folder && guessFolder(`${current.title} ${current.data.heading ?? ""}`) && (
              <Button size="sm" onClick={() => save({ ...current, data: { ...current.data, folder: guessFolder(`${current.title} ${current.data.heading ?? ""}`)! } })}>File under {guessFolder(`${current.title} ${current.data.heading ?? ""}`)}</Button>
            )}
            {isAssessment(current.data) && <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-bold text-background">🔒 Assessment Mode</span>}
          </div>
          <SuggestionBar slides={slides} onOpen={(s) => go(slides.indexOf(s))} />
          <ScaledSlide className="aspect-video w-full shrink-0 rounded-2xl shadow-xl md:aspect-auto md:flex-1"><SlideView data={current.data} names={names} /></ScaledSlide>
        </main>

        <aside className={`${pane === "edit" ? "block" : "hidden"} w-full shrink-0 overflow-y-auto border-l bg-card pb-24 md:block md:w-80`}>
          <SlideEditor key={current.id} slide={current} onChange={save} />
        </aside>
      </div>

      {presenting && <Presenter slides={slides} idx={idx} names={names} go={go} onExit={() => { setPresenting(false); if (document.fullscreenElement) document.exitFullscreen(); }} />}

      <FloatingLayer assessment={isAssessment(current.data)} names={names} large={presenting} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={importBoards} />

      <Dialog open={rosterOpen} onOpenChange={setRosterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Class list</DialogTitle></DialogHeader>
          <div className="flex gap-2">{CLASSES.map((c) => <Button key={c} size="sm" variant={c === rosterClass ? "default" : "outline"} onClick={() => openRoster(c)}>{c}</Button>)}</div>
          <p className="text-sm text-muted-foreground">One full name per line. Reading and Math boards use their own list; all other boards use Homeroom. Pickers show first names (full names when two share a first name).</p>
          <Textarea rows={12} value={rosterText} onChange={(e) => setRosterText(e.target.value)} placeholder={"Ava\nLiam\nMia"} />
          <Button onClick={saveRoster}>Save {rosterClass} list</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Presenter({ slides, idx, names, go, onExit }: { slides: Slide[]; idx: number; names: string[]; go: (i: number) => void; onExit: () => void }) {
  const touchX = useRef<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [auto, setAuto] = useState(false);
  const [idle, setIdle] = useState(false);
  useEffect(() => { setAuto(localStorage.getItem("hb-auto") === "1"); const t = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(t); }, []);
  // Hide the cursor after 3 seconds without movement.
  useEffect(() => {
    let t = window.setTimeout(() => setIdle(true), 3000);
    const move = () => { setIdle(false); window.clearTimeout(t); t = window.setTimeout(() => setIdle(true), 3000); };
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); window.clearTimeout(t); };
  }, []);
  const cd = blockCountdown(now);
  const sugId = suggest(slides, now).current?.id;
  // Auto-advance: jump to the scheduled board when a new block starts.
  const lastSug = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!auto || !sugId || sugId === lastSug.current) { lastSug.current = sugId; return; }
    lastSug.current = sugId;
    const j = slides.findIndex((s) => s.id === sugId);
    if (j >= 0 && j !== idx) go(j);
  }, [auto, sugId, slides, idx, go]);
  const toggleAuto = () => { setAuto((a) => { localStorage.setItem("hb-auto", a ? "0" : "1"); lastSug.current = undefined; return !a; }); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(Math.min(slides.length - 1, idx + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(Math.max(0, idx - 1));
      if (e.key === "Escape") onExit();
    };
    const fs = () => { if (!document.fullscreenElement) onExit(); };
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", fs);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("fullscreenchange", fs); };
  }, [idx, slides.length, go, onExit]);
  return (
    <div
      className={`fixed inset-0 z-50 bg-foreground group ${idle ? "cursor-none" : ""}`}
      onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0]!.clientX - touchX.current;
        if (dx < -50) go(Math.min(slides.length - 1, idx + 1));
        if (dx > 50) go(Math.max(0, idx - 1));
        touchX.current = null;
      }}
    >
      <ScaledSlide className="h-full w-full"><SlideView data={slides[idx]!.data} names={names} /></ScaledSlide>
      {cd && cd.seconds <= 60 * 60 && (
        <div className={`absolute right-4 top-4 rounded-full border-4 border-foreground px-5 py-2 font-display text-2xl shadow-xl ${cd.seconds <= 60 ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-card text-card-foreground"}`}>
          {cd.seconds <= 60 ? "Up next: " : ""}{cd.label} in {formatSec(cd.seconds)}
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/90 px-3 py-1 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" aria-label="Previous slide" onClick={() => go(Math.max(0, idx - 1))}><ChevronLeft /></Button>
        <span className="text-sm font-bold">{idx + 1} / {slides.length}</span>
        <Button size="icon" variant="ghost" aria-label="Next slide" onClick={() => go(Math.min(slides.length - 1, idx + 1))}><ChevronRight /></Button>
        <Button size="sm" variant={auto ? "default" : "ghost"} onClick={toggleAuto} title="Switch to the scheduled board when each block starts">Auto {auto ? "on" : "off"}</Button>
        <Button size="icon" variant="ghost" aria-label="Exit" onClick={onExit}><X /></Button>
      </div>
    </div>
  );
}
