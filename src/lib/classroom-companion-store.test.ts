import { describe, expect, it } from "vitest";
import { newHeroJobs } from "./hero-jobs";
import { companionStudentId, companionToHero, hasCompanionActivity } from "./classroom-companion-store";

describe("Classroom Companion job records", () => {
  it("reads assignments and check-ins from the shared student and job records", () => {
    const state = companionToHero(
      [{ id: "student-1", name: "Ava", currentJobId: "j1", checkIns: 3 }],
      [{ id: "j1", assigned: ["student-1"] }],
      newHeroJobs(new Date("2026-11-23T12:00:00")),
    );
    expect(state.assign).toEqual({ j1: "Ava" });
    expect(state.checkIns).toEqual({ Ava: 3 });
  });

  it("accepts an assignment saved on the student side before the job side", () => {
    const state = companionToHero(
      [{ id: "student-1", name: "Alex", currentJobId: "j10", checkIns: 0 }],
      [{ id: "j10", assigned: [] }],
      newHeroJobs(),
    );
    expect(state.assign["j10"]).toBe("Alex");
  });

  it("uses the same ID for the same student in two open views", () => {
    expect(companionStudentId("Sophia Garcia")).toBe("hero-sophia-garcia");
    expect(companionStudentId("Sophia Garcia")).toBe(companionStudentId("Sophia Garcia"));
  });

  it("does not overwrite an empty saved Companion week with old Hero Board jobs", () => {
    expect(hasCompanionActivity([], [{ id: "j1", assigned: [] }])).toBe(false);
    expect(hasCompanionActivity([{ id: "s1", name: "Ava", currentJobId: "j1" }], [])).toBe(true);
  });
});
