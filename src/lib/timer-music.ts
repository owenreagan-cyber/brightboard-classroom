/** Pure rules for "music while a timer runs": which timer owns playback and what to do on each change. */
export type TimerPhase = "work" | "break" | "both";
export type MusicAction = "play" | "pause" | "stop" | null;

/** Should music be on right now for this timer? */
export function musicWanted(running: boolean, finished: boolean, phase: 1 | 2 | null, phases: TimerPhase = "both"): boolean {
  if (!running || finished) return false;
  if (phase === null || phases === "both") return true;
  return phases === "work" ? phase === 1 : phase === 2;
}

/** Decide the action for an owner given whether it wants music and who currently owns playback. */
export function musicAction(owner: string, wanted: boolean, wasWanted: boolean, currentOwner: string | null, finished: boolean): MusicAction {
  if (wanted && !wasWanted) return "play";
  if (!wanted && wasWanted && currentOwner === owner) return finished ? "stop" : "pause";
  return null;
}
