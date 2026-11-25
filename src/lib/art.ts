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
import fig_art from "@/assets/figure-art.webp.asset.json";
import fig_dismissal from "@/assets/figure-dismissal.webp.asset.json";
import fig_history from "@/assets/figure-history.webp.asset.json";
import fig_homeroom from "@/assets/figure-homeroom.webp.asset.json";
import fig_industrial from "@/assets/figure-industrial.webp.asset.json";
import fig_latin from "@/assets/figure-latin.webp.asset.json";
import fig_lunch from "@/assets/figure-lunch.webp.asset.json";
import fig_math from "@/assets/figure-math.webp.asset.json";
import fig_movement from "@/assets/figure-movement.webp.asset.json";
import fig_music from "@/assets/figure-music.webp.asset.json";
import fig_packup from "@/assets/figure-packup.webp.asset.json";
import fig_pe from "@/assets/figure-pe.webp.asset.json";
import fig_reading from "@/assets/figure-reading.webp.asset.json";
import fig_recess from "@/assets/figure-recess.webp.asset.json";
import fig_science from "@/assets/figure-science.webp.asset.json";
import fig_snack from "@/assets/figure-snack.webp.asset.json";
import fig_spelling from "@/assets/figure-spelling.webp.asset.json";
import fig_title from "@/assets/figure-title.webp.asset.json";
import fig_writing from "@/assets/figure-writing.webp.asset.json";
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
/** Art for a subject key, falling back to the title card. */
export function artForKey(key: string): string {
  return (SUBJECT_ART as Record<string, { url: string }>)[key]?.url ?? title.url;
}
export const titleArt = title.url;

const FIGURES: Record<string, { url: string }> = { art: fig_art, dismissal: fig_dismissal, history: fig_history, homeroom: fig_homeroom, industrial: fig_industrial, latin: fig_latin, lunch: fig_lunch, math: fig_math, movement: fig_movement, music: fig_music, packup: fig_packup, pe: fig_pe, reading: fig_reading, recess: fig_recess, science: fig_science, snack: fig_snack, spelling: fig_spelling, writing: fig_writing, assessment: fig_title, hero: fig_title };
/** Full-body character sticker (transparent) for a subject key. */
export function figureForKey(key: string): string {
  return FIGURES[key]?.url ?? fig_title.url;
}
