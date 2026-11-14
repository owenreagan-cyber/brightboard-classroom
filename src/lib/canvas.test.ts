import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { agendaWeek, parseAgenda, pickAgenda, guessCourse } from "./canvas";

const html = readFileSync(path.join(__dirname, "__fixtures__/canvas-agenda.html"), "utf8");

describe("Canvas agenda", () => {
  it("reads week ranges, including across months", () => {
    expect(agendaWeek("Q2W6 - November 16–20, 2026")).toEqual({ start: "2026-11-16", end: "2026-11-20" });
    expect(agendaWeek("Q2W7 - November 30–December 4, 2026")).toEqual({ start: "2026-11-30", end: "2026-12-04" });
  });
  it("finds Monday's lesson and homework", () => {
    const a = parseAgenda(html);
    expect(a.days.Mon?.lesson).toBe("Lesson 50");
    expect(a.days.Mon?.atHome).toEqual(["Classwork #1-10 if not finished", "#12-30 EVENS only"]);
    expect(a.days.Tue?.lesson).toBe("Investigation 5");
    expect(a.days.Tue?.atHome).toEqual([]);
    expect(a.days.Fri?.lesson).toBe("Lesson 51");
    expect(a.reminders[0]).toContain("Power Up 9");
  });
  it("picks the page for the date", () => {
    const pages = [{ title: "Q2W5 - November 9–13, 2026" }, { title: "Q2W6 - November 16–20, 2026" }];
    expect(pickAgenda(pages, "2026-11-18")?.title).toContain("16–20");
    expect(pickAgenda(pages, "2026-11-25")).toBeNull();
  });
  it("guesses courses by name", () => {
    expect(guessCourse("Math", [{ id: 1, name: "4A - Spelling" }, { id: 2, name: "4A - Math" }])).toBe(2);
  });
});
