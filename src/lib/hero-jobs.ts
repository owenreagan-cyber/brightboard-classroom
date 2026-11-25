/** Hero Agency jobs (from the Classroom Companion app): job slots, hero mentors, weekly rotation and payroll. */

export type HeroJob = { id: string; title: string; gp: number };
export const HERO_JOBS: HeroJob[] = [
  ["j1", "Filer", 20], ["j2", "Filer", 20], ["j3", "Cleaner", 20], ["j4", "Cleaner", 20], ["j5", "Lunch Crew", 15], ["j6", "Lunch Crew", 15],
  ["j7", "Class Monitor", 15], ["j8", "Distributor", 10], ["j9", "Distributor", 10], ["j10", "Line Leader", 10], ["j11", "Substitute", 10],
  ["j12", "Hall Monitor", 5], ["j13", "Door Holder", 5], ["j14", "Door Holder", 5],
].map(([id, title, gp]) => ({ id: id as string, title: title as string, gp: gp as number }));

export const JOB_MENTORS: Record<string, string[]> = {
  Filer: ["nighteye", "mandalay"], Cleaner: ["cementoss", "froppy"], "Lunch Crew": ["sugarman", "uravity"], "Class Monitor": ["eraserhead", "creati"],
  Distributor: ["hawks", "mirko"], "Line Leader": ["deku", "mina"], Substitute: ["shoto", "nejire"], "Hall Monitor": ["shoji", "jiro"], "Door Holder": ["endeavor", "mtlady"],
};

export const JOB_PROTOCOLS: Record<string, string> = {
  Filer: "Your quirk is Organization. Put papers in the right mailbox.",
  Cleaner: "Your quirk is Restoration. Keep our hero headquarters clean: sweep the floor and wipe the desks.",
  "Lunch Crew": "Your quirk is Heavy Lifting. Carry the lunch supplies safely to and from the office.",
  "Class Monitor": "Your quirk is Vigilance. Watch for heroes doing great things and tell the teacher.",
  Distributor: "Your quirk is Velocity. Pass out papers and supplies super fast.",
  "Line Leader": "Your quirk is Leadership. Lead the line, silent and straight.",
  Substitute: "Your quirk is Versatility. Ready to do any job when someone is away.",
  "Hall Monitor": "Your quirk is Surveillance. Watch the hallway so no hero falls behind.",
  "Door Holder": "Your quirk is Access Control. Hold the door and keep our doors safe.",
};

/** Same-title slots alternate mentors, so two Filers get different heroes. */
export function mentorFor(job: HeroJob): string {
  const pool = JOB_MENTORS[job.title] ?? ["allmight"];
  const slot = HERO_JOBS.filter((j) => j.title === job.title).findIndex((j) => j.id === job.id);
  return pool[Math.max(0, slot) % pool.length]!;
}

export type HeroJobsState = { assign: Record<string, string>; checkIns: Record<string, number> };
export const newHeroJobs = (): HeroJobsState => ({ assign: {}, checkIns: {} });

/** Fill empty jobs with students who don't have one yet, in class-list order. */
export function autoAssign(s: HeroJobsState, names: string[]): HeroJobsState {
  const assign = Object.fromEntries(Object.entries(s.assign).filter(([, n]) => names.includes(n)));
  const free = names.filter((n) => !Object.values(assign).includes(n));
  for (const j of HERO_JOBS) if (!assign[j.id] && free.length) assign[j.id] = free.shift()!;
  return { ...s, assign };
}

/** New week: everyone moves down one job; students without a job step in at the top. Check-ins reset. */
export function rotate(s: HeroJobsState, names: string[]): HeroJobsState {
  const order = [...HERO_JOBS.map((j) => s.assign[j.id]).filter((n): n is string => !!n && names.includes(n))];
  const waiting = names.filter((n) => !order.includes(n));
  const line = [...waiting, ...order];
  // Move the last job-holders to the back of the line so different students get a turn each week.
  const shifted = line.length ? [...line.slice(-1), ...line.slice(0, -1)] : [];
  const assign: Record<string, string> = {};
  HERO_JOBS.forEach((j, i) => { if (shifted[i]) assign[j.id] = shifted[i]!; });
  return { assign, checkIns: {} };
}

/** Hero points earned this week: the job's points after 3 or more check-ins. */
export function pay(s: HeroJobsState, name: string): number {
  const job = HERO_JOBS.find((j) => s.assign[j.id] === name);
  return job && (s.checkIns[name] ?? 0) >= 3 ? job.gp : 0;
}
