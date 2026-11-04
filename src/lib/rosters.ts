/** Class lists keyed by roster name. Boards pick a roster from their folder. */
export const CLASSES = ["Homeroom", "Reading", "Math"] as const;
export type ClassName = (typeof CLASSES)[number];

export const DEFAULT_ROSTERS: Record<ClassName, string[]> = {
  Homeroom: ["Hannah Bradshaw", "Jasmin Brar", "Teagan Donahue", "Tito Flynn", "Sophia Garcia", "Timothy Imafidon", "Charlotte Laub", "Faith Leitzke", "Alex Lumley", "Cole Majoros", "Jay McWhorter", "Nick Meucci", "Caroline Overby", "Patricie Passler", "Thaddeus Pinette", "Liam Port Ward", "Ava Venne", "Lux Wicker", "Magnus Yoder", "Isaiah Snapp"],
  Reading: ["Aaron Long", "Grace Spindler", "Alexander Lumley", "Easton Rose", "Eli Schiess", "Emma Cullingford", "Emory Schinke", "Finley Murph", "George Wood", "Grady Narron", "Hudson Baugh", "Jaxon Lawson", "Kayleigh Sutton", "Lincoln Thomas", "Lucy Antar", "Mason Henry", "Max Nasiatka", "Dior Mosley", "Sophia Suarez", "Treyson Bledsoe", "William Monday", "Sophia Seaman"],
  Math: ["Adaline Strevens", "Anna Moore", "Bowie Flynn", "Cara Roberts", "Dior Mosley", "Ellie Ashley", "Freddy Giler", "Ian Gibb", "Nathaniel Clark", "Pradyun Daparthi", "Praram Prajapati", "Roger Lewis", "Trey Sullivan", "Tyler Fuhs"],
};

/** Which class a board uses: Reading and Math folders have their own lists, everything else uses Homeroom. */
export function classFor(folder?: string): ClassName {
  return folder === "Reading" ? "Reading" : folder === "Math" ? "Math" : "Homeroom";
}

/** First names for the pickers; students sharing a first name keep their full name. Duplicates removed. */
export function displayNames(full: string[]): string[] {
  const list = [...new Set(full.map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean))];
  const first = (n: string) => n.split(" ")[0]!;
  const count = new Map<string, number>();
  list.forEach((n) => count.set(first(n), (count.get(first(n)) ?? 0) + 1));
  return list.map((n) => (count.get(first(n))! > 1 ? n : first(n)));
}

/** Earlier built-in Reading list (it wrongly mixed in the Math group); saved copies of it are upgraded on load. */
export const OLD_READING = ["Adadine Strevens", "Anna Moore", "Bowie Flynn", "Cara Roberts", "Dior Mosley", "Ellie Ashley", "Freddy Giler", "Ian Gibb", "Nathaniel Clark", "Pradyun Daparthi", "Praram Prajapati", "Roger Lewis", "Trey Sullivan", "Tyler Fuhs", "Aaron Long", "Grace Spindler", "Alexander Lumley", "Easton Rose", "Eli Schiess", "Emma Cullingford", "Emory Schinke", "Finley Murph", "George Wood", "Grady Narron", "Hudson Baugh", "Jaxon Lawson", "Kayleigh Sutton", "Lincoln Thomas", "Lucy Antar", "Mason Henry", "Max Nasiatka", "Dior Mosley", "Sophia Suarez", "Treyson Bledsoe", "William Monday", "Sophia Seaman"];

/** Saved list to use: replaces an untouched copy of an outdated built-in list. */
export function upgradeRoster(c: ClassName, saved: string[]): string[] | null {
  return c === "Reading" && saved.join("|") === OLD_READING.join("|") ? DEFAULT_ROSTERS.Reading : null;
}
