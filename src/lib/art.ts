import art from "@/assets/anime-art.jpg.asset.json";
import dismissal from "@/assets/anime-dismissal.jpg.asset.json";
import history from "@/assets/anime-history.jpg.asset.json";
import homeroom from "@/assets/anime-homeroom.jpg.asset.json";
import industrial from "@/assets/anime-industrial.jpg.asset.json";
import latin from "@/assets/anime-latin.jpg.asset.json";
import lunch from "@/assets/anime-lunch.jpg.asset.json";
import math from "@/assets/anime-math.jpg.asset.json";
import movement from "@/assets/anime-movement.jpg.asset.json";
import music from "@/assets/anime-music.jpg.asset.json";
import packup from "@/assets/anime-packup.jpg.asset.json";
import pe from "@/assets/anime-pe.jpg.asset.json";
import reading from "@/assets/anime-reading.jpg.asset.json";
import recess from "@/assets/anime-recess.jpg.asset.json";
import science from "@/assets/anime-science.jpg.asset.json";
import snack from "@/assets/anime-snack.jpg.asset.json";
import spelling from "@/assets/anime-spelling.jpg.asset.json";
import title from "@/assets/anime-title.jpg.asset.json";
import writing from "@/assets/anime-writing.jpg.asset.json";
import { subjectDesign, type SubjectKey } from "./subject-design";
import type { SlideData } from "./board";

const SUBJECT_ART: Record<SubjectKey, { url: string }> = {
  homeroom, math, snack, writing, movement, spelling, reading, lunch, recess,
  history, science, music, pe, art, industrial, latin, packup, dismissal,
  assessment: title, hero: title,
};

/** The anime card that identifies a board: its folder's art (specials use the day's special). */
export function artFor(d: Pick<SlideData, "folder" | "day"> & { heading?: string }): string {
  return SUBJECT_ART[subjectDesign(d).key].url;
}
export const titleArt = title.url;
