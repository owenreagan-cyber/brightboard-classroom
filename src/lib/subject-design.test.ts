import { describe, expect, it } from "vitest";
import { SUBJECT_DESIGNS, subjectDesign } from "./subject-design";
import { parseImport, exportLibrary } from "./library";
import type { Slide } from "./board";

describe("subject design assignment", () => {
  it("assigns an individual design to each subject and daily special", () => {
    for (const subject of SUBJECT_DESIGNS) {
      expect(subjectDesign({ folder: subject.folder, ...("day" in subject ? { day: subject.day } : {}) }).key).toBe(subject.key);
    }
    expect(new Set(SUBJECT_DESIGNS.map((d) => d.key)).size).toBe(20);
  });
  it("keeps original unfiled morning, math, and lunch boards on matching designs", () => {
    expect(subjectDesign({ heading: "Good Morning, Friends!" }).key).toBe("homeroom");
    expect(subjectDesign({ heading: "Welcome to Math!" }).key).toBe("math");
    expect(subjectDesign({ heading: "Lunch Time Rules" }).key).toBe("lunch");
  });
  it("preserves a teacher's alternate background through export and import", () => {
    const slide: Slide = { id: "a", position: 0, title: "Math", data: { heading: "Math", body: "", bg: "stars", backgroundStyle: "alternate", folder: "Math", widgets: [] } };
    const result = parseImport(exportLibrary([slide]));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Import failed");
    expect(result.boards[0]?.data.backgroundStyle).toBe("alternate");
    expect(result.boards[0]?.data.bg).toBe("stars");
  });
});