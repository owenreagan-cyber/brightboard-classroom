import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BACKGROUNDS, type Slide } from "@/lib/board";
import { subjectDesign } from "@/lib/subject-design";
import { CARD_PLACEMENTS, THEME_FONTS, cleanTheme, setSubjectThemes, useSubjectThemes, type SubjectTheme } from "@/lib/subject-theme";
import { draftSlideText } from "@/lib/draft.functions";

const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function SubjectThemePanel({ slide }: { slide: Slide }) {
  const subject = subjectDesign(slide.data);
  const themes = useSubjectThemes();
  const theme = themes[subject.key] ?? {};
  const [saving, setSaving] = useState(false);
  const update = (patch: Record<string, unknown>) => setSubjectThemes({ ...themes, [subject.key]: cleanTheme({ ...theme, ...patch }) });
  const persist = async (next = themes) => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { subjectThemes: next } });
    setSaving(false);
    if (error) toast.error("Couldn't save theme"); else toast.success(`${subject.label} default theme saved`);
  };
  const reset = () => { const next = { ...themes }; delete next[subject.key]; setSubjectThemes(next); void persist(next); };

  return (
    <details className="space-y-2 rounded-md border p-2">
      <summary className="cursor-pointer text-sm font-medium">{subject.label} theme</summary>
      <p className="text-xs text-muted-foreground">Changes every {subject.label} board.</p>
      <Label className="text-xs">Background</Label>
      <select aria-label="Theme background" className={sel} value={theme.background ?? "subject"} onChange={(e) => update({ background: e.target.value as SubjectTheme["background"] })}>
        <option value="subject">Subject artwork</option>
        {BACKGROUNDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
      </select>
      <Label className="text-xs">Schedule card</Label>
      <select aria-label="Card placement" className={sel} value={theme.card ?? "left"} onChange={(e) => update({ card: e.target.value as SubjectTheme["card"] })}>
        {CARD_PLACEMENTS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <Label className="text-xs">Font</Label>
      <select aria-label="Theme font" className={sel} value={theme.font ?? ""} onChange={(e) => update({ font: e.target.value || undefined })}>
        <option value="">Subject default</option>
        {THEME_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Text color<input type="color" className="mt-1 h-9 w-full rounded border" value={theme.ink ?? "#1f2a44"} onChange={(e) => update({ ink: e.target.value })} /></label>
        <label className="text-xs">Accent color<input type="color" className="mt-1 h-9 w-full rounded border" value={theme.accent ?? "#d9481e"} onChange={(e) => update({ accent: e.target.value })} /></label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={saving} onClick={() => persist()}>Save as default</Button>
        <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
      </div>
    </details>
  );
}

export function AiDraftPanel({ slide, onApply }: { slide: Slide; onApply: (heading: string, body: string) => void }) {
  const draft = useServerFn(draftSlideText);
  const [subject, setSubject] = useState<string>(subjectDesign(slide.data).label);
  const [goal, setGoal] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ heading: string; steps: string[] } | null>(null);
  const run = async () => {
    if (!goal.trim()) { toast.error("Add a lesson goal first"); return; }
    setBusy(true);
    try {
      const r = await draft({ data: { subject, goal, details, boardTitle: slide.title } });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("heading" in r) setResult({ heading: r.heading, steps: r.steps });
    } catch { toast.error("Couldn't draft text right now."); }
    finally { setBusy(false); }
  };
  return (
    <details className="space-y-2 rounded-md border p-2">
      <summary className="cursor-pointer text-sm font-medium"><Sparkles className="mr-1 inline h-4 w-4" />Draft with AI</summary>
      <Label className="text-xs">Subject</Label>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Label className="text-xs">Lesson goal</Label>
      <Input value={goal} placeholder="Count by 5s to 50" onChange={(e) => setGoal(e.target.value)} />
      <Label className="text-xs">Key details</Label>
      <Textarea rows={3} value={details} placeholder="Use hundreds chart, partner work, clean up at 8:55" onChange={(e) => setDetails(e.target.value)} />
      <Button size="sm" className="w-full" disabled={busy} onClick={run}>{busy ? "Writing…" : "Draft slide text"}</Button>
      {result && (
        <div className="space-y-1 rounded bg-muted p-2 text-sm">
          <div className="font-bold">{result.heading}</div>
          <ul className="list-disc pl-4">{result.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <Button size="sm" className="mt-1 w-full" onClick={() => { onApply(result.heading, result.steps.join("\n")); toast.success("Added to slide"); }}>Use this text</Button>
        </div>
      )}
    </details>
  );
}
