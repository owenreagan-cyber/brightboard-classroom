import { describe, it, expect } from "vitest";
import { getSequenceState, stepStartLabel, spotifyEmbedUrl } from "./board";

const steps = [
  { minutes: 5, label: "A", symbol: "quiet" },
  { minutes: 10, label: "B", symbol: "write" },
];
const at = (h: number, m: number, s = 0) => new Date(2026, 9, 28, h, m, s);

describe("timer sequence starting 7:40", () => {
  it("waits before 7:40", () => {
    expect(getSequenceState("07:40", steps, at(7, 39))).toEqual({ status: "waiting", startsInSec: 60 });
  });
  it("runs step 1 at 7:42 with 3 minutes left", () => {
    expect(getSequenceState("07:40", steps, at(7, 42))).toMatchObject({ status: "running", index: 0, remainingSec: 180 });
  });
  it("starts next step automatically at 7:45", () => {
    expect(getSequenceState("07:40", steps, at(7, 45))).toMatchObject({ status: "running", index: 1, remainingSec: 600 });
  });
  it("is done at 7:55", () => {
    expect(getSequenceState("07:40", steps, at(7, 55))).toEqual({ status: "done" });
  });
  it("labels step start times", () => {
    expect(stepStartLabel("07:40", steps, 1)).toBe("7:45");
  });
});

it("converts spotify playlist links to embeds", () => {
  expect(spotifyEmbedUrl("https://open.spotify.com/playlist/37i9dQZF1DX?si=1")).toBe(
    "https://open.spotify.com/embed/playlist/37i9dQZF1DX",
  );
});

import { getTwoPhaseState } from "./board";
describe("two-phase timer", () => {
  it("runs phase 1 first", () => expect(getTwoPhaseState(10, 5, 30)).toEqual({ phase: 1, remainingSec: 570 }));
  it("switches to phase 2 exactly when phase 1 hits 0:00", () => expect(getTwoPhaseState(10, 5, 600)).toEqual({ phase: 2, remainingSec: 300 }));
  it("finishes after both phases", () => expect(getTwoPhaseState(10, 5, 900)).toEqual({ phase: "done", remainingSec: 0 }));
});

import { catchUpTimer } from "./board";
describe("floating timer restore", () => {
  const adv = (t: { left: number; running: boolean; savedAt: number }, sec: number) => ({ ...t, left: Math.max(0, t.left - sec) });
  it("running timer keeps counting while closed", () => expect(catchUpTimer({ left: 300, running: true, savedAt: 0 }, 60_000, adv).left).toBe(240));
  it("paused timer keeps its minutes", () => expect(catchUpTimer({ left: 300, running: false, savedAt: 0 }, 60_000, adv).left).toBe(300));
});
