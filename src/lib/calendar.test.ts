import { describe, expect, it } from "vitest";
import { eventsOn, offDaysFor, schoolDayStatus, monthDates, schoolYear, weekDates, weekStart } from "./calendar";

describe("calendar helpers", () => {
  it("uses actual staff track-outs as no-school days", () => {
    const events = [{ id: "track", summary: "Track Out", start: "2026-12-21", end: "2027-01-09", allDay: true }];
    expect(schoolDayStatus(events, "2027-01-08")).toEqual({ kind: "off", label: "Track Out" });
    expect(schoolDayStatus(events, "2027-01-11").kind).toBe("school");
  });
  it("labels the real Thanksgiving week and term boundaries", () => {
    const events = [
      { id: "first", summary: "First Day of School", start: "2026-07-20", end: "2026-07-21", allDay: true },
      { id: "last", summary: "Last Day of School", start: "2027-06-11", end: "2027-06-12", allDay: true },
      { id: "break", summary: "Thanksgiving Break", start: "2026-11-23", end: "2026-11-28", allDay: true },
    ];
    expect(schoolDayStatus(events, "2026-11-23").kind).toBe("off");
    expect(schoolDayStatus(events, "2026-11-30").kind).toBe("school");
    expect(schoolDayStatus(events, "2026-07-17").kind).toBe("outside");
    expect(schoolDayStatus(events, "2027-06-11").kind).toBe("school");
    expect(schoolDayStatus(events, "2027-06-14").kind).toBe("outside");
    expect(schoolDayStatus(events, "2026-11-16", false).kind).toBe("unknown");
  });
  it("browses full months in the July–June school year", () => {
    expect(schoolYear(new Date(2027, 0, 4))).toEqual({ from: "2026-07-01", to: "2027-06-30" });
    expect(monthDates(new Date(2026, 10, 15))).toHaveLength(42);
    expect(monthDates(new Date(2026, 10, 15))[0]).toBe("2026-10-26");
  });
  it("all-day end date is exclusive", () => {
    const e = [{ id: "1", summary: "Thanksgiving Break", start: "2026-11-25", end: "2026-11-28", allDay: true }];
    expect(eventsOn(e, "2026-11-27")).toHaveLength(1);
    expect(eventsOn(e, "2026-11-28")).toHaveLength(0);
    expect(offDaysFor(e, weekDates(weekStart(new Date(2026, 10, 24))))).toEqual(["Wed", "Thu", "Fri"]);
  });
  it("assemblies are not days off; weekends plan next week", () => {
    const e = [{ id: "2", summary: "Assembly", start: "2026-11-16", end: "2026-11-17", allDay: true }];
    expect(offDaysFor(e, weekDates(weekStart(new Date(2026, 10, 14))))).toEqual([]);
    expect(weekDates(weekStart(new Date(2026, 10, 14)))[0]).toBe("2026-11-16");
  });
});
