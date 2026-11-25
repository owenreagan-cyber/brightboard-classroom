import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { BUBBLE_STYLES, newWidget, type BubbleStyle, type Slide, type Widget } from "@/lib/board";
import { SUBJECT_DESIGNS } from "@/lib/subject-design";
import { figureForKey } from "@/lib/art";
import { StickerWidget } from "@/components/board/widgets";

export const Route = createFileRoute("/_authenticated/characters")({
  validateSearch: (s: Record<string, unknown>): { slide?: string | undefined } => ({ slide: typeof s["slide"] === "string" ? s["slide"] : undefined }),
  head: () => ({
    meta: [
      { title: "Character Gallery — Hero Board" },
      { name: "description", content: "Browse every subject's anime character and speech bubble, then put them on a slide." },
      { property: "og:title", content: "Character Gallery — Hero Board" },
      { property: "og:description", content: "Browse every subject's anime character and speech bubble, then put them on a slide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CharactersPage,
});

type Sticker = Extract<Widget, { type: "sticker" }>;

function CharactersPage() {
  const { slide: slideParam } = Route.useSearch();
  const [subject, setSubject] = useState("homeroom");
  const [bubble, setBubble] = useState<BubbleStyle>("speech");
  const [side, setSide] = useState<"left" | "right">("left");
  const [text, setText] = useState("Remember to push in your chair!");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [slideId, setSlideId] = useState("");
  const [target, setTarget] = useState("new");

  useEffect(() => {
    void supabase.from("slides").select("id, position, title, data").order("position").then(({ data, error }) => {
      if (error) { toast.error(error.message); return; }
      const rows = data as unknown as Slide[];
      setSlides(rows);
      const pick = rows.find((r) => r.id === slideParam) ?? rows[0];
      if (pick) setSlideId(pick.id);
    });
  }, [slideParam]);

  const slide = slides.find((s) => s.id === slideId);
  const stickers = useMemo(() => (slide?.data.widgets ?? []).filter((w): w is Sticker => w.type === "sticker"), [slide]);
  useEffect(() => { setTarget("new"); }, [slideId]);
  const loadFrom = (id: string) => {
    setTarget(id);
    const w = stickers.find((x) => x.id === id);
    if (w) { setSubject(w.subject); setBubble(w.bubble ?? "speech"); setSide(w.side ?? "left"); setText(w.text); }
  };

  const preview: Sticker = { id: "preview", type: "sticker", subject, text, side, bubble };

  const apply = async () => {
    if (!slide) return;
    const widgets = target === "new"
      ? [...slide.data.widgets, { ...(newWidget("sticker") as Sticker), subject, text, side, bubble }]
      : slide.data.widgets.map((w) => (w.id === target ? { ...w, subject, text, side, bubble } : w));
    const data = { ...slide.data, widgets };
    const { error } = await supabase.from("slides").update({ data: data as never, updated_at: new Date().toISOString() }).eq("id", slide.id);
    if (error) { toast.error(error.message); return; }
    setSlides(slides.map((s) => (s.id === slide.id ? { ...s, data } : s)));
    toast.success(target === "new" ? `Added to ${slide.title}` : `Swapped on ${slide.title}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link to="/board" search={{ slide: undefined }}><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <h1 className="font-display text-3xl">{slideParam && slide ? `Characters on ${slide.title}` : "Character gallery"}</h1>
      </div>
      {slide && (
        <div className="space-y-2 rounded-xl border-2 bg-card p-3">
          <div className="font-display text-lg">On this slide</div>
          <div className="flex flex-wrap gap-2">
            {stickers.map((w, i) => (
              <button key={w.id} onClick={() => loadFrom(w.id)} aria-pressed={target === w.id}
                className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left text-sm ${target === w.id ? "border-primary bg-primary/10" : "border-border"}`}>
                <img src={figureForKey(w.subject)} alt="" className="h-14 w-10 object-contain" />
                <span>Swap #{i + 1}<br /><span className="text-muted-foreground">{w.text.slice(0, 24) || "(no text)"}</span></span>
              </button>
            ))}
            <button onClick={() => setTarget("new")} aria-pressed={target === "new"}
              className={`rounded-lg border-2 border-dashed p-2 text-sm ${target === "new" ? "border-primary bg-primary/10" : "border-border"}`}>+ Add a new one</button>
          </div>
        </div>
      )}
      <p className="text-muted-foreground">Tap a character, pick a bubble, then add it to a slide or swap one that's already there.</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {SUBJECT_DESIGNS.filter((s) => s.key !== "hero").map((s) => (
            <button key={s.key} onClick={() => setSubject(s.key)} aria-pressed={subject === s.key}
              className={`rounded-xl border-2 p-2 text-center transition ${subject === s.key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
              <img src={figureForKey(s.key)} alt={`${s.label} character`} loading="lazy" className="mx-auto h-36 w-full object-contain" />
              <div className="mt-1 font-display text-sm">{s.label}</div>
            </button>
          ))}
        </div>

        <aside className="space-y-4 rounded-xl border-2 bg-card p-4 lg:sticky lg:top-4 lg:self-start">
          <div data-subject={subject} className="subject-slide overflow-hidden rounded-lg bg-background p-2">
            <div className="origin-top-left" style={{ width: 1000, transform: "scale(0.34)", height: 160 }}>
              <StickerWidget w={preview} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BUBBLE_STYLES.map((b) => (
              <Button key={b.key} size="sm" variant={bubble === b.key ? "default" : "outline"} onClick={() => setBubble(b.key)}>{b.label}</Button>
            ))}
          </div>
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="Bubble text" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={side === "right"} onChange={(e) => setSide(e.target.checked ? "right" : "left")} /> Bubble on the left
          </label>
          <label className="block text-sm">Slide
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2" value={slideId} onChange={(e) => setSlideId(e.target.value)}>
              {slides.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
          <label className="block text-sm">Character on that slide
            <select className="mt-1 h-9 w-full rounded-md border bg-background px-2" value={target} onChange={(e) => loadFrom(e.target.value)}>
              <option value="new">+ Add a new one</option>
              {stickers.map((w, i) => <option key={w.id} value={w.id}>Swap #{i + 1}: {w.text.slice(0, 30) || "(no text)"}</option>)}
            </select>
          </label>
          <Button className="w-full" disabled={!slide} onClick={apply}>{target === "new" ? "Add to slide" : "Swap on slide"}</Button>
        </aside>
      </div>
    </div>
  );
}
