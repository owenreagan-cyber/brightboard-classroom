import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { disconnectSpotify, getClientId, redirectUri, setClientId, startSpotifyLogin, useSpotifyConnected } from "@/lib/spotify";

export function SpotifySetup() {
  const connected = useSpotifyConnected();
  const [cid, setCid] = useState("");
  const [uri, setUri] = useState("");
  useEffect(() => { setCid(getClientId()); setUri(redirectUri()); }, []);

  if (connected)
    return (
      <div className="flex items-center justify-between rounded-md bg-muted p-2 text-xs">
        <span>✅ Spotify Premium connected — controls show on the slide.</span>
        <Button size="sm" variant="ghost" onClick={disconnectSpotify}>Disconnect</Button>
      </div>
    );

  return (
    <details className="space-y-2 rounded-md border p-2 text-xs">
      <summary className="cursor-pointer font-medium">Connect Spotify Premium (full playback)</summary>
      <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
        <li>Open <a className="underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify Developer Dashboard</a> → Create app, tick “Web Playback SDK” and “Web API”.</li>
        <li>Add this Redirect URI: <code className="break-all rounded bg-muted px-1">{uri}</code></li>
        <li>Paste the app's Client ID below.</li>
      </ol>
      <Input placeholder="Spotify Client ID" value={cid} onChange={(e) => setCid(e.target.value)} />
      <Button size="sm" className="w-full" onClick={() => {
        setClientId(cid);
        startSpotifyLogin().catch((e) => toast.error(e.message));
      }}>Connect Spotify</Button>
    </details>
  );
}
