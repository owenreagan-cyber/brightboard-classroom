import { describe, expect, it } from "vitest";
import { HERO_JOBS, autoAssign, heroReports, mentorFor, newHeroJobs, nextHeroWeek, normalizeHeroJobs, pay, rotate, type HeroJobsState } from "./hero-jobs";

const names = Array.from({ length: 20 }, (_, i) => `S${i + 1}`);
describe("hero jobs", () => {
  it("high-tier jobs earn exactly 10 stamps", () => {
    expect(HERO_JOBS.filter(j => ["Filer", "Cleaner", "Lunch Crew", "Class Monitor"].includes(j.title)).map(j => j.gp)).toEqual([10,10,10,10,10,10,10]);
  });
  it("low-tier jobs earn exactly 5 stamps", () => {
    expect(HERO_JOBS.filter(j => ["Distributor", "Line Leader", "Substitute", "Hall Monitor", "Door Holder"].includes(j.title)).map(j => j.gp)).toEqual([5,5,5,5,5,5,5]);
  });
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
    expect(pay({ ...s, checkIns: { S1: 3 } }, "S1")).toBe(10);
  });
  it("archives the exact jobs, check-ins and points when a new week starts", () => {
    const s = { ...autoAssign(newHeroJobs(new Date(2026, 10, 16)), names), checkIns: { S1: 3, S2: 2 } };
    const r = rotate(s, names);
    expect(r.weekStart).toBe("2026-11-23");
    expect(r.history).toHaveLength(1);
    expect(r.history[0]).toMatchObject({ weekStart: "2026-11-16", checkIns: { S1: 3, S2: 2 } });
    expect(pay(r.history[0]!, "S1")).toBe(10);
    expect(pay(r.history[0]!, "S2")).toBe(0);
  });
  it("reports each student's current and previous weeks with totals", () => {
    const first = { ...autoAssign(newHeroJobs(new Date(2026, 10, 16)), names), checkIns: { S1: 4 } };
    const second = { ...rotate(first, names), checkIns: { S1: 3 } };
    const report = heroReports(second, names).students.find((s) => s.name === "S1")!;
    expect(report.weeks).toHaveLength(2);
    expect(report.weeks[0]).toMatchObject({ weekStart: "2026-11-23", checkIns: 3, points: 5 });
    expect(report.weeks[1]).toMatchObject({ weekStart: "2026-11-16", checkIns: 4, points: 10 });
    expect(report.totalCheckIns).toBe(7);
    expect(report.totalPoints).toBe(15);
  });
  it("limits reports to the requested number of recent weeks", () => {
    let s = autoAssign(newHeroJobs(new Date(2026, 10, 2)), names);
    s = rotate(s, names);
    s = rotate(s, names);
    const report = heroReports(s, names, 2);
    expect(report.weeks.map((w) => w.weekStart)).toEqual(["2026-11-16", "2026-11-09"]);
    expect(report.students[0]?.weeks).toHaveLength(2);
  });
  it("keeps existing assignments when loading a saved state without history", () => {
    const legacy = { assign: { j1: "Ava" }, checkIns: { Ava: 3 } } as unknown as HeroJobsState;
    const s = normalizeHeroJobs(legacy, new Date(2026, 10, 25));
    expect(s.assign["j1"]).toBe("Ava");
    expect(s.weekStart).toBe("2026-11-23");
    expect(s.history).toEqual([]);
  });
  it("advances week keys across month boundaries", () => {
    expect(nextHeroWeek("2026-11-30")).toBe("2026-12-07");
  });
});
