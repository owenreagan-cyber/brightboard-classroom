import { useSyncExternalStore } from "react";

/**
 * Spotify Premium playback in the browser: PKCE sign-in (client ID only, no secret)
 * plus one shared Web Playback SDK player so editor + present mode never fight.
 */
const K = { cid: "hb_spotify_client_id", tok: "hb_spotify_tokens", ver: "hb_spotify_verifier", ret: "hb_spotify_return" };
const SCOPES = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state";
type Tokens = { access: string; refresh: string; expires: number };

export const redirectUri = () => `${window.location.origin}/spotify-callback`;
export const getClientId = () => localStorage.getItem(K.cid) ?? "";
export const setClientId = (id: string) => localStorage.setItem(K.cid, id.trim());

/** "https://open.spotify.com/playlist/abc?si=1" → "spotify:playlist:abc" */
export function spotifyContextUri(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album)\/([A-Za-z0-9]+)/) ?? url.match(/^spotify:(playlist|album):([A-Za-z0-9]+)$/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function startSpotifyLogin() {
  const cid = getClientId();
  if (!cid) throw new Error("Add your Spotify Client ID first");
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  localStorage.setItem(K.ver, verifier);
  localStorage.setItem(K.ret, window.location.pathname + window.location.search);
  const q = new URLSearchParams({ client_id: cid, response_type: "code", redirect_uri: redirectUri(), scope: SCOPES, code_challenge_method: "S256", code_challenge: challenge });
  window.location.href = `https://accounts.spotify.com/authorize?${q}`;
}

function saveTokens(j: { access_token: string; refresh_token?: string; expires_in: number }, prevRefresh = "") {
  const t: Tokens = { access: j.access_token, refresh: j.refresh_token ?? prevRefresh, expires: Date.now() + (j.expires_in - 60) * 1000 };
  localStorage.setItem(K.tok, JSON.stringify(t));
  emitAuth();
  return t;
}

async function tokenRequest(body: Record<string, string>) {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: getClientId(), ...body }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || `Spotify sign-in failed (${r.status})`);
  return j;
}

/** Returns the path to go back to. */
export async function finishSpotifyLogin(code: string) {
  const verifier = localStorage.getItem(K.ver) ?? "";
  saveTokens(await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: verifier }));
  localStorage.removeItem(K.ver);
  return localStorage.getItem(K.ret) || "/board";
}

async function accessToken(): Promise<string> {
  const raw = localStorage.getItem(K.tok);
  if (!raw) throw new Error("Spotify isn't connected");
  const t = JSON.parse(raw) as Tokens;
  if (Date.now() < t.expires) return t.access;
  return saveTokens(await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh }), t.refresh).access;
}

export function disconnectSpotify() {
  localStorage.removeItem(K.tok);
  player?.disconnect();
  player = null;
  started = false;
  setState({ status: "idle", paused: true });
  emitAuth();
}

async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
  });
  if (!r.ok && r.status !== 204) {
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error("Spotify Premium is required for playback");
    throw new Error(j.error?.message || `Spotify error ${r.status}`);
  }
}

// --- auth store ---
const authListeners = new Set<() => void>();
function emitAuth() { authListeners.forEach((l) => l()); }
export function useSpotifyConnected() {
  return useSyncExternalStore(
    (l) => { authListeners.add(l); return () => authListeners.delete(l); },
    () => !!localStorage.getItem(K.tok),
    () => false,
  );
}

// --- player store ---
export type PlayerState = {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
  deviceId?: string;
  paused: boolean;
  contextUri?: string;
  track?: { name: string; artists: string; image?: string };
};
let state: PlayerState = { status: "idle", paused: true };
const listeners = new Set<() => void>();
function setState(p: Partial<PlayerState>) { state = { ...state, ...p }; listeners.forEach((l) => l()); }
export function useSpotifyPlayer() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let player: any = null;
let started = false;

export function initSpotifyPlayer() {
  if (started || !localStorage.getItem(K.tok)) return;
  started = true;
  setState({ status: "loading" });
  const w = window as any;
  const create = () => {
    player = new w.Spotify.Player({ name: "Hero Board", volume: 0.6, getOAuthToken: (cb: (t: string) => void) => accessToken().then(cb).catch((e) => setState({ status: "error", error: e.message })) });
    player.addListener("ready", ({ device_id }: { device_id: string }) => setState({ status: "ready", deviceId: device_id, error: undefined }));
    player.addListener("not_ready", () => setState({ status: "loading" }));
    player.addListener("initialization_error", ({ message }: { message: string }) => setState({ status: "error", error: message }));
    player.addListener("authentication_error", () => setState({ status: "error", error: "Spotify sign-in expired — connect again" }));
    player.addListener("account_error", () => setState({ status: "error", error: "Spotify Premium is required for playback" }));
    player.addListener("player_state_changed", (s: any) => {
      if (!s) return;
      const t = s.track_window?.current_track;
      setState({
        paused: s.paused,
        contextUri: s.context?.uri ?? undefined,
        track: t ? { name: t.name, artists: t.artists.map((a: any) => a.name).join(", "), image: t.album?.images?.[0]?.url } : undefined,
      });
    });
    player.connect();
  };
  if (w.Spotify) return create();
  w.onSpotifyWebPlaybackSDKReady = create;
  const s = document.createElement("script");
  s.src = "https://sdk.scdn.co/spotify-player.js";
  document.body.appendChild(s);
}

async function run(fn: () => Promise<unknown>) {
  try { await fn(); } catch (e) { setState({ error: (e as Error).message }); }
}

export const spotify = {
  playContext: (uri: string, shuffle = false) => run(async () => {
    await player?.activateElement?.();
    const id = state.deviceId;
    if (!id) throw new Error("Player is still starting — try again in a moment");
    await api(`/me/player/shuffle?state=${shuffle}&device_id=${id}`, { method: "PUT" }).catch(() => {});
    await api(`/me/player/play?device_id=${id}`, { method: "PUT", body: JSON.stringify({ context_uri: uri }) });
    setState({ error: undefined });
  }),
  toggle: () => run(async () => { await player?.activateElement?.(); await player?.togglePlay(); }),
  next: () => run(() => player?.nextTrack()),
  prev: () => run(() => player?.previousTrack()),
  volume: (v: number) => run(() => player?.setVolume(v)),
};
