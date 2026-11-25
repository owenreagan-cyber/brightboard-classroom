import { describe, expect, it } from "vitest";
import { absentToday, addPoint, jobsFor, joinQueue, makeGroups, present, syllables, teamScores, toggleAbsent } from "./classroom";

describe("classroom tools", () => {
  it("absences only apply on the day they were marked", () => {
    const a = toggleAbsent({ date: "2026-11-24", absent: ["Ava"] }, "Liam", "2026-11-25");
    expect(a.absent).toEqual(["Liam"]);
    expect(absentToday(a, "2026-11-26")).toEqual([]);
    expect(present(["Ava", "Liam", "Mia"], a.absent)).toEqual(["Ava", "Mia"]);
  });
  it("team points last the week and reset on Monday, never below zero", () => {
    const wed = new Date(2026, 10, 25), fri = new Date(2026, 10, 27), mon = new Date(2026, 10, 30);
    let s = addPoint(teamScores(null, wed), 0, 1, wed);
    s = addPoint(s, 1, -1, wed);
    expect(teamScores(s, fri).scores).toEqual([1, 0, 0, 0]);
    expect(teamScores(s, mon).scores).toEqual([0, 0, 0, 0]);
  });
  it("groups use everyone and nobody is alone", () => {
    const names = ["A", "B", "C", "D", "E", "F", "G"];
    const g = makeGroups(names, 3);
    expect(g.flat().sort()).toEqual(names);
    expect(g.every((x) => x.length >= 2)).toBe(true);
  });
  it("jobs rotate to the next student each school day", () => {
    const names = ["Ava", "Liam", "Mia"];
    const tue = jobsFor(names, ["Line leader"], new Date(2026, 10, 24))[0]!.name;
    const wed = jobsFor(names, ["Line leader"], new Date(2026, 10, 25))[0]!.name;
    expect(names.indexOf(wed)).toBe((names.indexOf(tue) + 1) % 3);
  });
  it("a student joins the help queue only once", () => {
    expect(joinQueue(joinQueue([], "Ava"), "Ava")).toEqual(["Ava"]);
  });
  it("splits words into syllables", () => {
    expect(syllables("rabbit")).toEqual(["rab", "bit"]);
    expect(syllables("cat")).toEqual(["cat"]);
    expect(syllables("make")).toEqual(["make"]);
  });
});
