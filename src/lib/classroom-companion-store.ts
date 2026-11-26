import { HERO_JOBS, normalizeHeroJobs, type HeroJobsState } from "./hero-jobs";

export type CompanionStudent = {
  id: string;
  name: string;
  currentJobId?: string | null;
  checkIns?: number;
  bank?: number;
};

export type CompanionJob = {
  id: string;
  title?: string;
  assigned?: string[];
};

/** Convert Classroom Companion's student/job records into Hero Agency's current week. */
export function companionToHero(
  students: CompanionStudent[],
  jobs: CompanionJob[],
  base: HeroJobsState,
): HeroJobsState {
  const studentById = new Map(students.map((student) => [student.id, student]));
  const assign: Record<string, string> = {};

  for (const job of jobs) {
    if (!HERO_JOBS.some((heroJob) => heroJob.id === job.id)) continue;
    const assignedId = job.assigned?.[0]
      ?? students.find((student) => student.currentJobId === job.id)?.id;
    const name = assignedId ? studentById.get(assignedId)?.name : undefined;
    if (name) assign[job.id] = name;
  }

  // Also accept a student's currentJobId when Classroom Companion saved that side first.
  for (const student of students) {
    if (student.currentJobId && student.name && !assign[student.currentJobId]
      && HERO_JOBS.some((job) => job.id === student.currentJobId)) {
      assign[student.currentJobId] = student.name;
    }
  }

  const checkIns = Object.fromEntries(students.filter((student) => student.name).map((student) => [
    student.name,
    Math.max(0, Math.min(5, Math.floor(student.checkIns ?? 0))),
  ]));
  return { ...normalizeHeroJobs(base), assign, checkIns };
}

export function hasCompanionActivity(students: CompanionStudent[], jobs: CompanionJob[]): boolean {
  return jobs.some((job) => (job.assigned?.length ?? 0) > 0)
    || students.some((student) => !!student.currentJobId || (student.checkIns ?? 0) > 0 || (student.bank ?? 0) > 0);
}

/** Deterministic IDs prevent two open Hero Board views from adding the same student twice. */
export function companionStudentId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `hero-${slug || "student"}`;
}
