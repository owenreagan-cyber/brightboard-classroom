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
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|artist)\/([A-Za-z0-9]+)/) ?? url.match(/^spotify:(playlist|album|artist):([A-Za-z0-9]+)$/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

/** Classroom music library — resolved via Spotify search at play time, so no hard-coded IDs go stale. */
export type LibraryItem = { id: string; label: string; emoji: string; group: string; query: string; kind: "artist" | "playlist" };
export const MUSIC_LIBRARY: LibraryItem[] = [
  { id: "brooklyn-duo", label: "Brooklyn Duo", emoji: "🎻", group: "Acoustic covers", query: "Brooklyn Duo", kind: "artist" },
  { id: "piano-guys", label: "The Piano Guys", emoji: "🎹", group: "Acoustic covers", query: "The Piano Guys", kind: "artist" },
  { id: "vitamin-string", label: "Vitamin String Quartet", emoji: "🎻", group: "Acoustic covers", query: "Vitamin String Quartet", kind: "artist" },
  { id: "2cellos", label: "2CELLOS", emoji: "🎶", group: "Acoustic covers", query: "2CELLOS", kind: "artist" },
  { id: "kurt-hugo", label: "Kurt Hugo Schneider", emoji: "🎸", group: "Acoustic covers", query: "Kurt Hugo Schneider", kind: "artist" },
  { id: "classical-kids", label: "Classical for kids", emoji: "🧒", group: "Classical", query: "classical music for kids", kind: "playlist" },
  { id: "classical-focus", label: "Classical focus", emoji: "📚", group: "Classical", query: "classical focus study", kind: "playlist" },
  { id: "mozart", label: "Mozart", emoji: "🎼", group: "Classical", query: "Wolfgang Amadeus Mozart", kind: "artist" },
  { id: "bach", label: "Bach", emoji: "🎼", group: "Classical", query: "Johann Sebastian Bach", kind: "artist" },
  { id: "calm-piano", label: "Calm piano", emoji: "🌙", group: "Calm & acoustic", query: "peaceful piano", kind: "playlist" },
  { id: "acoustic-chill", label: "Acoustic chill", emoji: "🪕", group: "Calm & acoustic", query: "acoustic chill instrumental", kind: "playlist" },
  { id: "lofi-anime", label: "Lofi anime study", emoji: "🍥", group: "Lofi study", query: "lofi anime study instrumental", kind: "playlist" },
  { id: "lofi-study", label: "Lofi study beats", emoji: "📝", group: "Lofi study", query: "lofi study beats instrumental", kind: "playlist" },
  { id: "anime-piano", label: "Anime piano", emoji: "⚡", group: "Calm & acoustic", query: "anime piano instrumental", kind: "playlist" },
];

const resolved = new Map<string, string>();
export async function resolveLibraryItem(item: LibraryItem): Promise<string> {
  const hit = resolved.get(item.id);
  if (hit) return hit;
  const r = await fetch(`https://api.spotify.com/v1/search?type=${item.kind}&limit=1&q=${encodeURIComponent(item.query)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!r.ok) throw new Error(`Couldn't find ${item.label} on Spotify`);
  const j = await r.json();
  const me = await myId();
  // Never pick one of the teacher's own playlists.
  const uri = (item.kind === "artist" ? j.artists?.items : j.playlists?.items)?.find((x: any) => x && x.owner?.id !== me)?.uri as string | undefined;
  if (!uri) throw new Error(`Couldn't find ${item.label} on Spotify`);
  resolved.set(item.id, uri);
  return uri;
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
  error?: string | undefined;
  deviceId?: string | undefined;
  paused: boolean;
  contextUri?: string | undefined;
  track?: { name: string; artists: string; image?: string | undefined } | undefined;
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
      if (t?.id && !s.paused) void guard(t.id, s.context?.uri ?? undefined).catch(() => player?.pause());
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

// --- classroom safety: no explicit songs, no personal playlists ---
/** Pure rule: a song may play only if it isn't explicit and the playlist isn't the teacher's own. */
export function classroomBlock(t: { explicit: boolean }, ctx: { type: string; ownerId?: string | undefined } | null, me: string | null): string | null {
  if (t.explicit) return "Skipped a song with explicit lyrics";
  if (!ctx) return "Only school playlists can play here";
  if (ctx.type === "playlist" && me && ctx.ownerId === me) return "Your personal playlists can't play on the board";
  if (ctx.type !== "playlist" && ctx.type !== "artist" && ctx.type !== "album") return "Only school playlists can play here";
  return null;
}
let meId: string | null = null;
async function myId() {
  if (meId) return meId;
  const r = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (r.ok) meId = (await r.json()).id ?? null;
  return meId;
}
async function getJson(path: string) {
  const r = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  return r.ok ? r.json() : null;
}
const checked = new Map<string, string | null>();
async function guard(trackId: string, ctxUri: string | undefined) {
  const key = `${trackId}|${ctxUri ?? ""}`;
  let why = checked.get(key);
  if (why === undefined) {
    const t = await getJson(`/tracks/${trackId}`);
    const [, type, id] = (ctxUri ?? "").split(":");
    const ctx = !ctxUri || !type ? null : { type, ownerId: type === "playlist" ? (await getJson(`/playlists/${id}?fields=owner.id`))?.owner?.id : undefined };
    why = classroomBlock({ explicit: t ? !!t.explicit : true }, ctx, await myId());
    checked.set(key, why);
  }
  if (!why) return;
  setState({ error: why });
  if (why.startsWith("Skipped")) await player?.nextTrack();
  else await player?.pause();
}

// --- present-mode autoplay ---
let presenting = false;
const played = new Set<string>();
const presentListeners = new Set<() => void>();
/** Called by the board when present mode starts/stops; leaving pauses the music. */
export function setSpotifyPresenting(on: boolean) {
  if (presenting === on) return;
  presenting = on;
  played.clear();
  if (!on && !state.paused) void spotify.toggle();
  presentListeners.forEach((l) => l());
}
export function useSpotifyPresenting() {
  return useSyncExternalStore((l) => { presentListeners.add(l); return () => presentListeners.delete(l); }, () => presenting, () => false);
}
/** Start a playlist once per present session. */
export function autoplayOnce(uri: string) {
  if (!presenting || played.has(uri) || state.status !== "ready" || state.contextUri === uri) return;
  played.add(uri);
  void spotify.playContext(uri, true);
}

// --- class music (chosen on the Music page, saved to the teacher's account) ---
const CM = "hb_class_music";
const cmListeners = new Set<() => void>();
export function getClassMusic(): LibraryItem | undefined {
  const id = typeof localStorage === "undefined" ? null : localStorage.getItem(CM);
  return MUSIC_LIBRARY.find((m) => m.id === id);
}
export function useClassMusic() {
  return useSyncExternalStore((l) => { cmListeners.add(l); return () => cmListeners.delete(l); }, () => getClassMusic()?.id ?? null, () => null);
}
export async function setClassMusic(id: string) {
  if (!MUSIC_LIBRARY.some((m) => m.id === id)) return;
  localStorage.setItem(CM, id);
  cmListeners.forEach((l) => l());
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase.auth.updateUser({ data: { classMusic: id } });
}
/** Pull the saved choice from the account so phone + smartboard match. */
export async function syncClassMusic() {
  const { supabase } = await import("@/integrations/supabase/client");
  const id = (await supabase.auth.getUser()).data.user?.user_metadata?.["classMusic"];
  if (typeof id === "string" && MUSIC_LIBRARY.some((m) => m.id === id) && localStorage.getItem(CM) !== id) {
    localStorage.setItem(CM, id);
    cmListeners.forEach((l) => l());
  }
}
