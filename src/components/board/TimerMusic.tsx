import { useEffect, useRef, useState } from "react";
import { MUSIC_LIBRARY, resolveLibraryItem, spotify, useSpotifyConnected, useSpotifyPlayer, initSpotifyPlayer } from "@/lib/spotify";
import { musicAction, musicWanted, type TimerPhase } from "@/lib/timer-music";

type Choice = { itemId: string; phases: TimerPhase };
const KEY = (id: string) => `hb-timer-music:${id}`;
let owner: string | null = null;

function useChoice(id: string) {
  const [c, setC] = useState<Choice>({ itemId: "", phases: "both" });
  useEffect(() => { try { const r = localStorage.getItem(KEY(id)); if (r) setC({ itemId: "", phases: "both", ...JSON.parse(r) }); } catch { /* ignore */ } }, [id]);
  const save = (n: Choice) => { setC(n); localStorage.setItem(KEY(id), JSON.stringify(n)); };
  return [c, save] as const;
}

async function fadeThen(act: () => Promise<unknown>) {
  for (const v of [0.45, 0.3, 0.15, 0.05]) { await spotify.volume(v); await new Promise((r) => setTimeout(r, 150)); }
  await act();
  await spotify.volume(0.6);
}

/** Plays the chosen school playlist while the timer runs; pauses with it and stops when it ends. */
export function TimerMusic({ id, running, finished, phase = null, twoPhase = false, compact = false }: { id: string; running: boolean; finished: boolean; phase?: 1 | 2 | null; twoPhase?: boolean; compact?: boolean }) {
  const [c, save] = useChoice(id);
  const connected = useSpotifyConnected();
  const player = useSpotifyPlayer();
  const item = MUSIC_LIBRARY.find((m) => m.id === c.itemId);
  const wanted = !!item && connected && musicWanted(running, finished, phase, c.phases);
  const was = useRef(false);
  useEffect(() => { if (connected) initSpotifyPlayer(); }, [connected]);
  useEffect(() => {
    const act = musicAction(id, wanted, was.current, owner, finished);
    was.current = wanted;
    if (act === "play" && item) {
      owner = id;
      void (async () => {
        try {
          const uri = await resolveLibraryItem(item);
          if (player.contextUri === uri && player.paused) await spotify.toggle();
          else if (player.contextUri !== uri || player.paused) await spotify.playContext(uri, true);
        } catch { /* shown by player error */ }
      })();
    } else if (act) {
      owner = null;
      if (!player.paused) void fadeThen(() => spotify.toggle());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);
  const size = compact ? "text-xs" : "text-sm";
  return (
    <div className={`mt-2 flex flex-wrap items-center justify-center gap-2 ${size}`} onPointerDown={(e) => e.stopPropagation()}>
      <label className="flex items-center gap-1 font-bold">🎵
        <select aria-label="Music while running" value={c.itemId} onChange={(e) => save({ ...c, itemId: e.target.value })} className="rounded-md border bg-background px-2 py-1 text-foreground">
          <option value="">No music</option>
          {MUSIC_LIBRARY.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}
        </select>
      </label>
      {twoPhase && item && (
        <select aria-label="Music during" value={c.phases} onChange={(e) => save({ ...c, phases: e.target.value as TimerPhase })} className="rounded-md border bg-background px-2 py-1 text-foreground">
          <option value="both">Both phases</option><option value="work">Phase 1 only</option><option value="break">Phase 2 only</option>
        </select>
      )}
      {item && !connected && <a href="/music" className="text-muted-foreground underline">Connect Spotify for music</a>}
      {item && connected && player.error && <span className="text-destructive">{player.error}</span>}
    </div>
  );
}
