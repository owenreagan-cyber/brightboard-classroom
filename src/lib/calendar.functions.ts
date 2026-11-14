import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CalEvent } from "./calendar";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

/** Read-only: the teacher's Google Calendar events between two dates. */
export const listCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }): Promise<{ events: CalEvent[]; error?: string }> => {
    const key = process.env["LOVABLE_API_KEY"]; const conn = process.env["GOOGLE_CALENDAR_API_KEY"];
    if (!key || !conn) return { events: [], error: "Google Calendar isn't connected." };
    const q = new URLSearchParams({ timeMin: `${data.from}T00:00:00-05:00`, timeMax: `${data.to}T23:59:59-05:00`, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    const res = await fetch(`${GATEWAY_URL}/calendars/primary/events?${q}`, { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn } });
    if (!res.ok) { console.error(`Calendar failed [${res.status}]: ${await res.text()}`); return { events: [], error: `Couldn't read Google Calendar (${res.status}).` }; }
    const j = (await res.json()) as { items?: { id: string; summary?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } }[] };
    return {
      events: (j.items ?? []).map((e) => ({
        id: e.id, summary: e.summary ?? "(no title)", allDay: !!e.start?.date,
        start: e.start?.date ?? e.start?.dateTime ?? "", end: e.end?.date ?? e.end?.dateTime ?? "",
      })),
    };
  });
