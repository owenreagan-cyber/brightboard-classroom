import { specialFor, type Folder } from "./library";
import type { SlideData } from "./board";

export const SUBJECT_DESIGNS = [
  { key: "homeroom", label: "Homeroom", folder: "Homeroom" },
  { key: "math", label: "Math", folder: "Math" },
  { key: "snack", label: "Snack", folder: "Snack" },
  { key: "writing", label: "Writing", folder: "Writing" },
  { key: "movement", label: "Movement", folder: "Movement" },
  { key: "spelling", label: "Spelling", folder: "Spelling" },
  { key: "reading", label: "Reading", folder: "Reading" },
  { key: "lunch", label: "Lunch", folder: "Lunch" },
  { key: "recess", label: "Recess", folder: "Recess" },
  { key: "history", label: "History", folder: "History" },
  { key: "science", label: "Science", folder: "Science" },
  { key: "music", label: "Music", folder: "Specials", day: "Mon" },
  { key: "pe", label: "P.E.", folder: "Specials", day: "Tue" },
  { key: "art", label: "Art", folder: "Specials", day: "Wed" },
  { key: "industrial", label: "Industrial Arts", folder: "Specials", day: "Thu" },
  { key: "latin", label: "Latin", folder: "Specials", day: "Fri" },
  { key: "packup", label: "Pack Up", folder: "Pack Up" },
  { key: "dismissal", label: "Dismissal", folder: "Dismissal" },
  { key: "assessment", label: "Assessments", folder: "Assessments" },
  { key: "hero", label: "Hero Board", folder: undefined },
] as const;

export type SubjectKey = typeof SUBJECT_DESIGNS[number]["key"];
type DesignInput = Pick<SlideData, "folder" | "day"> & { heading?: string };

/** Presentation-only resolution; never rewrites saved boards or their schedule. */
export function subjectDesign(data: DesignInput) {
  let label: string | undefined = data.folder;
  if (label === "Morning") label = "Homeroom";
  if (label === "Lunch/Recess/Pack-up") label = "Lunch";
  if (label === "Specials") label = data.day ? specialFor(data.day) : "Music";
  const exact = SUBJECT_DESIGNS.find((d) => d.label === label);
  if (exact) return exact;
  const heading = data.heading?.toLowerCase() ?? "";
  const inferred = SUBJECT_DESIGNS.find((d) => d.key !== "hero" && heading.includes(d.label.toLowerCase()));
  if (inferred) return inferred;
  return heading.includes("morning") ? SUBJECT_DESIGNS[0] : SUBJECT_DESIGNS[19];
}

export function subjectData(key: SubjectKey): { folder?: Folder; day?: SlideData["day"] } {
  const design = SUBJECT_DESIGNS.find((d) => d.key === key);
  if (!design) return {};
  return { folder: design.folder, ...("day" in design ? { day: design.day } : {}) };
}