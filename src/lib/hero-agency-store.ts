import { normalizeHeroJobs, validHeroJobs, newHeroJobs, type HeroJobsState } from "./hero-jobs";

/** Dedicated account value wins; old board metadata is a read-only migration source. */
export function readHeroAgency(metadata: Record<string, unknown>): HeroJobsState {
  const saved = metadata["hero_agency"];
  if (validHeroJobs(saved)) return normalizeHeroJobs(saved);
  const games = metadata["games"];
  const legacy = games && typeof games === "object" ? (games as Record<string, unknown>)["hb-hero-jobs"] : undefined;
  return validHeroJobs(legacy) ? normalizeHeroJobs(legacy) : newHeroJobs();
}

/** Apply only changed fields so an assignment save doesn't undo another device's check-ins. */
export function mergeHeroAgency(remote: HeroJobsState, before: HeroJobsState, after: HeroJobsState): HeroJobsState {
  if (before.weekStart !== after.weekStart) return after;
  if (remote.weekStart !== before.weekStart) throw new Error("The week changed on another device. Reopen the jobs before editing.");
  const assign = { ...remote.assign }, checkIns = { ...remote.checkIns };
  for (const id of new Set([...Object.keys(before.assign), ...Object.keys(after.assign)])) {
    if (before.assign[id] === after.assign[id]) continue;
    const name = after.assign[id];
    if (name) {
      for (const other of Object.keys(assign)) if (other !== id && assign[other] === name) delete assign[other];
      assign[id] = name;
    } else delete assign[id];
  }
  for (const name of new Set([...Object.keys(before.checkIns), ...Object.keys(after.checkIns)])) {
    const delta = (after.checkIns[name] ?? 0) - (before.checkIns[name] ?? 0);
    if (delta) checkIns[name] = Math.max(0, Math.min(5, (remote.checkIns[name] ?? 0) + delta));
  }
  return { ...remote, assign, checkIns };
}