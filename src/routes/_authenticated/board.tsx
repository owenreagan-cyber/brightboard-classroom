import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, LogOut, Play, Plus, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScaledSlide, SlideView } from "@/components/board/SlideView";
import { SlideEditor } from "@/components/board/SlideEditor";
import { templateSlides, type Slide, type SlideData } from "@/lib/board";
import mascot from "@/assets/mascot.png";

type Search = { slide?: number };

export const Route = createFileRoute("/_authenticated/board")({
  validateSearch: (s: Record<string, unknown>): Search => ({ slide: s.slide ? Number(s.slide) : undefined }),
  head: () => ({
    meta: [
      { title: "My Class Board — Sakura Board" },
      { name: "description", content: "Edit and present your classroom slides, timers and tools." },
      { property: "og:title", content: "My Class Board — Sakura Board" },
      { property: "og:description", content: "Edit and present your classroom slides, timers and tools." },
    ],
  }),
  component: Board,
});

function Board() {
  const navigate = useNavigate({ from: "/board" });
  const { slide: slideParam } = Route.useSearch();
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [rosterId, setRosterId] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterText, setRosterText] = useState("");
  const [presenting, setPresenting] = useState(false);
  const idx = Math.min(Math.max(0, (slideParam ?? 1) - 1), Math.max(0, (slides?.length ?? 1) - 1));
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const go = useCallback((i: number) => navigate({ search: { slide: i + 1 }, replace: true }), [navigate]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("slides").select("id, position, title, data").order("position");
      if (error) return toast.error(error.message);
      let rows = data as unknown as Slide[];
      if (!rows.length) {
        const ins = await supabase.from("slides").insert(templateSlides().map((s) => ({ ...s, data: s.data as never }))).select("id, position, title, data").order("position");
        if (ins.error) return toast.error(ins.error.message);
        rows = ins.data as unknown as Slide[];
      }
      setSlides(rows);
      const r = await supabase.from("rosters").select("id, students").limit(1).maybeSingle();
      if (r.data) { setRosterId(r.data.id); setNames(r.data.students); }
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
    if (error) return toast.error(error.message);
    setSlides([...slides, row as unknown as Slide]);
    go(slides.length);
  };

  const deleteSlide = async (s: Slide) => {
    if (!slides || slides.length <= 1) return toast("Keep at least one slide");
    const { error } = await supabase.from("slides").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    setSlides(slides.filter((x) => x.id !== s.id));
    go(Math.max(0, idx - 1));
  };

  const move = async (dir: -1 | 1) => {
    if (!slides) return;
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[idx], next[j]] = [next[j], next[idx]];
    const withPos = next.map((s, i) => ({ ...s, position: i }));
    setSlides(withPos);
    go(j);
    await Promise.all(withPos.map((s) => supabase.from("slides").update({ position: s.position }).eq("id", s.id)));
  };

  const saveRoster = async () => {
    const list = rosterText.split("\n").map((n) => n.trim()).filter(Boolean);
    const res = rosterId
      ? await supabase.from("rosters").update({ students: list }).eq("id", rosterId).select("id").single()
      : await supabase.from("rosters").insert({ students: list }).select("id").single();
    if (res.error) return toast.error(res.error.message);
    setRosterId(res.data.id);
    setNames(list);
    setRosterOpen(false);
    toast.success(`Saved ${list.length} students`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  if (!slides) return <div className="flex min-h-screen items-center justify-center font-display text-2xl text-primary">Loading your board…</div>;
  const current = slides[idx]!;

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <header className="flex items-center gap-3 border-b bg-card px-4 py-2">
        <img src={mascot} alt="" width={40} height={40} className="h-10 w-10" />
        <span className="font-display text-xl text-primary">Sakura Board</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => { setRosterText(names.join("\n")); setRosterOpen(true); }}><Users className="h-4 w-4" /> Class list</Button>
          <Button onClick={() => { setPresenting(true); document.documentElement.requestFullscreen?.().catch(() => {}); }}><Play className="h-4 w-4" /> Present</Button>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 space-y-3 overflow-y-auto border-r bg-card p-3">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => go(i)} className={`block w-full text-left rounded-xl p-1 ${i === idx ? "ring-4 ring-primary" : "ring-1 ring-border"}`}>
              <ScaledSlide className="aspect-video w-full rounded-lg"><SlideView data={s.data} names={names} thumb /></ScaledSlide>
              <div className="mt-1 truncate px-1 text-xs font-bold">{i + 1}. {s.title}</div>
            </button>
          ))}
          <Button variant="secondary" className="w-full" onClick={() => addSlide()}><Plus className="h-4 w-4" /> New slide</Button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col p-4 gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /> Move up</Button>
            <Button size="sm" variant="outline" onClick={() => move(1)}>Move down <ChevronRight className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => addSlide(current)}><Copy className="h-4 w-4" /> Duplicate</Button>
            <Button size="sm" variant="outline" onClick={() => deleteSlide(current)}><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>
          <ScaledSlide className="flex-1 rounded-2xl shadow-xl"><SlideView data={current.data} names={names} /></ScaledSlide>
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l bg-card">
          <SlideEditor key={current.id} slide={current} onChange={save} />
        </aside>
      </div>

      {presenting && <Presenter slides={slides} idx={idx} names={names} go={go} onExit={() => { setPresenting(false); if (document.fullscreenElement) document.exitFullscreen(); }} />}

      <Dialog open={rosterOpen} onOpenChange={setRosterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Class list</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">One student name per line. Used by the name picker.</p>
          <Textarea rows={12} value={rosterText} onChange={(e) => setRosterText(e.target.value)} placeholder={"Ava\nLiam\nMia"} />
          <Button onClick={saveRoster}>Save class list</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Presenter({ slides, idx, names, go, onExit }: { slides: Slide[]; idx: number; names: string[]; go: (i: number) => void; onExit: () => void }) {
  const touchX = useRef<number | null>(null);
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
      className="fixed inset-0 z-50 bg-foreground group"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -50) go(Math.min(slides.length - 1, idx + 1));
        if (dx > 50) go(Math.max(0, idx - 1));
        touchX.current = null;
      }}
    >
      <ScaledSlide className="h-full w-full"><SlideView data={slides[idx]!.data} names={names} /></ScaledSlide>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/90 px-3 py-1 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" aria-label="Previous slide" onClick={() => go(Math.max(0, idx - 1))}><ChevronLeft /></Button>
        <span className="text-sm font-bold">{idx + 1} / {slides.length}</span>
        <Button size="icon" variant="ghost" aria-label="Next slide" onClick={() => go(Math.min(slides.length - 1, idx + 1))}><ChevronRight /></Button>
        <Button size="icon" variant="ghost" aria-label="Exit" onClick={onExit}><X /></Button>
      </div>
    </div>
  );
}
