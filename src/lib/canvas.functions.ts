import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseAgenda, pickAgenda, type Agenda } from "./canvas";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/udc_canvas_lms_thales_academy";

async function canvas<T>(path: string): Promise<T> {
  const key = process.env["LOVABLE_API_KEY"]; const conn = process.env["UDC_CANVAS_LMS_THALES_ACADEMY_API_KEY"];
  if (!key || !conn) throw new Error("Canvas isn't connected.");
  const res = await fetch(`${GATEWAY_URL}${path}`, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn } });
  if (!res.ok) { const body = await res.text(); console.error(`Canvas failed [${res.status}] ${path}: ${body}`); throw new Error(`Canvas error ${res.status}`); }
  return (await res.json()) as T;
}

export const listCanvasCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ courses: { id: number; name: string }[]; error?: string }> => {
    try {
      const c = await canvas<{ id: number; name: string }[]>("/courses?enrollment_state=active&enrollment_type=teacher&per_page=100");
      return { courses: c.map(({ id, name }) => ({ id, name })) };
    } catch (e) { return { courses: [], error: (e as Error).message }; }
  });

type ModuleItem = { type: string; title: string; page_url?: string };

/** Lesson and homework for each subject's course, from the weekly agenda page that contains `date`. */
export const canvasWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ courses: z.record(z.string().max(40), z.number().int().positive()), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }): Promise<{ agendas: Record<string, (Agenda & { title: string; url: string }) | null>; error?: string }> => {
    const agendas: Record<string, (Agenda & { title: string; url: string }) | null> = {};
    try {
      await Promise.all(Object.entries(data.courses).map(async ([subject, id]) => {
        const mods = await canvas<{ items?: ModuleItem[] }[]>(`/courses/${id}/modules?include[]=items&per_page=50`);
        const pages = mods.flatMap((m) => m.items ?? []).filter((i) => i.type === "Page" && i.page_url);
        const hit = pickAgenda(pages, data.date);
        if (!hit) { agendas[subject] = null; return; }
        const page = await canvas<{ title: string; body: string | null; html_url: string }>(`/courses/${id}/pages/${hit.page_url}`);
        agendas[subject] = { ...parseAgenda(page.body ?? ""), title: page.title, url: page.html_url };
      }));
      return { agendas };
    } catch (e) { return { agendas, error: (e as Error).message }; }
  });
