import { expect, it } from "vitest";
import { spotifyContextUri } from "./spotify";
it("turns a playlist link into a playable Spotify playlist", () => {
  expect(spotifyContextUri("https://open.spotify.com/playlist/37i9dQZF1DX?si=1")).toBe("spotify:playlist:37i9dQZF1DX");
});
it("rejects non-playlist links", () => expect(spotifyContextUri("https://example.com")).toBeNull());
