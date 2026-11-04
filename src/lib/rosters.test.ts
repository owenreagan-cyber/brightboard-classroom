import { describe, expect, it } from "vitest";
import { DEFAULT_ROSTERS, classFor, displayNames } from "./rosters";

describe("rosters", () => {
  it("Reading keeps full names for the two Sophias, first names otherwise, no duplicates", () => {
    const r = displayNames(DEFAULT_ROSTERS.Reading);
    expect(r).toContain("Sophia Suarez");
    expect(r).toContain("Sophia Seaman");
    expect(r).toContain("Anna");
    expect(r.filter((n) => n === "Dior")).toHaveLength(1);
  });
  it("Homeroom Sophia shows first name only", () => {
    expect(displayNames(DEFAULT_ROSTERS.Homeroom)).toContain("Sophia");
  });
  it("folders map to classes", () => {
    expect(classFor("Reading")).toBe("Reading");
    expect(classFor("Math")).toBe("Math");
    expect(classFor("Snack")).toBe("Homeroom");
  });
});
