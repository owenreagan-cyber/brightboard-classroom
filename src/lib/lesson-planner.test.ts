import { describe, expect, it } from "vitest";
import { lessonOn, messageContext, type LessonPlan } from "./lesson-planner";
const plan: LessonPlan = { startDate: "2026-11-16", startLesson: 49, materials: "pen, pencil, and power up pack", skipped: [], corrections: {} };
describe("continuing lesson counter", () => {
  it("builds Tuesday on Monday's lesson 49", () => {
    expect(lessonOn(plan, "2026-11-16")).toBe(49);
    expect(lessonOn(plan, "2026-11-17")).toBe(50);
    expect(messageContext(plan, "2026-11-17").homeworkLesson).toBe(49);
  });
  it("Monday does not request previous homework", () => {
    expect(messageContext(plan, "2026-11-23").homeworkLesson).toBeNull();
  });
  it("continues across weeks without counting weekends", () => {
    expect(lessonOn(plan, "2026-11-21")).toBeNull();
    expect(lessonOn(plan, "2026-11-23")).toBe(54);
  });
  it("does not advance on calendar no-school days", () => {
    expect(lessonOn(plan, "2026-11-17", ["2026-11-17"])).toBeNull();
    expect(lessonOn(plan, "2026-11-18", ["2026-11-17"])).toBe(50);
  });
  it("does not advance on a manually skipped lesson", () => {
    expect(lessonOn({ ...plan, skipped: ["2026-11-17"] }, "2026-11-18")).toBe(50);
  });
  it("a correction changes following lessons too", () => {
    expect(lessonOn({ ...plan, corrections: { "2026-11-17": 48 } }, "2026-11-18")).toBe(49);
  });
});