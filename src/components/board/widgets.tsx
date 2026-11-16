import { useEffect, useRef, useState } from "react";
import {
  WORK_SYMBOLS,
  formatSec,
  getSequenceState,
  spotifyEmbedUrl,
  stepStartLabel,
  type Widget,
} from "@/lib/board";
import { initSpotifyPlayer, MUSIC_LIBRARY, resolveLibraryItem, spotify, spotifyContextUri, useSpotifyConnected, useSpotifyPlayer } from "@/lib/spotify";
import { toast } from "sonner";
import { useTodayAgenda } from "@/lib/school-sync";
import { ymd } from "@/lib/calendar";
import { dayOf } from "@/lib/library";
import { dailyGroupOrder, getStagedState } from "@/lib/staged";
import { usePersisted } from "./games";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880, 1100].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.start(t);
      o.stop(t + 0.6);
    });
  } catch {
    /* audio blocked */
  }
}

const card = "widget-card rounded-[48px] p-10";

export function ClockWidget() {
  const now = useNow();
  return (
    <div className={card}>
      <div className="slide-kicker text-muted-foreground">
        {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <div className="font-display text-primary" style={{ fontSize: 120, lineHeight: 1 }}>
        {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
      </div>
    </div>
  );
}

export function TimerWidget({ w }: { w: Extract<Widget, { type: "timer" }> }) {
  const [left, setLeft] = useState(w.seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => setLeft(w.seconds), [w.seconds]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          chime();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);
  const pct = w.seconds ? left / w.seconds : 0;
  return (
    <div className={card}>
      <div className="slide-kicker text-muted-foreground">{w.label || "Timer"}</div>
      <div className="flex items-center gap-10">
        <svg width="200" height="200" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="44" fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - pct)}
            transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div>
          <div className="font-display text-foreground" style={{ fontSize: 110, lineHeight: 1 }}>{formatSec(left)}</div>
          <div className="mt-4 flex gap-4">
            <button className="kid-btn" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Start"}</button>
            <button className="kid-btn kid-btn-soft" onClick={() => { setRunning(false); setLeft(w.seconds); }}>Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SequenceWidget({ w }: { w: Extract<Widget, { type: "sequence" }> }) {
  const now = useNow();
  const st = getSequenceState(w.start, w.steps, now);
  const prev = useRef<number | string>("");
  const key = st.status === "running" ? st.index : st.status;
  useEffect(() => {
    if (prev.current !== "" && prev.current !== key) chime();
    prev.current = key;
  }, [key]);
  return (
    <div className={card}>
      <div className="slide-kicker text-muted-foreground">Our routine · starts {stepStartLabel(w.start, w.steps, 0)}</div>
      {st.status === "running" && (
        <div className="mt-2 flex items-center gap-8">
          <div style={{ fontSize: 110 }}>{WORK_SYMBOLS[w.steps[st.index]!.symbol]?.emoji}</div>
          <div className="min-w-0">
            <div className="slide-body-lg font-display text-foreground">{w.steps[st.index]!.label}</div>
            <div className="font-display text-primary" style={{ fontSize: 96, lineHeight: 1 }}>{formatSec(st.remainingSec)}</div>
          </div>
        </div>
      )}
      {st.status === "waiting" && <div className="slide-body-lg font-display mt-4">Starts in {formatSec(st.startsInSec)} ⏳</div>}
      {st.status === "done" && <div className="slide-body-lg font-display mt-4">All done! Great job! 🎉</div>}
      <ol className="mt-6 space-y-2">
        {w.steps.map((s, i) => (
          <li
            key={i}
            className={`slide-caption flex items-center gap-4 rounded-full px-5 py-2 ${st.status === "running" && st.index === i ? "bg-primary text-primary-foreground" : "bg-muted/70"}`}
          >
            <span className="tabular-nums w-20">{stepStartLabel(w.start, w.steps, i)}</span>
            <span>{WORK_SYMBOLS[s.symbol]?.emoji}</span>
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SymbolsWidget({ w }: { w: Extract<Widget, { type: "symbols" }> }) {
  return (
    <div className={`${card} flex flex-wrap gap-6`}>
      {w.symbols.map((k) => (
        <div key={k} className="flex flex-col items-center gap-2 rounded-[36px] bg-accent px-8 py-6">
          <span style={{ fontSize: 96, lineHeight: 1 }}>{WORK_SYMBOLS[k]?.emoji}</span>
          <span className="slide-caption font-display text-accent-foreground">{WORK_SYMBOLS[k]?.label}</span>
        </div>
      ))}
    </div>
  );
}

export function PickerWidget({ names }: { names: string[] }) {
  const [shown, setShown] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [used, setUsed] = useState<string[]>([]);
  const pick = () => {
    const pool = names.filter((n) => !used.includes(n));
    const from = pool.length ? pool : names;
    if (!from.length) return;
    if (!pool.length) setUsed([]);
    setSpinning(true);
    let n = 0;
    const t = setInterval(() => {
      setShown(names[Math.floor(Math.random() * names.length)] ?? null);
      if (++n > 18) {
        clearInterval(t);
        const final = from[Math.floor(Math.random() * from.length)]!;
        setShown(final);
        setUsed((u) => [...u, final]);
        setSpinning(false);
        chime();
      }
    }, 90);
  };
  return (
    <div className={`${card} text-center`}>
      <div className="slide-kicker text-muted-foreground">Name picker</div>
      <div className={`font-display my-6 text-primary ${spinning ? "" : "animate-in zoom-in"}`} style={{ fontSize: 120, lineHeight: 1.1 }}>
        {names.length ? shown ?? "❓" : "Add your class list"}
      </div>
      <button className="kid-btn" onClick={pick} disabled={spinning || !names.length}>Pick a friend!</button>
    </div>
  );
}

export function SpotifyWidget({ w }: { w: Extract<Widget, { type: "spotify" }> }) {
  const connected = useSpotifyConnected();
  if (connected) return <SpotifyPremium url={w.url} />;
  const src = spotifyEmbedUrl(w.url);
  if (!src)
    return (
      <div className={card}>
        <div className="slide-kicker text-muted-foreground">Class music 🎵</div>
        <div className="slide-caption mt-3">Paste a Spotify playlist link in the editor.</div>
      </div>
    );
  return (
    <div className={`${card} p-4`}>
      <iframe src={src} width="100%" height="352" className="rounded-[32px]" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify playlist" />
    </div>
  );
}

function SpotifyPremium({ url }: { url: string }) {
  const p = useSpotifyPlayer();
  useEffect(() => initSpotifyPlayer(), []);
  const uri = spotifyContextUri(url);
  const onPlaylist = !!uri && p.contextUri === uri;
  return (
    <div className={card}>
      <div className="slide-kicker text-muted-foreground">Class music 🎵</div>
      <div className="mt-4 flex items-center gap-8">
        {p.track?.image
          ? <img src={p.track.image} alt="" className="h-40 w-40 rounded-3xl object-cover" />
          : <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-muted" style={{ fontSize: 80 }}>🎧</div>}
        <div className="min-w-0 flex-1">
          <div className="slide-body-lg font-display truncate text-foreground">{p.track?.name ?? (p.status === "ready" ? "Ready to play" : "Starting player…")}</div>
          {p.track && <div className="slide-caption truncate text-muted-foreground">{p.track.artists}</div>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        {uri && !onPlaylist && <button className="kid-btn" disabled={p.status !== "ready"} onClick={() => spotify.playContext(uri, true)}>▶ Play school playlist</button>}
        {onPlaylist && (
          <>
            <button className="kid-btn kid-btn-soft" aria-label="Previous song" onClick={spotify.prev}>⏮</button>
            <button className="kid-btn" onClick={spotify.toggle}>{p.paused ? "▶ Play" : "⏸ Pause"}</button>
            <button className="kid-btn kid-btn-soft" aria-label="Next song" onClick={spotify.next}>⏭</button>
          </>
        )}
      </div>
      {p.contextUri && !onPlaylist && (
        <div className="mt-4 flex flex-wrap gap-4">
          <button className="kid-btn kid-btn-soft" aria-label="Previous song" onClick={spotify.prev}>⏮</button>
          <button className="kid-btn" onClick={spotify.toggle}>{p.paused ? "▶ Play" : "⏸ Pause"}</button>
          <button className="kid-btn kid-btn-soft" aria-label="Next song" onClick={spotify.next}>⏭</button>
        </div>
      )}
      <div className="slide-caption mt-6 text-muted-foreground">Music library</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {MUSIC_LIBRARY.map((item) => (
          <button key={item.id} className="kid-btn kid-btn-soft" style={{ fontSize: "0.9em", padding: "0.4em 0.9em" }} disabled={p.status !== "ready"}
            onClick={() => resolveLibraryItem(item).then((u) => spotify.playContext(u, true)).catch((e) => toast.error(e.message))}>
            {item.emoji} {item.label}
          </button>
        ))}
      </div>
      {p.error && <div className="slide-caption mt-3 text-destructive">{p.error}</div>}
    </div>
  );
}

export function WidgetView({ w, names }: { w: Widget; names: string[] }) {
  switch (w.type) {
    case "clock": return <ClockWidget />;
    case "timer": return <TimerWidget w={w} />;
    case "sequence": return <SequenceWidget w={w} />;
    case "symbols": return <SymbolsWidget w={w} />;
    case "picker": return <PickerWidget names={names} />;
    case "spotify": return <SpotifyWidget w={w} />;
    case "lesson": return <LessonWidget w={w} />;
    case "staged": return <StagedWidget w={w} />;
  }
}

export function LessonWidget({ w }: { w: Extract<Widget, { type: "lesson" }> }) {
  const now = useNow(60_000);
  const day = dayOf(now);
  const { agenda, error } = useTodayAgenda(w.subject, ymd(now));
  const today = day ? agenda?.days[day] : undefined;
  return (
    <div className="rounded-2xl border-4 border-foreground bg-card p-3 text-card-foreground">
      <div className="font-display text-lg">📚 {w.subject}{today?.lesson ? ` — ${today.lesson}` : ""}</div>
      {agenda === undefined ? <p className="text-sm text-muted-foreground">Loading from Canvas…</p>
        : !day ? <p className="text-sm">No school today!</p>
        : !today ? <p className="text-sm text-muted-foreground">{error ?? "No agenda for today in Canvas."}</p>
        : <>
            {today.inClass.length > 1 && <ul className="text-sm">{today.inClass.map((x) => <li key={x}>• {x}</li>)}</ul>}
            <div className="mt-1 text-sm font-bold">🏠 Homework</div>
            {today.atHome.length ? <ul className="text-sm">{today.atHome.map((x) => <li key={x}>• {x}</li>)}</ul> : <p className="text-sm">None tonight 🎉</p>}
          </>}
    </div>
  );
}

type StagedW = Extract<Widget, { type: "staged" }>;
export function StagedWidget({ w }: { w: StagedW }) {
  const now = useNow();
  const today = ymd(now);
  const [shuf, setShuf] = usePersisted<{ date: string; shift: number }>("hb-staged-shift", () => ({ date: "", shift: 0 }), (v) => !!v && typeof v === "object", true);
  const shift = shuf.date === today ? shuf.shift : 0;
  const order = dailyGroupOrder(today, w.groups.length, shift);
  const st = getStagedState(w.start, w.gapMin, w.groups.length, w.finale, now);
  const key = st.status === "going" ? `g${st.slot}` : st.status === "finale" ? st.label : st.status;
  const prev = useRef("");
  useEffect(() => { if (prev.current && prev.current !== key) chime(); prev.current = key; }, [key]);
  const cur = st.status === "going" ? w.groups[order[st.slot]!] : undefined;
  const timeAt = (slot: number) => stepStartLabel(w.start, Array(slot).fill({ minutes: w.gapMin, label: "", symbol: "" }), slot);
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-4">
        <div className="slide-kicker text-muted-foreground">{w.label} · starts {stepStartLabel(w.start, [], 0)}</div>
        <button className="kid-btn kid-btn-soft" style={{ fontSize: "0.7em", padding: "0.3em 0.8em" }} onClick={() => setShuf({ date: today, shift: shift + 1 })}>🔀 Shuffle again</button>
      </div>
      {st.status === "waiting" && <div className="slide-body-lg font-display mt-4">Starts in {formatSec(st.startsInSec)} ⏳</div>}
      {cur && st.status === "going" && (
        <div key={key} className="mt-4 animate-in zoom-in">
          <div className="font-display text-primary" style={{ fontSize: 72, lineHeight: 1 }}>{cur.name} — GO!</div>
          <div className="slide-body-lg font-display mt-2 text-foreground">{cur.students.join(", ")}</div>
          <div className="slide-caption mt-2 text-muted-foreground">Next group in {formatSec(st.nextInSec)}</div>
        </div>
      )}
      {st.status === "allOut" && <div className="slide-body-lg font-display mt-4">{st.next.label} in {formatSec(st.inSec)}</div>}
      {st.status === "finale" && <div key={key} className="mt-4 animate-in zoom-in rounded-[32px] bg-primary px-8 py-6 text-center font-display text-primary-foreground" style={{ fontSize: 80, lineHeight: 1.1 }}>{st.label}</div>}
      {st.status === "done" && <div className="slide-body-lg font-display mt-4">All done! 🎉</div>}
      <ol className="mt-6 space-y-2">
        {order.map((gi, slot) => (
          <li key={gi} className={`slide-caption flex items-center gap-4 rounded-full px-5 py-2 ${st.status === "going" && st.slot === slot ? "bg-primary text-primary-foreground" : "bg-muted/70"}`}>
            <span className="tabular-nums w-20">{timeAt(slot)}</span>
            <span className="font-bold">{w.groups[gi]!.name}</span>
            <span className="truncate">{w.groups[gi]!.students.join(", ")}</span>
          </li>
        ))}
        {w.finale.map((f) => (
          <li key={f.time + f.label} className="slide-caption flex items-center gap-4 rounded-full bg-accent px-5 py-2 text-accent-foreground">
            <span className="tabular-nums w-20">{stepStartLabel(f.time, [], 0)}</span><span className="font-bold">{f.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
