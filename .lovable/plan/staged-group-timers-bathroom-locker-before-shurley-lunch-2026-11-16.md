# Staged group timers (Bathroom/Locker before Shurley, Lunch)

## What you'll get
A new **Staged timer** tool on the board (Tools menu and slide tools) that sends Homeroom groups out one at a time and ends with a big "ready" call.

**Morning (Bathroom / locker), 9:00–9:14**
- Group order for the day shows as a list; current group is highlighted with names in big letters ("Group 3: Liam, Lux, Magnus, Nick, Patricie — GO!").
- Next group is called every 2 minutes (you can change the gap; it's set to 2 for now since you weren't sure).
- Chime + flash at each group change.
- At 9:15: full-width "Ready for Shurley!" banner.

**Lunch, 12:20–12:40**
- Same group calls, every 2 minutes from 12:20.
- 12:45: "Clean up / sweep"
- 12:48: "Ready for recess!"

**Runs on the clock** like the existing routine tool — starts by itself at the set time, no button needed. Shows "Starts in…" before and "Done" after.

**Group order changes each school day**
- Order is shuffled from the date, so it's the same on the classroom computer and your phone, but different each day (never stuck on 1-2-3-4). Consecutive days never start with the same group.
- A "Shuffle again" button if you want a different order today.

## Groups (first names only)
- Group 1: Alex, Ava, Caroline, Charlotte, Cole
- Group 2: Faith, Hannah, Isaiah, Jasmin, Jay
- Group 3: Liam, Lux, Magnus, Nick, Patricie
- Group 4: Sophia, Teagan, Thaddeus, Timothy, Tito

Groups are editable in the tool (move a name between groups); defaults are the list above.

## Editable settings
Start time, gap between groups, end messages and their times (e.g. 9:15 "Ready for Shurley!"), title. Two presets ready to add: "Bathroom / locker" and "Lunch".

## Timer review (existing timers)
- Check the slide timer, two-phase timer and routine tool on a real board; fix anything broken.
- Floating timers currently reset to starting settings on reload — make them keep their minutes/label.

## Technical details
- New widget type `staged` in src/lib/board.ts: `{ start, gapMin, groups: {name, students[]}[], finale: {time, label}[], label }`; stored in slide JSON (no DB change).
- Pure functions + vitest tests: `dailyGroupOrder(date, n, override?)` (seeded by date, avoids yesterday's first group), `getStagedState(widget, order, now)`.
- Shuffle override saved in user metadata keyed by date (syncs across devices).
- UI in widgets.tsx (slide) and floating.tsx (Tools menu), hidden nothing in Assessment Mode (not a game).
- Tests: order differs from 1-2-3-4 on most days and is stable per date; 9:00 group A, 9:02 group B, 9:15 shows "Ready for Shurley!"; 12:45 clean up, 12:48 recess.
