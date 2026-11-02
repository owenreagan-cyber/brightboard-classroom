import { describe, expect, it } from "vitest";
import { cleanTheme } from "./subject-theme";

describe("cleanTheme", () => {
  it("keeps valid choices", () => {
    expect(cleanTheme({ background: "sky", card: "right", font: "Bungee", ink: "#112233", accent: "#ff0000" }))
      .toEqual({ background: "sky", card: "right", font: "Bungee", ink: "#112233", accent: "#ff0000" });
  });
  it("drops unsafe colors and unknown fonts", () => {
    expect(cleanTheme({ ink: "red;background:url(x)", font: "Comic Sans" })).toEqual({});
  });
});
