import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { finishSpotifyLogin } from "@/lib/spotify";

export const Route = createFileRoute("/spotify-callback")({
  head: () => ({
    meta: [
      { title: "Connecting Spotify — Hero Board" },
      { name: "description", content: "Finishing your Spotify connection for Hero Board." },
      { property: "og:title", content: "Connecting Spotify — Hero Board" },
      { property: "og:description", content: "Finishing your Spotify connection for Hero Board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotifyCallback,
});

function SpotifyCallback() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code");
    if (!code) { setError(q.get("error") ?? "Spotify didn't return a sign-in code."); return; }
    finishSpotifyLogin(code).then((to) => { if (to === "close") { window.close(); setError("Spotify is connected — you can close this tab."); } else window.location.replace(to); }).catch((e) => setError(e.message));
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-3xl text-primary">{error ? "Spotify didn't connect" : "Connecting Spotify…"}</h1>
      {error && <><p className="text-muted-foreground">{error}</p><a className="underline" href="/board">Back to board</a></>}
    </div>
  );
}
