import { describe, it, expect } from "vitest";
import { specialFor, applyToAllDays, assessmentWidgets, parseImport, suggest, exportLibrary } from "./library";
import type { Slide } from "./board";

const mk = (id: string, folder: Slide["data"]["folder"], day: Slide["data"]["day"], extra = {}): Slide => ({
  id, position: 0, title: id, data: { heading: "", body: "", bg: "sky", widgets: [], folder, day, ...extra },
});
const tueMath = new Date(2026, 9, 27, 8, 0); // Tuesday 8:00
const at = (h: number, m: number, date = 27) => new Date(2026, 9, date, h, m); // Oct 26 = Mon

describe("smart suggestions", () => {
  const slides = [mk("m", "Math", "Tue"), mk("sn", "Snack", "Tue"), mk("a", "Assessments", "Tue")];
  it("suggests Math/Tue during Tuesday math block, with snack as next", () => {
    const s = suggest(slides, tueMath);
    expect(s.current?.id).toBe("m");
    expect(s.next?.id).toBe("sn");
  });
  it("follows the real bell schedule", () => {
    const all = (["Movement", "Spelling", "Reading", "Specials", "Dismissal"] as const).map((f) => mk(f, f, "Tue"));
    expect(suggest(all, at(10, 5)).current?.id).toBe("Movement");
    expect(suggest(all, at(10, 40)).current?.id).toBe("Spelling");
    expect(suggest(all, at(11, 10)).current?.id).toBe("Reading");
    expect(suggest(all, at(13, 50)).current?.id).toBe("Specials");
    expect(suggest(all, at(14, 40)).current?.id).toBe("Dismissal");
    expect(suggest(all, at(15, 5)).current).toBeNull();
  });
  it("specials rotate by day", () => {
    expect(["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => specialFor(d as "Mon"))).toEqual(["Music", "P.E.", "Art", "Industrial Arts", "Latin"]);
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

import { weekGrid as wg } from "./library";
describe("weekGrid", () => {
  const mk = (folder: string, day: string) => ({ id: folder + day, position: 0, title: "x", data: { heading: "", body: "", bg: "sky", widgets: [], folder, day } }) as never;
  it("shows each day's special at 1:50", () => {
    const sp = wg([]).find((b) => b.folder === "Specials")!;
    expect(sp.time).toBe("1:50–2:35");
    expect(sp.cells.map((c) => c.label)).toEqual(["Music", "P.E.", "Art", "Industrial Arts", "Latin"]);
  });
  it("places boards by folder and day, History and Science share 1:15", () => {
    const g = wg([mk("Math", "Tue"), mk("Science", "Wed"), mk("History", "Wed"), mk("Assessments", "Mon")]);
    expect(g.find((b) => b.folder === "Math")!.cells[1]!.slides).toHaveLength(1);
    expect(g.find((b) => b.folder === "History")!.cells[2]!.slides).toHaveLength(2);
    expect(g.flatMap((b) => b.cells.flatMap((c) => c.slides)).some((s: { id: string }) => s.id === "AssessmentsMon")).toBe(false);
  });
});
