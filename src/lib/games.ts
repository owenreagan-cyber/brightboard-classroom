/** Pure state logic for the Random Number, Mystery Star and 100 Prize Board tools. */

// ---------- Random number ----------
export type RngState = { min: number; max: number; noRepeat: boolean; history: number[] };
export const newRng = (): RngState => ({ min: 1, max: 100, noRepeat: false, history: [] });

export function remaining(s: RngState): number[] {
  const used = new Set(s.history);
  const out: number[] = [];
  for (let n = s.min; n <= s.max; n++) if (!s.noRepeat || !used.has(n)) out.push(n);
  return out;
}

/** Roll; returns null when no-repeat mode has drawn every number. */
export function roll(s: RngState, rand = Math.random): { state: RngState; value: number } | null {
  const pool = remaining(s);
  if (!pool.length) return null;
  const value = pool[Math.floor(rand() * pool.length)]!;
  return { state: { ...s, history: [...s.history, value] }, value };
}

export const undoRoll = (s: RngState): RngState => ({ ...s, history: s.history.slice(0, -1) });

export function setRange(s: RngState, min: number, max: number): RngState {
  const lo = Math.floor(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return { ...s, min: lo, max: hi, history: [] };
}

// ---------- Mystery star ----------
export type StarOutcome = "earned" | "not-earned";
export type StarState = { secret: string | null; revealed: boolean; log: { name: string; outcome: StarOutcome; at: number }[] };
export const newStar = (): StarState => ({ secret: null, revealed: false, log: [] });

export function pickStar(s: StarState, names: string[], rand = Math.random): StarState {
  if (!names.length) return s;
  return { ...s, secret: names[Math.floor(rand() * names.length)]!, revealed: false };
}

export function decideStar(s: StarState, outcome: StarOutcome, now = Date.now()): StarState {
  if (!s.secret) return s;
  return { secret: null, revealed: false, log: [...s.log, { name: s.secret, outcome, at: now }] };
}

/** Undo the last decision: puts that student back as the (revealed) secret star. */
export function undoStar(s: StarState): StarState {
  const last = s.log[s.log.length - 1];
  if (!last) return s;
  return { secret: last.name, revealed: true, log: s.log.slice(0, -1) };
}

// ---------- 100 Prize board ----------
export type Tier = "standard" | "rare" | "legendary" | "whammy";
export const TIER_INFO: Record<Tier, { label: string; emoji: string }> = {
  standard: { label: "Prize", emoji: "⭐" },
  rare: { label: "Rare prize", emoji: "💎" },
  legendary: { label: "LEGENDARY", emoji: "🔥" },
  whammy: { label: "Whammy!", emoji: "💥" },
};
export const TIER_COUNTS: Record<Tier, number> = { standard: 70, rare: 18, legendary: 4, whammy: 8 };

export type PrizeState = { tiles: Tier[]; picked: number[] };

/** Teacher's prize mix: rare/legendary/whammy are clamped (0–100 total) and standard fills the rest to 100. */
export function cleanMix(v: unknown): Record<Tier, number> {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const n = (k: Tier) => { const x = Math.round(Number(o[k])); return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : TIER_COUNTS[k]; };
  let rare = n("rare"), legendary = n("legendary"), whammy = n("whammy");
  whammy = Math.min(whammy, 100); legendary = Math.min(legendary, 100 - whammy); rare = Math.min(rare, 100 - whammy - legendary);
  return { standard: 100 - rare - legendary - whammy, rare, legendary, whammy };
}

export function newPrizeBoard(rand = Math.random, mix: Record<Tier, number> = TIER_COUNTS): PrizeState {
  const counts = cleanMix(mix);
  const tiles: Tier[] = [];
  (Object.keys(counts) as Tier[]).forEach((t) => { for (let i = 0; i < counts[t]; i++) tiles.push(t); });
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
  }
  return { tiles, picked: [] };
}

/** Pick tile number 1–100. Already-picked tiles are ignored. */
export function pickTile(s: PrizeState, n: number): { state: PrizeState; tier: Tier } | null {
  if (n < 1 || n > s.tiles.length || s.picked.includes(n)) return null;
  return { state: { ...s, picked: [...s.picked, n] }, tier: s.tiles[n - 1]! };
}

export const undoTile = (s: PrizeState): PrizeState => ({ ...s, picked: s.picked.slice(0, -1) });

// ---------- persistence ----------
export function loadState<T>(key: string, fallback: () => T, valid: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const v = JSON.parse(raw); if (valid(v)) return v as T; }
  } catch { /* ignore */ }
  return fallback();
}
