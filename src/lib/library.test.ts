import { describe, it, expect } from "vitest";
import { applyToAllDays, assessmentWidgets, parseImport, suggest, exportLibrary } from "./library";
import type { Slide } from "./board";

const mk = (id: string, folder: Slide["data"]["folder"], day: Slide["data"]["day"], extra = {}): Slide => ({
  id, position: 0, title: id, data: { heading: "", body: "", bg: "sky", widgets: [], folder, day, ...extra },
});
const tueMath = new Date(2026, 9, 27, 11, 0); // Tuesday 11:00

describe("smart suggestions", () => {
  const slides = [mk("m", "Math", "Tue"), mk("l", "Lunch/Recess/Pack-up", "Tue"), mk("a", "Assessments", "Tue")];
  it("suggests Math/Tue during Tuesday math block, with lunch as next", () => {
    const s = suggest(slides, tueMath);
    expect(s.current?.id).toBe("m");
    expect(s.next?.id).toBe("l");
  });
  it("never suggests an Assessments board", () => {
    expect(suggest([mk("a", "Assessments", "Tue")], tueMath).current).toBeNull();
  });
  it("suggests nothing on weekends", () => {
    expect(suggest(slides, new Date(2026, 9, 31, 11, 0)).current).toBeNull();
  });
});

it("apply to all days copies widgets to the other 4 days in the folder only", () => {
  const src = mk("mon", "Math", "Mon", { widgets: [{ id: "x", type: "clock" }] });
  const slides = [src, mk("tue", "Math", "Tue"), mk("wed", "Math", "Wed"), mk("thu", "Math", "Thu"), mk("fri", "Math", "Fri"), mk("r", "Reading", "Tue")];
  const { updates } = applyToAllDays(slides, src);
  expect(updates.map((u) => u.id)).toEqual(["tue", "wed", "thu", "fri"]);
  expect(updates.every((u) => u.data.widgets[0]?.type === "clock")).toBe(true);
});

it("assessment mode strips picker and music", () => {
  expect(assessmentWidgets([{ id: "1", type: "picker" }, { id: "2", type: "spotify", url: "" }, { id: "3", type: "clock" }]).map((w) => w.type)).toEqual(["clock"]);
});

describe("JSON import", () => {
  it("rejects a bad widget", () => {
    const r = parseImport(JSON.stringify({ title: "X", widgets: [{ type: "timer" }] }));
    expect(r.ok).toBe(false);
  });
  it("imports boards as staged and round-trips export", () => {
    const r = parseImport(JSON.stringify({ version: 1, boards: [{ title: "A", folder: "Math", day: "Tue", widgets: [{ type: "clock" }] }] }));
    expect(r.ok && r.boards[0]!.data.staged).toBe(true);
    if (!r.ok) return;
    const again = parseImport(exportLibrary([{ id: "1", position: 0, ...r.boards[0]! }]));
    expect(again.ok).toBe(true);
  });
});
