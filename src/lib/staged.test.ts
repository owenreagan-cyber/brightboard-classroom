import { describe, expect, it } from "vitest";
import { STAGED_PRESETS, dailyGroupOrder, getStagedState } from "./staged";

const at = (h: number, m: number) => new Date(2026, 10, 16, h, m, 0);
const b = STAGED_PRESETS.bathroom, l = STAGED_PRESETS.lunch;

describe("staged timers", () => {
  it("order is stable per date and never 1-2-3-4", () => {
    for (let d = 1; d <= 28; d++) {
      const date = `2026-11-${String(d).padStart(2, "0")}`;
      const o = dailyGroupOrder(date, 4);
      expect(o).toEqual(dailyGroupOrder(date, 4));
      expect(o).not.toEqual([0, 1, 2, 3]);
      expect([...o].sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it("consecutive days start with different groups", () => {
    expect(dailyGroupOrder("2026-11-17", 4)[0]).not.toBe(dailyGroupOrder("2026-11-16", 4)[0]);
  });
  it("bathroom: first slot 9:00, second 9:02, Shurley at 9:15", () => {
    expect(getStagedState(b.start, b.gapMin, 4, [...b.finale], at(9, 0))).toMatchObject({ status: "going", slot: 0 });
    expect(getStagedState(b.start, b.gapMin, 4, [...b.finale], at(9, 2))).toMatchObject({ status: "going", slot: 1 });
    expect(getStagedState(b.start, b.gapMin, 4, [...b.finale], at(9, 15))).toEqual({ status: "finale", label: "Ready for Shurley!" });
  });
  it("lunch: 12:45 clean up, 12:48 recess", () => {
    expect(getStagedState(l.start, l.gapMin, 4, [...l.finale], at(12, 45))).toEqual({ status: "finale", label: "Clean up / sweep" });
    expect(getStagedState(l.start, l.gapMin, 4, [...l.finale], at(12, 48))).toEqual({ status: "finale", label: "Ready for recess!" });
  });
});
