# Class Calendar & Schedule View

A new **Schedule** page in Hero Board (button in the board header) for planning boards ahead of time.

## What you'll see
- **Week calendar (Mon–Fri):** columns for each day, rows for each bell block (Homeroom 7:20 through Dismissal 2:40), each with its schedule-card artwork and time.
- **Specials per day:** the 1:50 block shows that day's special (Music, P.E., Art, Industrial Arts, Latin).
- **Board for each slot:** each cell shows the board planned for that subject and day (thumbnail + title), with a "Staged" badge if not yet approved. Empty cells show **Create board**. Tapping a filled cell opens that board in the editor.
- **History / Science at 1:15:** both shown in that slot so you can see which board exists each day.
- **Today highlighted**, with a "Now" marker on the current block.
- **Day view:** tap a day name for a single-day list (good on your phone).
- **Class lists panel:** Homeroom, Reading (RM4) and Math (SM5) names shown next to the blocks that use them (Homeroom, Reading, Math), plus a full lists tab. Read-only here; edit them in Class list as now.

## Notes
- Uses your existing schedule, specials and boards — nothing new to save, and it matches what the "Now / Up next" bar suggests.
- Assessments boards are listed separately at the bottom (never placed on the calendar).

## Technical details
- New route `src/routes/_authenticated/schedule.tsx` with its own head(); link from board header.
- Pure helper `weekGrid(slides)` in `src/lib/library.ts` (blocks x days -> slide | null, specials label) with tests in `library.test.ts`.
- Reads slides/rosters via the same Cloud queries as the board; opening a cell navigates to `/board?slide=N`.
- Reuses `ScaledSlide`/`SlideView` thumbnails and `artFor` card art.
