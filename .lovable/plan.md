# Schedule Sync: Editable Times, Google Calendar and Canvas

The Schedule page becomes your planning hub: block times you can edit, your Google Calendar events, and lesson numbers and homework pulled from Canvas. Dates and times come from your MacBook's clock.

## 1. Editable block times
- Each block on the Schedule page gets an **Edit times** control (start and end).
- Saved to your account, so the classroom computer and your phone match.
- The "Now / Up next" suggestions, the NOW marker and the calendar all use your edited times. **Reset to school schedule** restores the original bell times.

## 2. Google Calendar → Board (read-only)
- You connect your Google Calendar once (a connect card appears in chat).
- The Schedule page shows this week's events (assemblies, early release, days off) in the matching day and time, with all-day events as a banner on that day.
- On days marked off, the board stops suggesting boards.
- Hero Board never adds or changes anything in your calendar.

## 3. Canvas lessons and homework
- Canvas has no ready-made sign-in here, so you'll enter two things once:
  - your school's Canvas web address (for example `yourschool.instructure.com`)
  - a Canvas **access token**, made under Account → Settings → "New access token". It's stored securely on the server.
- You'll pick which Canvas course goes with each subject (Math, Reading, Spelling…).
- For each day, the Schedule page shows that subject's **lesson** (from Canvas pages or modules, for example "Lesson 42") and **homework** (assignments due that day).
- On the board, a new **Lesson & homework** card can show the current lesson and homework on a slide.

## Not included
- Writing back to Google Calendar or Canvas.
- Changes appear when you open or refresh the Schedule page, or every few minutes while it's open. They don't push to the board instantly.

## Technical details
- Block time overrides: stored in auth user metadata (`blockTimes`), merged over `BLOCKS` by a pure `effectiveBlocks()` in `src/lib/library.ts`. `suggest`/`weekGrid` take the merged blocks. Tests cover the overrides and the reset.
- Google Calendar: `standard_connectors--connect google_calendar` (gateway). An authenticated server function `listCalendarEvents({from,to})` in `src/lib/calendar.functions.ts` calls `/calendars/primary/events` through the gateway. All-day end dates are exclusive.
- Canvas: secrets `CANVAS_BASE_URL` + `CANVAS_TOKEN` (added with the add_secret tool). Authenticated server functions in `src/lib/canvas.functions.ts`: `listCourses`, `lessonsFor({courseIds, from, to})` using `/api/v1/courses/:id/assignments?bucket=upcoming` and `/modules?include[]=items`. Lesson numbers are parsed by a pure `parseLessonNumber()` with tests. The subject → course mapping lives in user metadata.
- The client uses the browser's `Date` (the MacBook clock and timezone) for "today", "now" and week ranges.
- New `lesson` widget type (heading + homework list) in widgets.tsx, added to the BoardSchema.
