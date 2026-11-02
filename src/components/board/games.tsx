import { useEffect, useState } from "react";
import {
  TIER_INFO, decideStar, loadState, newPrizeBoard, newRng, newStar, pickStar, pickTile, remaining, roll, setRange, undoRoll, undoStar, undoTile,
  type PrizeState, type RngState, type StarState, type Tier,
} from "@/lib/games";

/** State saved in this browser so it survives refreshes. */
function usePersisted<T>(key: string, fallback: () => T, valid: (v: unknown) => boolean) {
  const [s, set] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => { set(loadState(key, fallback, valid)); setReady(true); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(s)); }, [key, s, ready]);
  return [s, set] as const;
}
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const btn = "rounded-full px-3 py-1.5 text-sm font-bold disabled:opacity-40";

export function RandomNumber() {
  const [s, set] = usePersisted<RngState>("hb-rng", newRng, (v) => isObj(v) && Array.isArray(v["history"]));
  const [min, setMin] = useState(String(s.min));
  const [max, setMax] = useState(String(s.max));
  useEffect(() => { setMin(String(s.min)); setMax(String(s.max)); }, [s.min, s.max]);
  const left = remaining(s).length;
  const exhausted = s.noRepeat && left === 0;
  const last = s.history[s.history.length - 1];
  return (
    <div className="space-y-3 text-center">
      <div className="font-mono text-7xl font-bold tabular-nums">{last ?? "–"}</div>
      {exhausted && <p className="rounded-xl bg-destructive/15 p-2 text-sm font-bold text-destructive">All numbers drawn! Press Reset to start over.</p>}
      <button disabled={exhausted} onClick={() => { const r = roll(s); if (r) set(r.state); }} className={`${btn} w-full bg-primary py-3 font-display text-lg text-primary-foreground`}>🎲 Roll</button>
      <div className="flex items-center justify-center gap-1 text-sm">
        <input aria-label="Minimum" type="number" value={min} onChange={(e) => setMin(e.target.value)} className="w-20 rounded-md border bg-background px-2 py-1" />
        to
        <input aria-label="Maximum" type="number" value={max} onChange={(e) => setMax(e.target.value)} className="w-20 rounded-md border bg-background px-2 py-1" />
        <button className={`${btn} bg-muted`} onClick={() => { if (min !== "" && max !== "") set(setRange(s, +min, +max)); }}>Set</button>
      </div>
      <label className="flex items-center justify-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={s.noRepeat} onChange={(e) => set({ ...s, noRepeat: e.target.checked })} /> No repeats {s.noRepeat && `(${left} left)`}
      </label>
      <div className="flex justify-center gap-2">
        <button disabled={!s.history.length} onClick={() => set(undoRoll(s))} className={`${btn} bg-accent text-accent-foreground`}>Undo</button>
        <button onClick={() => set({ ...s, history: [] })} className={`${btn} bg-destructive text-destructive-foreground`}>Reset</button>
      </div>
      {s.history.length > 0 && <div className="max-h-16 overflow-auto text-xs text-muted-foreground">History: {s.history.slice().reverse().join(", ")}</div>}
    </div>
  );
}

export function MysteryStar({ names }: { names: string[] }) {
  const [s, set] = usePersisted<StarState>("hb-star", newStar, (v) => isObj(v) && Array.isArray(v["log"]));
  const last = s.log[s.log.length - 1];
  return (
    <div className="space-y-3 text-center">
      <div className="rounded-2xl bg-foreground p-4 font-display text-3xl text-background">
        {!s.secret ? "⭐ ?" : s.revealed ? `⭐ ${s.secret}` : "⭐ Secret star chosen"}
      </div>
      {!names.length && <p className="text-xs text-muted-foreground">Add names in Class list first.</p>}
      {!s.secret ? (
        <button disabled={!names.length} onClick={() => set(pickStar(s, names))} className={`${btn} w-full bg-primary py-3 text-primary-foreground`}>Secretly pick a star</button>
      ) : !s.revealed ? (
        <div className="flex gap-2">
          <button onClick={() => set({ ...s, revealed: true })} className={`${btn} flex-1 bg-accent text-accent-foreground`}>Reveal</button>
          <button onClick={() => set(pickStar(s, names))} className={`${btn} bg-muted`}>Re-pick</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => set(decideStar(s, "earned"))} className={`${btn} flex-1 bg-primary text-primary-foreground`}>✅ Earned</button>
          <button onClick={() => set(decideStar(s, "not-earned"))} className={`${btn} flex-1 bg-destructive text-destructive-foreground`}>Did not earn</button>
        </div>
      )}
      {last && (
        <div className="flex items-center justify-between rounded-xl bg-muted p-2 text-xs">
          <span>Last: {last.name} — {last.outcome === "earned" ? "Earned ✅" : "Did not earn"}</span>
          <button onClick={() => set(undoStar(s))} className="font-bold underline">Undo</button>
        </div>
      )}
    </div>
  );
}

const TIER_STYLE: Record<Tier, string> = {
  standard: "bg-primary text-primary-foreground",
  rare: "bg-accent text-accent-foreground",
  legendary: "bg-foreground text-background ring-2 ring-accent",
  whammy: "bg-destructive text-destructive-foreground",
};

export function PrizeBoard() {
  const [s, set] = usePersisted<PrizeState>("hb-prize", () => newPrizeBoard(), (v) => isObj(v) && Array.isArray(v["tiles"]) && v["tiles"].length === 100 && Array.isArray(v["picked"]));
  const [shown, setShown] = useState<Tier | null>(null);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="w-[420px] max-w-full space-y-2">
      <div className="h-10 text-center font-display text-2xl">{shown ? `${TIER_INFO[shown].emoji} ${TIER_INFO[shown].label}` : "Pick a number!"}</div>
      <div className="grid grid-cols-10 gap-0.5">
        {s.tiles.map((t, i) => {
          const n = i + 1; const open = s.picked.includes(n);
          return (
            <button key={n} disabled={open} onClick={() => { const r = pickTile(s, n); if (r) { set(r.state); setShown(r.tier); } }}
              className={`aspect-square rounded text-[11px] font-bold ${open ? TIER_STYLE[t] : "bg-muted hover:bg-accent/40"}`}>
              {open ? TIER_INFO[t].emoji : n}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span>{100 - s.picked.length} left</span>
        <div className="flex gap-2">
          <button disabled={!s.picked.length} onClick={() => { set(undoTile(s)); setShown(null); }} className={`${btn} bg-accent text-accent-foreground`}>Undo</button>
          {confirm ? (
            <>
              <button onClick={() => { set(newPrizeBoard()); setShown(null); setConfirm(false); }} className={`${btn} bg-destructive text-destructive-foreground`}>Yes, new board</button>
              <button onClick={() => setConfirm(false)} className={`${btn} bg-muted`}>Cancel</button>
            </>
          ) : <button onClick={() => setConfirm(true)} className={`${btn} bg-destructive text-destructive-foreground`}>Reset</button>}
        </div>
      </div>
    </div>
  );
}
