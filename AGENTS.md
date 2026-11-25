<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Slides store their content (heading, body, background, tools) as one JSON `data` column so new slide tools need no database change.
- Slide tools live in src/components/board/widgets.tsx; timer-sequence math lives in src/lib/board.ts with tests next to it.
- Board library (folders/days/staged) lives inside each slide's data JSON; schema, suggestions and import/export logic in src/lib/library.ts with tests next to it — keeps the library without database changes.
- Resolve subject presentation in src/lib/subject-design.ts from folder/day or legacy headings; keep matching artwork and CSS themes separate from saved schedule data so existing boards gain subject designs without migration.
- Per-subject default themes (background, card placement, font, colors) are saved in the signed-in user's auth metadata and sanitized by src/lib/subject-theme.ts — cross-device without a database change, and never used for permissions.
- AI slide drafting runs in an authenticated server function (src/lib/draft.functions.ts) so the AI key stays on the server.
- Spotify Premium playback uses browser-only PKCE sign-in (teacher's own Spotify app Client ID, no secret) and one shared Web Playback SDK player in src/lib/spotify.ts — there is no Spotify connector, and a singleton avoids duplicate players in editor and present mode.
- Classroom game tools (random number, mystery star, prize board) keep state in browser localStorage with logic in src/lib/games.ts — survives refresh without a database change.
- Canvas lessons/homework come from each course's weekly agenda page (title holds the week's dates), read through the Canvas custom connector in src/lib/canvas.functions.ts and parsed by src/lib/canvas.ts.
- Edited block times and the subject→Canvas course map live in auth user metadata; Google Calendar is read-only and only used for display and no-school days.
- School-day labels use the connected Google staff calendar plus personal events, paginated across a July–June year; never treat national observances as school closures or invent break dates.
- Continuing lesson plans and dated welcome messages live in user metadata; pure teaching-day progression is independent of Canvas so agenda refreshes cannot reset a counter.
- Lesson welcome generation uses authenticated server functions and request-scoped Responses helpers; numbers and materials are assembled deterministically so AI cannot alter homework references.
- Classroom tools (attendance, team points, jobs, help line, word) are floating tools in src/components/board/classroom.tsx with pure logic in src/lib/classroom.ts, synced via usePersisted cloud metadata — no database change.
- Phone remote uses a per-teacher realtime broadcast channel (src/lib/remote.ts) — no table needed for transient commands.
- Hero Agency jobs are a rebuild of Classroom Companion; all board tools, reports, licenses and the authenticated /hero-agency/widget use useHeroAgency with a dedicated hero_agency metadata value, legacy read fallback, field-level merge saves and five-second account polling so jobs are independent of slide/game saves. External Classroom Companion remains unconnected until that project's storage and shared integration are configured.
- Hero Agency PDF downloads use size-specific prebuilt artwork in public/downloads and browser-only dynamic pdf-lib in src/lib/hero-license-pdf.ts to insert current names and arrange exact-size print sheets without sending student data elsewhere; legacy gp/points field names store stamp totals for compatibility.
