import { describe, expect, it } from "vitest";
import { STAGED_PRESETS, dailyGroupOrder, getStagedState, slotLabel, stagedGapSec } from "./staged";

const at = (h: number, m: number, s = 0) => new Date(2026, 10, 16, h, m, s);
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
  const bg = stagedGapSec(b.start, b.end, b.gapMin, 4), lg = stagedGapSec(l.start, l.end, l.gapMin, 4);
  it("bathroom: groups at 9:05, 9:07:30, 9:12:30, Shurley at 9:15", () => {
    expect(getStagedState(b.start, bg, 4, [...b.finale], at(9, 4))).toMatchObject({ status: "waiting" });
    expect(getStagedState(b.start, bg, 4, [...b.finale], at(9, 5))).toMatchObject({ status: "going", slot: 0 });
    expect(getStagedState(b.start, bg, 4, [...b.finale], at(9, 7, 30))).toMatchObject({ status: "going", slot: 1 });
    expect(getStagedState(b.start, bg, 4, [...b.finale], at(9, 12, 30))).toMatchObject({ status: "going", slot: 3 });
    expect(getStagedState(b.start, bg, 4, [...b.finale], at(9, 15))).toEqual({ status: "finale", label: "Ready for Shurley!" });
    expect(slotLabel(b.start, bg, 1)).toBe("9:07:30");
  });
  it("lunch: 12:15 start, 12:22:30 second group, 12:45 clean up, 12:48 recess", () => {
    expect(getStagedState(l.start, lg, 4, [...l.finale], at(12, 15))).toMatchObject({ status: "going", slot: 0 });
    expect(getStagedState(l.start, lg, 4, [...l.finale], at(12, 22, 30))).toMatchObject({ status: "going", slot: 1 });
    expect(getStagedState(l.start, lg, 4, [...l.finale], at(12, 45))).toEqual({ status: "finale", label: "Clean up / sweep" });
    expect(getStagedState(l.start, lg, 4, [...l.finale], at(12, 48))).toEqual({ status: "finale", label: "Ready for recess!" });
  });
});
