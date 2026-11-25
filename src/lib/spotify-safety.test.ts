import { describe, expect, it } from "vitest";
import { classroomBlock } from "./spotify";
const pl = (ownerId: string) => ({ type: "playlist", ownerId });
describe("classroom music safety", () => {
  it("skips explicit songs", () => expect(classroomBlock({ explicit: true }, pl("spotify"), "owen")).toMatch(/explicit/));
  it("blocks the teacher's own playlists", () => expect(classroomBlock({ explicit: false }, pl("owen"), "owen")).toMatch(/personal/));
  it("blocks songs played outside a school playlist", () => expect(classroomBlock({ explicit: false }, null, "owen")).not.toBeNull());
  it("allows clean songs from school playlists", () => expect(classroomBlock({ explicit: false }, pl("spotify"), "owen")).toBeNull());
});
