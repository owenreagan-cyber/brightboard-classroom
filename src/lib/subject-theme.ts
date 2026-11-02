import { useSyncExternalStore } from "react";
import type { SubjectKey } from "./subject-design";

export type CardPlacement = "left" | "right" | "large" | "hidden";
export type ThemeBackground = "subject" | "sakura" | "sky" | "stars" | "cream";
export type SubjectTheme = {
  background?: ThemeBackground;
  card?: CardPlacement;
  font?: string;
  ink?: string;
  accent?: string;
};
export type SubjectThemes = Partial<Record<SubjectKey, SubjectTheme>>;

export const THEME_FONTS = ["Dela Gothic One", "Chakra Petch", "Fredoka", "Roboto Slab", "Bungee", "Lexend", "Zen Kaku Gothic New"] as const;
export const CARD_PLACEMENTS: { key: CardPlacement; label: string }[] = [
  { key: "left", label: "Card left of title" },
  { key: "right", label: "Card right of title" },
  { key: "large", label: "Big card on top" },
  { key: "hidden", label: "Hide card" },
];

const HEX = /^#[0-9a-f]{6}$/i;
/** Keeps only known, safe values so saved themes can never inject CSS. */
export function cleanTheme(t: unknown): SubjectTheme {
  if (!t || typeof t !== "object") return {};
  const o = t as Record<string, unknown>;
  const out: SubjectTheme = {};
  if (["subject", "sakura", "sky", "stars", "cream"].includes(o["background"] as string)) out.background = o["background"] as ThemeBackground;
  if (CARD_PLACEMENTS.some((c) => c.key === o["card"])) out.card = o["card"] as CardPlacement;
  if ((THEME_FONTS as readonly string[]).includes(o["font"] as string)) out.font = o["font"] as string;
  if (typeof o["ink"] === "string" && HEX.test(o["ink"])) out.ink = o["ink"];
  if (typeof o["accent"] === "string" && HEX.test(o["accent"])) out.accent = o["accent"];
  return out;
}

let themes: SubjectThemes = {};
const listeners = new Set<() => void>();
export function setSubjectThemes(next: SubjectThemes) {
  themes = next;
  listeners.forEach((l) => l());
}
export function useSubjectThemes() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => themes,
    () => themes,
  );
}
