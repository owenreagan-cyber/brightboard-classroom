import { describe, it, expect } from "vitest";
import { newHeroJobs } from "./hero-jobs";
import { readHeroAgency, mergeHeroAgency } from "./hero-agency-store";

describe("separate Hero Agency data", () => {
  it("keeps existing board jobs when starting the separate save", () => {
    const old = { ...newHeroJobs(), assign: { j1: "Ava" }, checkIns: { Ava: 3 } };
    expect(readHeroAgency({ games: { "hb-hero-jobs": old } })).toEqual(old);
  });
  it("never lets old board games overwrite separate Hero Agency jobs", () => {
    const saved = { ...newHeroJobs(), assign: { j1: "Alex" } };
    expect(readHeroAgency({ hero_agency: saved, games: { "hb-hero-jobs": { ...saved, assign: { j1: "Ava" } } } })).toEqual(saved);
  });
  it("keeps stamps/check-ins from another phone when an assignment changes", () => {
    const before = { ...newHeroJobs(), assign: { j1: "Ava" }, checkIns: { Ava: 2 } };
    const remote = { ...before, checkIns: { Ava: 3 } };
    expect(mergeHeroAgency(remote, before, { ...before, assign: { j1: "Alex" } })).toMatchObject({ assign: { j1: "Alex" }, checkIns: { Ava: 3 } });
  });
  it("adds a phone check-in without undoing another student's check-in", () => {
    const before = newHeroJobs();
    expect(mergeHeroAgency({ ...before, checkIns: { Alex: 1 } }, before, { ...before, checkIns: { Ava: 1 } }).checkIns).toEqual({ Alex: 1, Ava: 1 });
  });
});