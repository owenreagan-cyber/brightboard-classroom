import { describe, expect, it } from "vitest";
import { DEFAULT_ROSTERS, OLD_READING, classFor, displayNames, upgradeRoster } from "./rosters";

describe("rosters", () => {
  it("Reading keeps full names for the two Sophias, first names otherwise, no duplicates", () => {
    const r = displayNames(DEFAULT_ROSTERS.Reading);
    expect(r).toContain("Sophia Suarez");
    expect(r).toContain("Sophia Seaman");
    expect(r).not.toContain("Anna");
    expect(r).toHaveLength(22);
    expect(r.filter((n) => n === "Dior")).toHaveLength(1);
  });
  it("Homeroom Sophia shows first name only", () => {
    expect(displayNames(DEFAULT_ROSTERS.Homeroom)).toContain("Sophia");
  });
  it("old saved Reading list upgrades, edited lists stay", () => {
    expect(upgradeRoster("Reading", OLD_READING)).toHaveLength(22);
    expect(upgradeRoster("Reading", ["Ava"])).toBeNull();
  });
  it("folders map to classes", () => {
    expect(classFor("Reading")).toBe("Reading");
    expect(classFor("Math")).toBe("Math");
    expect(classFor("Snack")).toBe("Homeroom");
  });
});
