export type SequenceStep = { minutes: number; label: string; symbol: string };

export type Widget =
  | { id: string; type: "timer"; seconds: number; label?: string }
  | { id: string; type: "sequence"; start: string; steps: SequenceStep[] }
  | { id: string; type: "picker" }
  | { id: string; type: "symbols"; symbols: string[] }
  | { id: string; type: "spotify"; url: string }
  | { id: string; type: "clock" };

export type SlideData = {
  heading: string;
  body: string;
  bg: BgKey;
  widgets: Widget[];
  folder?: "Morning" | "Math" | "Reading" | "Spelling" | "Lunch/Recess/Pack-up" | "Assessments" | undefined;
  day?: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | undefined;
  /** Imported from JSON and awaiting teacher approval. */
  staged?: boolean | undefined;
};

export type Slide = {
  id: string;
  position: number;
  title: string;
  data: SlideData;
};

export type BgKey = "sakura" | "sky" | "stars" | "cream";

export const BACKGROUNDS: { key: BgKey; label: string }[] = [
  { key: "sakura", label: "Sunset showdown" },
  { key: "sky", label: "Hero sky" },
  { key: "stars", label: "Night city" },
  { key: "cream", label: "Plain paper" },
];

export const WORK_SYMBOLS: Record<string, { emoji: string; label: string }> = {
  quiet: { emoji: "🤫", label: "Quiet voices" },
  partner: { emoji: "🗣️", label: "Partner talk" },
  hand: { emoji: "✋", label: "Raise your hand" },
  eyes: { emoji: "👀", label: "Eyes on teacher" },
  read: { emoji: "📖", label: "Read" },
  write: { emoji: "✏️", label: "Write" },
  group: { emoji: "👫", label: "Group work" },
  clean: { emoji: "🧹", label: "Clean up" },
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newWidget(type: Widget["type"]): Widget {
  const id = uid();
  switch (type) {
    case "timer":
      return { id, type, seconds: 300, label: "Timer" };
    case "sequence":
      return {
        id,
        type,
        start: "07:40",
        steps: [
          { minutes: 5, label: "Unpack & hang backpack", symbol: "quiet" },
          { minutes: 10, label: "Morning work page", symbol: "write" },
          { minutes: 5, label: "Read with a buddy", symbol: "partner" },
        ],
      };
    case "picker":
      return { id, type };
    case "symbols":
      return { id, type, symbols: ["quiet", "hand"] };
    case "spotify":
      return { id, type, url: "" };
    case "clock":
      return { id, type };
  }
}

export function templateSlides(): Omit<Slide, "id">[] {
  return [
    {
      position: 0,
      title: "Morning Message",
      data: {
        heading: "Good Morning, Friends! ☀️",
        body: "Hang up your backpack\nTurn in your folder\nStart your morning work page",
        bg: "sakura",
        widgets: [newWidget("clock"), newWidget("sequence")],
      },
    },
    {
      position: 1,
      title: "Math Time",
      data: {
        heading: "Welcome to Math! 🔢",
        body: "Get your math journal\nSharpen your pencil\nShow me you're ready",
        bg: "sky",
        widgets: [{ ...newWidget("timer"), seconds: 600, label: "Math warm-up" } as Widget, newWidget("symbols")],
      },
    },
    {
      position: 2,
      title: "Lunch Rules",
      data: {
        heading: "Lunch Time Rules 🍱",
        body: "Walk in a quiet line\nUse kind words\nClean up your space\nSay please and thank you",
        bg: "cream",
        widgets: [{ ...newWidget("symbols"), symbols: ["quiet", "clean"] } as Widget],
      },
    },
    {
      position: 3,
      title: "Helper of the Day",
      data: {
        heading: "Who is our helper? ⭐",
        body: "Press the button to pick a friend!",
        bg: "stars",
        widgets: [newWidget("picker"), newWidget("spotify")],
      },
    },
  ];
}

/** Parse "HH:MM" to minutes since midnight. */
export function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export type SequenceState =
  | { status: "waiting"; startsInSec: number }
  | { status: "running"; index: number; remainingSec: number; stepSec: number }
  | { status: "done" };

/** Where are we in an auto-running timer sequence at time `now`? */
export function getSequenceState(start: string, steps: SequenceStep[], now: Date): SequenceState {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let cursor = parseTime(start) * 60;
  if (nowSec < cursor) return { status: "waiting", startsInSec: cursor - nowSec };
  for (let i = 0; i < steps.length; i++) {
    const len = Math.max(0, steps[i]!.minutes) * 60;
    if (nowSec < cursor + len) return { status: "running", index: i, remainingSec: cursor + len - nowSec, stepSec: len };
    cursor += len;
  }
  return { status: "done" };
}

/** Clock time a step begins, e.g. "7:45". */
export function stepStartLabel(start: string, steps: SequenceStep[], index: number): string {
  let m = parseTime(start);
  for (let i = 0; i < index; i++) m += steps[i]!.minutes;
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")}`;
}

export function formatSec(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function spotifyEmbedUrl(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|show|episode)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

export type TwoPhaseState =
  | { phase: 1 | 2; remainingSec: number }
  | { phase: "done"; remainingSec: 0 };

/** Two chained phases: phase 2 starts the moment phase 1 hits 0:00. */
export function getTwoPhaseState(p1Min: number, p2Min: number, elapsedSec: number): TwoPhaseState {
  const a = Math.max(0, p1Min) * 60;
  const b = Math.max(0, p2Min) * 60;
  if (elapsedSec < a) return { phase: 1, remainingSec: a - elapsedSec };
  if (elapsedSec < a + b) return { phase: 2, remainingSec: a + b - elapsedSec };
  return { phase: "done", remainingSec: 0 };
}
