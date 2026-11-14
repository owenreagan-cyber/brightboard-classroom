import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(v + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Choose a valid date");
const planSchema = z.object({
  startDate: dateSchema,
  startLesson: z.number().int().min(1).max(10000),
  materials: z.string().max(500),
  skipped: z.array(dateSchema).max(1000),
  corrections: z.record(dateSchema, z.number().int().min(1).max(10000)),
});
export type LessonPlan = z.infer<typeof planSchema>;
export type LessonPlans = Record<string, LessonPlan>;
export type DailyMessage = { heading: string; body: string; signature: string };
export type LessonMessages = Record<string, Record<string, DailyMessage>>;

export function cleanLessonPlans(value: unknown): LessonPlans {
  const out: LessonPlans = {};
  if (!value || typeof value !== "object") return out;
  for (const [key, v] of Object.entries(value)) {
    const parsed = planSchema.safeParse(v);
    if (parsed.success) out[key] = parsed.data;
  }
  return out;
}
export function cleanLessonMessages(value: unknown): LessonMessages {
  const schema = z.record(z.string(), z.record(dateSchema, z.object({ heading: z.string().max(200), body: z.string().max(1500), signature: z.string().max(5000) })));
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

const nextDate = (date: string) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
export function teachingDay(plan: LessonPlan, date: string, offDates: string[] = []) {
  const wd = new Date(date + "T12:00:00Z").getUTCDay();
  return wd > 0 && wd < 6 && !plan.skipped.includes(date) && !offDates.includes(date);
}
/** Corrections re-anchor all following teaching days; Canvas never resets this counter. */
export function lessonOn(plan: LessonPlan, date: string, offDates: string[] = []): number | null {
  if (date < plan.startDate || !teachingDay(plan, date, offDates)) return null;
  let lesson = plan.startLesson;
  let seen = false;
  for (let d = plan.startDate; d <= date; d = nextDate(d)) {
    if (!teachingDay(plan, d, offDates)) continue;
    if (seen) lesson++;
    lesson = plan.corrections[d] ?? lesson;
    seen = true;
  }
  return seen ? lesson : null;
}
export function previousLesson(plan: LessonPlan, date: string, offDates: string[] = []): number | null {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  for (let key = d.toISOString().slice(0, 10); key >= plan.startDate; key = d.toISOString().slice(0, 10)) {
    if (teachingDay(plan, key, offDates)) return lessonOn(plan, key, offDates);
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return null;
}
export function messageContext(plan: LessonPlan, date: string, offDates: string[] = []) {
  const lesson = lessonOn(plan, date, offDates);
  const previous = previousLesson(plan, date, offDates);
  // Monday is a fresh welcome; other teaching days refer to the previous taught lesson.
  const homeworkLesson = new Date(date + "T12:00:00Z").getUTCDay() === 1 ? null : previous;
  return { date, lesson, homeworkLesson, materials: plan.materials };
}
export const contextSignature = (context: ReturnType<typeof messageContext>) => JSON.stringify(context);