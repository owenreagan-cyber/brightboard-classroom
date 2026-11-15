import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CalEvent } from "./calendar";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

/** Read-only: personal events and the connected school's staff calendar. */
export const listCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data }): Promise<{ events: CalEvent[]; sources?: string[]; schoolCalendar?: boolean; error?: string }> => {
    const key = process.env["LOVABLE_API_KEY"]; const conn = process.env["GOOGLE_CALENDAR_API_KEY"];
    if (!key || !conn) return { events: [], error: "Google Calendar isn't connected." };
    const headers = { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn };
    async function read<T>(path: string): Promise<T> {
      const res = await fetch(`${GATEWAY_URL}${path}`, { headers });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Calendar failed [${res.status}]: ${body}`);
        throw new Error(`Couldn't read Google Calendar [${res.status}]: ${body}`);
      }
      return res.json() as Promise<T>;
    }
    try {
      type Calendar = { id: string; summary: string; primary?: boolean };
      const calendars: Calendar[] = [];
      let token: string | undefined;
      do {
        const q = new URLSearchParams({ maxResults: "250" });
        if (token) q.set("pageToken", token);
        const page = await read<{ items?: Calendar[]; nextPageToken?: string }>(`/users/me/calendarList?${q}`);
        calendars.push(...(page.items ?? [])); token = page.nextPageToken;
      } while (token);
      // Use the school's calendar, not national observances or other grade calendars.
      const staff = calendars.filter((c) => /\bstaff calendar\b/i.test(c.summary));
      const chosen = [{ id: "primary", summary: "Your calendar" }, ...staff];
      const end = new Date(data.to + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + 1);
      type Event = { id: string; status?: string; summary?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } };
      const events = (await Promise.all(chosen.map(async (calendar) => {
        const out: CalEvent[] = [];
        let pageToken: string | undefined;
        do {
          // Wide UTC boundaries include all local dates, without hardcoding a DST offset.
          const q = new URLSearchParams({ timeMin: `${data.from}T00:00:00+14:00`, timeMax: end.toISOString().replace("Z", "-12:00"), singleEvents: "true", orderBy: "startTime", maxResults: "2500" });
          if (pageToken) q.set("pageToken", pageToken);
          const page = await read<{ items?: Event[]; nextPageToken?: string }>(`/calendars/${encodeURIComponent(calendar.id)}/events?${q}`);
          out.push(...(page.items ?? []).filter((e) => e.status !== "cancelled" && e.start && e.end).map((e) => ({
            id: `${calendar.id}:${e.id}`, summary: e.summary ?? "(no title)", allDay: !!e.start?.date,
            start: e.start?.date ?? e.start?.dateTime ?? "", end: e.end?.date ?? e.end?.dateTime ?? "", calendar: calendar.summary,
          })));
          pageToken = page.nextPageToken;
        } while (pageToken);
        return out;
      }))).flat();
      return { events, sources: chosen.map((c) => c.summary), schoolCalendar: staff.length > 0, ...(!staff.length ? { error: "No school staff calendar found in your Google Calendar." } : {}) };
    } catch (error) {
      return { events: [], error: error instanceof Error ? error.message : "Couldn't read Google Calendar." };
    }
  });
