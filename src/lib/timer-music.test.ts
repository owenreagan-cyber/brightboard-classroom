import { describe, expect, it } from "vitest";
import { musicAction, musicWanted } from "./timer-music";

describe("timer music", () => {
  it("plays when the timer starts", () => expect(musicAction("a", true, false, null, false)).toBe("play"));
  it("stops when the timer ends", () => expect(musicAction("a", false, true, "a", true)).toBe("stop"));
  it("pauses when the timer is paused", () => expect(musicAction("a", false, true, "a", false)).toBe("pause"));
  it("never stops another timer's music", () => expect(musicAction("a", false, true, "b", true)).toBeNull());
  it("no music after the timer finishes", () => expect(musicWanted(true, true, null)).toBe(false));
  it("work-only music is off during break", () => expect(musicWanted(true, false, 2, "work")).toBe(false));
  it("break-only music plays during break", () => expect(musicWanted(true, false, 2, "break")).toBe(true));
});
