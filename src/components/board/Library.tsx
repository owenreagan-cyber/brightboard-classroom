import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileJson, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScaledSlide, SlideView } from "./SlideView";
import { DAYS, FOLDERS, SCHEMA_EXAMPLE, parseImport, suggest, type Folder } from "@/lib/library";
import type { Slide, SlideData } from "@/lib/board";

export function StagedBadge() {
  return <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Staged — review</span>;
}

export function SuggestionBar({ slides, onOpen }: { slides: Slide[]; onOpen: (s: Slide) => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  if (!now) return null;
  const { current, next } = suggest(slides, now);
  if (!current && !next) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-primary bg-card px-3 py-2 text-sm">
      <Sparkles className="h-4 w-4 text-primary" />
      {current && <><span>Now: <b>{current.data.folder} / {current.data.day}</b></span><Button size="sm" onClick={() => onOpen(current)}>Open</Button></>}
      {next && <><span className="ml-2">Up next: <b>{next.data.folder}</b></span><Button size="sm" variant="outline" onClick={() => onOpen(next)}>Next →</Button></>}
    </div>
  );
}

export function LibraryList({ slides, currentId, names, onOpen, onCreateWeek }: {
  slides: Slide[]; currentId: string; names: string[]; onOpen: (s: Slide) => void; onCreateWeek: (f: Folder) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups: { key: string; label: string; items: Slide[]; folder?: Folder }[] = [
    ...FOLDERS.map((f) => ({ key: f, label: f, folder: f, items: DAYS.map((d) => slides.find((s) => s.data.folder === f && s.data.day === d)).filter(Boolean) as Slide[] })),
    { key: "other", label: "Other boards", items: slides.filter((s) => !s.data.folder || !s.data.day || slides.find((x) => x.data.folder === s.data.folder && x.data.day === s.data.day) !== s) },
  ];
  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isOpen = open[g.key] ?? g.items.some((s) => s.id === currentId);
        return (
          <div key={g.key} className="rounded-xl border">
            <button className="flex w-full items-center gap-1 px-2 py-2 text-left text-sm font-bold" onClick={() => setOpen({ ...open, [g.key]: !isOpen })}>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {g.folder === "Assessments" && <Lock className="h-3 w-3" />}{g.label}
              <span className="ml-auto text-xs text-muted-foreground">{g.items.length}</span>
            </button>
            {isOpen && (
              <div className="space-y-2 p-2 pt-0">
                {g.items.map((s) => (
                  <button key={s.id} onClick={() => onOpen(s)} className={`block w-full rounded-lg p-1 text-left ${s.id === currentId ? "ring-4 ring-primary" : "ring-1 ring-border"}`}>
                    <ScaledSlide className="aspect-video w-full rounded-md"><SlideView data={s.data} names={names} thumb /></ScaledSlide>
                    <div className="mt-1 flex items-center gap-1 px-1 text-xs font-bold">
                      <span className="truncate">{s.data.day ? `${s.data.day} · ` : ""}{s.title}</span>
                      {s.data.staged && <StagedBadge />}
                    </div>
                  </button>
                ))}
                {g.folder && g.items.length < 5 && (
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => onCreateWeek(g.folder!)}>Create Mon–Fri boards</Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ImportDialog({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (o: boolean) => void; onImport: (boards: { title: string; data: SlideData }[]) => Promise<void> }) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const run = async (t: string) => {
    const r = parseImport(t);
    if (!r.ok) { setErrors(r.errors); return; }
    setErrors([]); await onImport(r.boards); setText(""); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Import boards (JSON)</DialogTitle></DialogHeader>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={async (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { const t = await f.text(); setText(t); run(t); } }}
          className={`rounded-xl border-4 border-dashed p-4 text-center text-sm ${drag ? "border-primary bg-accent" : "border-border"}`}
        >
          <FileJson className="mx-auto mb-1 h-6 w-6" /> Drop a .json file here, or paste below.
          <input type="file" accept="application/json,.json" className="mx-auto mt-2 block text-xs" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const t = await f.text(); setText(t); run(t); } }} />
        </div>
        <Textarea rows={10} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={JSON.stringify(SCHEMA_EXAMPLE, null, 2)} />
        {errors.length > 0 && (
          <ul className="max-h-32 overflow-y-auto rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
        )}
        <div className="flex gap-2">
          <Button onClick={() => run(text)} disabled={!text.trim()}>Validate & stage</Button>
          <Button variant="outline" onClick={() => setText(JSON.stringify(SCHEMA_EXAMPLE, null, 2))}>Show example</Button>
        </div>
        <p className="text-xs text-muted-foreground">Imported boards are marked "Staged — review" until you approve them.</p>
      </DialogContent>
    </Dialog>
  );
}

export function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
