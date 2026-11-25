import { describe, expect, it } from "vitest";
import { HERO_JOBS, autoAssign, mentorFor, newHeroJobs, pay, rotate } from "./hero-jobs";

const names = Array.from({ length: 20 }, (_, i) => `S${i + 1}`);
describe("hero jobs", () => {
  it("fills all 14 jobs with different students", () => {
    const s = autoAssign(newHeroJobs(), names);
    expect(new Set(Object.values(s.assign)).size).toBe(14);
  });
  it("two jobs with the same title get different mentors", () => {
    expect(mentorFor(HERO_JOBS[0]!)).not.toBe(mentorFor(HERO_JOBS[1]!));
  });
  it("rotating gives every job a new student and resets check-ins", () => {
    const s = { ...autoAssign(newHeroJobs(), names), checkIns: { S1: 3 } };
    const r = rotate(s, names);
    HERO_JOBS.forEach((j) => expect(r.assign[j.id]).not.toBe(s.assign[j.id]));
    expect(r.checkIns).toEqual({});
  });
  it("pays the job's points only after 3 check-ins", () => {
    const s = autoAssign(newHeroJobs(), names);
    expect(pay({ ...s, checkIns: { S1: 2 } }, "S1")).toBe(0);
    expect(pay({ ...s, checkIns: { S1: 3 } }, "S1")).toBe(20);
  });
});
