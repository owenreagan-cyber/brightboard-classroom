import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BACKGROUNDS, WORK_SYMBOLS, newWidget, type Slide, type Widget } from "@/lib/board";
import { SUBJECT_DESIGNS, subjectData, subjectDesign, type SubjectKey } from "@/lib/subject-design";
import { artFor } from "@/lib/art";
import { AiDraftPanel, SubjectThemePanel } from "./SubjectTools";
import { SpotifySetup } from "./SpotifySetup";
import { CANVAS_SUBJECTS } from "@/lib/school-sync";
import { STAGED_PRESETS } from "@/lib/staged";

const WIDGET_TYPES: { type: Widget["type"]; label: string }[] = [
  { type: "sequence", label: "Timer sequence" },
  { type: "timer", label: "Timer" },
  { type: "picker", label: "Name picker" },
  { type: "symbols", label: "Work symbols" },
  { type: "clock", label: "Clock" },
  { type: "spotify", label: "Spotify" },
  { type: "lesson", label: "Lesson & homework" },
  { type: "staged", label: "Staged group timer" },
];

export function SlideEditor({ slide, onChange }: { slide: Slide; onChange: (s: Slide) => void }) {
  const d = slide.data;
  const setData = (patch: Partial<Slide["data"]>) => onChange({ ...slide, data: { ...d, ...patch } });
  const setWidget = (id: string, w: Widget) => setData({ widgets: d.widgets.map((x) => (x.id === id ? w : x)) });

  return (
    <>
    <div className="space-y-3 px-4 pt-4">
      <AiDraftPanel slide={slide} onApply={(heading, body) => setData({ heading, body })} />
      <SubjectThemePanel slide={slide} />
    </div>
    <div className="space-y-5 p-4">
      <div className="space-y-1.5">
        <Label>Slide name</Label>
        <Input value={slide.title} onChange={(e) => onChange({ ...slide, title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Big heading</Label>
        <Input value={d.heading} onChange={(e) => setData({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Message (one line per step)</Label>
        <Textarea rows={5} value={d.body} onChange={(e) => setData({ body: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject-design">Subject design</Label>
        <select id="subject-design" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={subjectDesign(d).key}
          onChange={(e) => setData(subjectData(e.target.value as SubjectKey))}>
          {SUBJECT_DESIGNS.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}
        </select>
        <img src={artFor(d)} alt={`${subjectDesign(d).label} schedule card`} className="aspect-video w-full rounded-md object-cover" />
      </div>
      <details className="space-y-1.5">
        <summary className="cursor-pointer text-sm font-medium">Alternate background</summary>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUNDS.map((b) => (
            <Button variant="outline"
              key={b.key}
              onClick={() => setData({ bg: b.key, backgroundStyle: "alternate" })}
              className={`h-auto whitespace-normal border-2 px-2 py-2 text-xs font-semibold ${d.backgroundStyle === "alternate" && d.bg === b.key ? "border-primary bg-primary/10" : "border-border"}`}
            >
              {b.label}
            </Button>
          ))}
          <Button variant="outline" className="col-span-2" onClick={() => setData({ backgroundStyle: "subject" })}>Subject background</Button>
        </div>
      </details>

      <div className="space-y-3">
        <Label>Tools on this slide</Label>
        {d.widgets.map((w) => (
          <div key={w.id} className="rounded-2xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{WIDGET_TYPES.find((t) => t.type === w.type)?.label}</span>
              <Button size="icon" variant="ghost" aria-label="Remove tool" onClick={() => setData({ widgets: d.widgets.filter((x) => x.id !== w.id) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <WidgetFields w={w} onChange={(nw) => setWidget(w.id, nw)} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {WIDGET_TYPES.map((t) => (
            <Button key={t.type} size="sm" variant="secondary" onClick={() => setData({ widgets: [...d.widgets, newWidget(t.type)] })}>
              <Plus className="h-3 w-3" /> {t.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

function SymbolSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="h-9 rounded-md border bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(WORK_SYMBOLS).map(([k, s]) => (
        <option key={k} value={k}>{s.emoji} {s.label}</option>
      ))}
    </select>
  );
}

function WidgetFields({ w, onChange }: { w: Widget; onChange: (w: Widget) => void }) {
  if (w.type === "staged")
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {Object.values(STAGED_PRESETS).map((p) => (
            <Button key={p.label} size="sm" variant="outline" onClick={() => onChange({ ...w, label: p.label, start: p.start, end: p.end, gapMin: p.gapMin, finale: p.finale.map((f) => ({ ...f })) })}>{p.label}</Button>
          ))}
        </div>
        <Input value={w.label} placeholder="Title" onChange={(e) => onChange({ ...w, label: e.target.value })} />
        <div className="flex items-center gap-2">
          <Label className="text-xs">Starts</Label>
          <Input type="time" className="w-32" value={w.start} onChange={(e) => onChange({ ...w, start: e.target.value })} />
          <Label className="text-xs">Ends</Label>
          <Input type="time" className="w-32" value={w.end ?? ""} onChange={(e) => onChange({ ...w, end: e.target.value })} aria-label="Groups end time" />
        </div>
        {w.groups.map((g, i) => (
          <div key={i} className="rounded-xl bg-muted p-2">
            <div className="text-xs font-bold">{g.name}</div>
            <Input value={g.students.join(", ")} aria-label={`${g.name} names`} onChange={(e) => onChange({ ...w, groups: w.groups.map((x, j) => (j === i ? { ...x, students: e.target.value.split(",").map((n) => n.trimStart()) } : x)) })} />
          </div>
        ))}
        <div className="text-xs font-bold">End messages</div>
        {w.finale.map((f, i) => {
          const set = (p: Partial<typeof f>) => onChange({ ...w, finale: w.finale.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="flex gap-1">
              <Input type="time" className="w-32" value={f.time} onChange={(e) => set({ time: e.target.value })} />
              <Input value={f.label} onChange={(e) => set({ label: e.target.value })} />
              <Button size="icon" variant="ghost" aria-label="Remove message" onClick={() => onChange({ ...w, finale: w.finale.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
        <Button size="sm" variant="outline" onClick={() => onChange({ ...w, finale: [...w.finale, { time: "09:15", label: "Ready!" }] })}><Plus className="h-3 w-3" /> Add message</Button>
        <p className="text-xs text-muted-foreground">Group order changes every day automatically.</p>
      </div>
    );
  if (w.type === "lesson")
    return (
      <label className="block text-xs">Canvas subject
        <select className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm" value={w.subject} onChange={(e) => onChange({ ...w, subject: e.target.value })}>
          {CANVAS_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="mt-1 block text-muted-foreground">Shows today's lesson and homework from Canvas.</span>
      </label>
    );
  if (w.type === "timer")
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input value={w.label ?? ""} placeholder="Label" onChange={(e) => onChange({ ...w, label: e.target.value })} />
        <Input type="number" min={1} value={Math.round(w.seconds / 60)} onChange={(e) => onChange({ ...w, seconds: Math.max(1, +e.target.value) * 60 })} aria-label="Minutes" />
      </div>
    );
  if (w.type === "spotify")
    return (
      <div className="space-y-2">
        <Input placeholder="Leave empty to use your class music" value={w.url} onChange={(e) => onChange({ ...w, url: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={w.autoplay !== false} onChange={(e) => onChange({ ...w, autoplay: e.target.checked })} />
          Play automatically when presenting
        </label>
        <SpotifySetup />
      </div>
    );
  if (w.type === "symbols")
    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(WORK_SYMBOLS).map(([k, s]) => {
          const on = w.symbols.includes(k);
          return (
            <button key={k} onClick={() => onChange({ ...w, symbols: on ? w.symbols.filter((x) => x !== k) : [...w.symbols, k] })}
              className={`rounded-full border px-2 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>
              {s.emoji} {s.label}
            </button>
          );
        })}
      </div>
    );
  if (w.type === "sequence")
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Starts at</Label>
          <Input type="time" className="w-32" value={w.start} onChange={(e) => onChange({ ...w, start: e.target.value })} />
        </div>
        {w.steps.map((s, i) => {
          const set = (p: Partial<typeof s>) => onChange({ ...w, steps: w.steps.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="space-y-1 rounded-xl bg-muted p-2">
              <div className="flex gap-1">
                <Input value={s.label} onChange={(e) => set({ label: e.target.value })} />
                <Button size="icon" variant="ghost" aria-label="Remove step" onClick={() => onChange({ ...w, steps: w.steps.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Input type="number" min={1} className="w-20" value={s.minutes} onChange={(e) => set({ minutes: Math.max(1, +e.target.value) })} aria-label="Minutes" />
                <span className="self-center text-xs">min</span>
                <SymbolSelect value={s.symbol} onChange={(v) => set({ symbol: v })} />
              </div>
            </div>
          );
        })}
        <Button size="sm" variant="outline" onClick={() => onChange({ ...w, steps: [...w.steps, { minutes: 5, label: "Next activity", symbol: "quiet" }] })}>
          <Plus className="h-3 w-3" /> Add step
        </Button>
      </div>
    );
  return <p className="text-xs text-muted-foreground">{w.type === "picker" ? "Uses your class list." : "Shows the time and date."}</p>;
}
