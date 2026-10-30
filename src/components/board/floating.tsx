import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { formatSec, getTwoPhaseState, uid } from "@/lib/board";

type Kind = "signals" | "timer" | "phases" | "noise";
type Item = { id: string; kind: Kind; x: number; y: number; z: number };

const LABELS: Record<Kind, string> = { signals: "Voice signals", timer: "Timer", phases: "Two-phase timer", noise: "Noise meter" };

function beep() {
  try {
    const ctx = new AudioContext();
    [660, 880, 1100].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.start(t); o.stop(t + 0.6);
    });
  } catch { /* blocked */ }
}

/** Floating, draggable classroom tools that sit above any slide (editor and present mode). */
export function FloatingLayer({ assessment = false }: { assessment?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [menu, setMenu] = useState(false);
  const top = useRef(10);
  const front = (id: string) => setItems((all) => all.map((i) => (i.id === id ? { ...i, z: ++top.current } : i)));
  const add = (kind: Kind) => {
    setItems((all) => [...all, { id: uid(), kind, x: 120 + all.length * 30, y: 120 + all.length * 30, z: ++top.current }]);
    setMenu(false);
  };
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {items.filter((it) => !assessment || it.kind !== "noise").map((it) => (
        <Floating key={it.id} item={it} onFront={() => front(it.id)}
          onMove={(x, y) => setItems((all) => all.map((i) => (i.id === it.id ? { ...i, x, y } : i)))}
          onClose={() => setItems((all) => all.filter((i) => i.id !== it.id))}>
          {it.kind === "noise" ? <NoiseMeter /> : it.kind === "signals" ? <Signals /> : it.kind === "timer" ? <QuickTimer /> : <TwoPhase />}
        </Floating>
      ))}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-2">
        {menu && (Object.keys(LABELS) as Kind[]).filter((k) => !assessment || k !== "noise").map((k) => (
          <button key={k} onClick={() => add(k)} className="rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-bold shadow-lg hover:bg-accent">
            {LABELS[k]}
          </button>
        ))}
        <button onClick={() => setMenu((m) => !m)} aria-label="Floating tools"
          className="flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-4 py-3 font-display text-primary-foreground shadow-xl">
          {menu ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />} Tools
        </button>
      </div>
    </div>
  );
}

function Floating({ item, onFront, onMove, onClose, children }: { item: Item; onFront: () => void; onMove: (x: number, y: number) => void; onClose: () => void; children: ReactNode }) {
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  return (
    <div className="pointer-events-auto absolute w-[340px] rounded-3xl border-4 border-foreground bg-card shadow-2xl"
      style={{ left: item.x, top: item.y, zIndex: item.z }} onPointerDown={onFront}>
      <div className="flex items-center rounded-t-[20px] bg-foreground text-background">
        <div className="flex-1 cursor-grab touch-none select-none py-1.5 text-center text-xs font-bold tracking-widest active:cursor-grabbing"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start.current = { px: e.clientX, py: e.clientY, x: item.x, y: item.y }; }}
          onPointerMove={(e) => {
            const s = start.current; if (!s) return;
            onMove(Math.min(window.innerWidth - 60, Math.max(-280, s.x + e.clientX - s.px)), Math.min(window.innerHeight - 30, Math.max(0, s.y + e.clientY - s.py)));
          }}
          onPointerUp={() => (start.current = null)}>
          ⠿ Drag ⠿
        </div>
        <button aria-label="Close tool" className="px-3 py-1.5 hover:opacity-70" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const SIGNALS = [
  { key: "silence", label: "🔴 SILENCE", ring: "var(--destructive)" },
  { key: "whisper", label: "🟡 WHISPER", ring: "var(--accent)" },
  { key: "talk", label: "🟢 TALK", ring: "var(--primary)" },
];

function Signals() {
  const [on, setOn] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {SIGNALS.map((s) => {
        const active = on === s.key;
        return (
          <button key={s.key} onClick={() => setOn(active ? null : s.key)}
            className={`rounded-2xl border-4 bg-background py-4 font-display text-2xl transition-all duration-300 ${active ? "scale-105 opacity-100" : on ? "scale-95 opacity-35" : "opacity-80"}`}
            style={active ? { borderColor: s.ring, boxShadow: `0 0 24px 6px ${s.ring}` } : { borderColor: "var(--border)" }}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function useTick(running: boolean, onTick: () => void) {
  const cb = useRef(onTick); cb.current = onTick;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => cb.current(), 1000);
    return () => clearInterval(t);
  }, [running]);
}

function QuickTimer() {
  const [left, setLeft] = useState(300);
  const [running, setRunning] = useState(false);
  useTick(running, () => setLeft((l) => { if (l <= 1) { setRunning(false); beep(); return 0; } return l - 1; }));
  return (
    <div className="text-center">
      <div className={`font-mono text-7xl font-bold tabular-nums ${left === 0 ? "text-destructive" : "text-foreground"}`}>{formatSec(left).padStart(5, "0")}</div>
      <div className="mt-3 flex justify-center gap-2">
        <button className="kid-btn kid-btn-soft !px-4 !py-2 !text-base" onClick={() => setLeft((l) => l + 60)}>+1m</button>
        <button className="kid-btn kid-btn-soft !px-4 !py-2 !text-base" onClick={() => setLeft((l) => l + 300)}>+5m</button>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button onClick={() => left > 0 && setRunning((r) => !r)}
          className={`rounded-full px-5 py-2 font-bold ${running ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setLeft(300); }} className="rounded-full bg-destructive px-5 py-2 font-bold text-destructive-foreground">Reset</button>
      </div>
    </div>
  );
}

function TwoPhase() {
  const [p1, setP1] = useState(10);
  const [p2, setP2] = useState(5);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const st = getTwoPhaseState(p1, p2, elapsed);
  const prev = useRef(st.phase);
  useEffect(() => {
    if (prev.current !== st.phase) { beep(); if (st.phase === "done") setRunning(false); }
    prev.current = st.phase;
  }, [st.phase]);
  useTick(running, () => setElapsed((e) => e + 1));
  const started = elapsed > 0 || running;
  return (
    <div className="space-y-3 text-center">
      <div className="grid grid-cols-2 gap-2 text-left text-xs font-bold">
        <label className={`rounded-xl p-2 ${st.phase === 1 && started ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          Phase 1 · quiet work
          <input type="number" min={1} disabled={started} value={p1} onChange={(e) => setP1(Math.max(1, +e.target.value))}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-foreground" aria-label="Phase 1 minutes" />
        </label>
        <label className={`rounded-xl p-2 ${st.phase === 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          Phase 2 · partners / clean up
          <input type="number" min={1} disabled={started} value={p2} onChange={(e) => setP2(Math.max(1, +e.target.value))}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-foreground" aria-label="Phase 2 minutes" />
        </label>
      </div>
      <div className="font-display text-lg">
        {st.phase === "done" ? "All done! 🎉" : !started ? "Ready" : `Phase ${st.phase} active`}
      </div>
      <div className="font-mono text-6xl font-bold tabular-nums">{formatSec(st.remainingSec).padStart(5, "0")}</div>
      <div className="flex justify-center gap-2">
        <button disabled={st.phase === "done"} onClick={() => setRunning((r) => !r)}
          className={`rounded-full px-5 py-2 font-bold disabled:opacity-40 ${running ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setRunning(false); setElapsed(0); prev.current = 1; }} className="rounded-full bg-destructive px-5 py-2 font-bold text-destructive-foreground">Reset</button>
      </div>
    </div>
  );
}

function NoiseMeter() {
  const [on, setOn] = useState(false);
  const [level, setLevel] = useState(0);
  const [limit, setLimit] = useState(60);
  const [err, setErr] = useState<string | null>(null);
  const [loud, setLoud] = useState(false);
  const loudSince = useRef<number | null>(null);
  const limitRef = useRef(limit); limitRef.current = limit;
  useEffect(() => {
    if (!on) return;
    let stop = false; let raf = 0; let stream: MediaStream | null = null; let ctx: AudioContext | null = null;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      if (stop) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s; ctx = new AudioContext();
      const an = ctx.createAnalyser(); an.fftSize = 1024;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Float32Array(an.fftSize); let smooth = 0;
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0; for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        const lvl = Math.min(100, Math.max(0, (20 * Math.log10(rms + 1e-8) + 60) * (100 / 55)));
        smooth = smooth * 0.85 + lvl * 0.15; setLevel(smooth);
        const now = performance.now();
        if (smooth > limitRef.current) { loudSince.current ??= now; if (now - loudSince.current > 700) setLoud(true); }
        else { loudSince.current = null; setLoud(false); }
        raf = requestAnimationFrame(loop);
      };
      loop();
    }).catch(() => { setErr("Microphone blocked. Allow mic access in your browser."); setOn(false); });
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); void ctx?.close(); setLevel(0); setLoud(false); };
  }, [on]);
  const color = loud ? "var(--destructive)" : level > limit * 0.75 ? "var(--accent)" : "var(--primary)";
  return (
    <div className="space-y-3 text-center">
      <div className={`rounded-2xl border-4 py-3 font-display text-2xl transition-all ${loud ? "animate-pulse" : ""}`}
        style={{ borderColor: color, boxShadow: loud ? `0 0 28px 8px ${color}` : undefined }}>
        {!on ? "🎤 Noise meter" : loud ? "🔴 TOO LOUD!" : level > limit * 0.75 ? "🟡 Getting loud" : "🟢 Nice and calm"}
      </div>
      <div className="relative h-8 overflow-hidden rounded-full border-2 border-foreground bg-muted">
        <div className="h-full transition-[width] duration-100" style={{ width: `${level}%`, background: color }} />
        <div className="absolute inset-y-0 w-1 bg-foreground" style={{ left: `${limit}%` }} aria-hidden />
      </div>
      <label className="block text-left text-xs font-bold">Too loud at: {limit}
        <input type="range" min={10} max={95} value={limit} onChange={(e) => setLimit(+e.target.value)} className="w-full" aria-label="Loudness threshold" />
      </label>
      {err && <div className="text-xs text-destructive">{err}</div>}
      <button onClick={() => { setErr(null); setOn((o) => !o); }}
        className={`rounded-full px-5 py-2 font-bold ${on ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
        {on ? "Stop listening" : "Start listening"}
      </button>
    </div>
  );
}
