import { describe, it, expect } from "vitest";
import { newRng, roll, undoRoll, setRange, remaining, newStar, pickStar, decideStar, undoStar, newPrizeBoard, pickTile, undoTile, TIER_COUNTS, cleanMix } from "./games";

describe("random number", () => {
  it("defaults to 1–100", () => expect(newRng()).toMatchObject({ min: 1, max: 100 }));
  it("no-repeat draws every number once then is exhausted", () => {
    let s = { ...setRange(newRng(), 1, 3), noRepeat: true };
    const seen: number[] = [];
    for (let i = 0; i < 3; i++) { const r = roll(s)!; seen.push(r.value); s = r.state; }
    expect(seen.sort()).toEqual([1, 2, 3]);
    expect(roll(s)).toBeNull();
  });
  it("undo returns the number to the pool", () => {
    const s = { ...setRange(newRng(), 5, 5), noRepeat: true };
    const r = roll(s)!;
    expect(remaining(undoRoll(r.state))).toEqual([5]);
  });
  it("swapped min/max are fixed", () => expect(setRange(newRng(), 10, 2)).toMatchObject({ min: 2, max: 10 }));
});

describe("mystery star", () => {
  it("picks from roster, records outcome, undo restores", () => {
    const s = pickStar(newStar(), ["Ava", "Ben"], () => 0.9);
    expect(s).toMatchObject({ secret: "Ben", revealed: false });
    const d = decideStar(s, "earned", 1);
    expect(d.log).toEqual([{ name: "Ben", outcome: "earned", at: 1 }]);
    expect(undoStar(d)).toMatchObject({ secret: "Ben", revealed: true, log: [] });
  });
});

describe("100 prize board", () => {
  it("has 100 tiles with 70/18/4/8 tiers", () => {
    const b = newPrizeBoard();
    expect(b.tiles).toHaveLength(100);
    expect(b.tiles.filter((t) => t === "whammy")).toHaveLength(TIER_COUNTS.whammy);
    expect(b.tiles.filter((t) => t === "legendary")).toHaveLength(4);
  });
  it("a tile can only be picked once, undo re-opens it", () => {
    const b = pickTile(newPrizeBoard(), 7)!.state;
    expect(pickTile(b, 7)).toBeNull();
    expect(pickTile(undoTile(b), 7)).not.toBeNull();
  });
});

describe("prize mix", () => {
  it("standard fills the rest to 100", () => expect(cleanMix({ rare: 10, legendary: 2, whammy: 5 })).toEqual({ standard: 83, rare: 10, legendary: 2, whammy: 5 }));
  it("never exceeds 100 tiles", () => { const m = cleanMix({ rare: 90, legendary: 20, whammy: 20 }); expect(m.standard + m.rare + m.legendary + m.whammy).toBe(100); expect(m.standard).toBe(0); });
  it("board uses the mix", () => expect(newPrizeBoard(Math.random, cleanMix({ rare: 0, legendary: 0, whammy: 50 })).tiles.filter((t) => t === "whammy")).toHaveLength(50));
});
