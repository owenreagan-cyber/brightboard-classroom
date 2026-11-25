/** Pure logic for attendance, team points, groups, jobs, help queue, brain breaks and word of the day. */

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---------- Attendance ----------
export type Attendance = { date: string; absent: string[] };
/** Absences only count on the day they were marked. */
export const absentToday = (a: Attendance | null | undefined, today: string): string[] => (a && a.date === today ? a.absent : []);
export const present = (names: string[], absent: string[]) => names.filter((n) => !absent.includes(n));
export function toggleAbsent(a: Attendance, name: string, today: string): Attendance {
  const cur = absentToday(a, today);
  return { date: today, absent: cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name] };
}

// ---------- Team points ----------
export const TEAMS = ["Leaf", "Sand", "Mist", "Cloud"] as const;
export type TeamState = { week: string; scores: number[] };
/** Monday of the week as a key, so scores last all week and start fresh the next Monday. */
export function weekKey(d: Date): string { const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(m); }
export function teamScores(s: TeamState | null | undefined, now: Date): TeamState {
  const week = weekKey(now);
  return s && s.week === week && s.scores.length === TEAMS.length ? s : { week, scores: TEAMS.map(() => 0) };
}
export function addPoint(s: TeamState, team: number, delta: 1 | -1, now: Date): TeamState {
  const cur = teamScores(s, now);
  return { ...cur, scores: cur.scores.map((v, i) => (i === team ? Math.max(0, v + delta) : v)) };
}

// ---------- Random groups ----------
export function shuffle<T>(list: T[], rand = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}
/** Split names into groups of about `size` (2–5); leftovers join earlier groups so nobody is alone. */
export function makeGroups(names: string[], size: number, rand = Math.random): string[][] {
  const n = Math.min(5, Math.max(2, Math.round(size)));
  if (!names.length) return [];
  const count = Math.max(1, Math.floor(names.length / n));
  const groups: string[][] = Array.from({ length: count }, () => []);
  shuffle(names, rand).forEach((name, i) => groups[i % count]!.push(name));
  return groups;
}

// ---------- Jobs ----------
export const DEFAULT_JOBS = ["Line leader", "Door holder", "Caboose", "Lights", "Paper passer", "Board cleaner"];
/** Count Mon–Fri days since a fixed start so jobs rotate each school day. */
export function schoolDayIndex(d: Date): number {
  const start = Date.UTC(2026, 6, 20); // first day of school
  const days = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000);
  const weeks = Math.floor(days / 7), rem = ((days % 7) + 7) % 7;
  return weeks * 5 + Math.min(rem, 5);
}
export function jobsFor(names: string[], jobs: string[], d: Date): { job: string; name: string }[] {
  if (!names.length) return jobs.map((job) => ({ job, name: "—" }));
  const k = ((schoolDayIndex(d) % names.length) + names.length) % names.length;
  return jobs.map((job, i) => ({ job, name: names[(k + i) % names.length]! }));
}

// ---------- Help queue ----------
export const joinQueue = (q: string[], name: string) => (q.includes(name) ? q : [...q, name]);
export const leaveQueue = (q: string[], name: string) => q.filter((n) => n !== name);

// ---------- Brain breaks ----------
export const BRAIN_BREAKS = ["10 jumping jacks", "Ninja freeze!", "Hero power pose for 10 seconds", "Touch your toes 5 times", "Run in place for 20 seconds", "5 big chakra breaths", "Hop on one foot 10 times", "Shadow-clone wiggle", "Arm circles x10", "Silent sneaky ninja walk"];

// ---------- Word of the day ----------
/** Simple first-grade syllable split: break between consonant clusters after a vowel group. */
export function syllables(word: string): string[] {
  const w = word.trim();
  if (w.length <= 3) return [w];
  const parts = w.toLowerCase().match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy](?=[^aeiouy]))?/g) ?? [w];
  const joined = parts.join("");
  if (joined.length < w.length) parts[parts.length - 1] += w.slice(joined.length).toLowerCase();
  // A trailing silent "e" chunk joins the previous syllable.
  if (parts.length > 1 && /^[^aeiouy]*e$/.test(parts[parts.length - 1]!)) { const last = parts.pop()!; parts[parts.length - 1] += last; }
  return parts;
}
