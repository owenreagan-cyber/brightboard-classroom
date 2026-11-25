import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifySetup } from "@/components/board/SpotifySetup";
import { MUSIC_LIBRARY, initSpotifyPlayer, resolveLibraryItem, setClassMusic, spotify, syncClassMusic, useClassMusic, useSpotifyConnected, useSpotifyPlayer } from "@/lib/spotify";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Class Music Library — Hero Board" },
      { name: "description", content: "Pick a school-safe music genre to play on the classroom board." },
      { property: "og:title", content: "Class Music Library — Hero Board" },
      { property: "og:description", content: "Pick a school-safe music genre to play on the classroom board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const current = useClassMusic();
  const connected = useSpotifyConnected();
  const p = useSpotifyPlayer();
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { void syncClassMusic(); if (connected) initSpotifyPlayer(); }, [connected]);
  const groups = [...new Set(MUSIC_LIBRARY.map((m) => m.group))];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link to="/board"><ArrowLeft className="h-4 w-4" /> Board</Link></Button>
        <h1 className="font-display text-3xl">Class music</h1>
      </div>
      <p className="text-muted-foreground">Pick a genre to be your class music. Any slide with a Class music tool and no link plays it. Explicit songs are skipped and your personal playlists never play.</p>
      {!connected && <div className="rounded-xl border p-4"><SpotifySetup /></div>}
      {groups.map((g) => (
        <section key={g} className="space-y-3">
          <h2 className="font-display text-xl">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MUSIC_LIBRARY.filter((m) => m.group === g).map((m) => {
              const on = current === m.id;
              return (
                <div key={m.id} className={`rounded-xl border-2 p-4 ${on ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                  <div className="text-3xl">{m.emoji}</div>
                  <div className="mt-1 font-display text-lg">{m.label}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={on ? "default" : "outline"} disabled={saving === m.id}
                      onClick={async () => { setSaving(m.id); try { await setClassMusic(m.id); toast.success(`${m.label} is now your class music`); } finally { setSaving(null); } }}>
                      {on ? <><Check className="h-4 w-4" /> Class music</> : "Set as class music"}
                    </Button>
                    {connected && <Button size="sm" variant="ghost" disabled={p.status !== "ready"}
                      onClick={() => resolveLibraryItem(m).then((u) => spotify.playContext(u, true)).catch((e) => toast.error(e.message))}>▶ Preview</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {p.track && <div className="rounded-xl border p-3 text-sm">Now playing: <b>{p.track.name}</b> — {p.track.artists} <button className="ml-2 underline" onClick={spotify.toggle}>{p.paused ? "Play" : "Pause"}</button></div>}
      {p.error && <div className="text-sm text-destructive">{p.error}</div>}
    </div>
  );
}
