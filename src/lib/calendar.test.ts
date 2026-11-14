import { describe, expect, it } from "vitest";
import { eventsOn, offDaysFor, weekDates, weekStart } from "./calendar";

describe("calendar helpers", () => {
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
