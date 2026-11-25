# Spread group timers across the schedule + keep floating timers after reload

## Group timers (spread evenly)
Group calls are spread across the whole time instead of every 2 minutes.

**Bathroom / locker (during snack), 9:05–9:15**
- Group A 9:05 · Group B 9:07:30 · Group C 9:10 · Group D 9:12:30
- 9:15: "Ready for Shurley!"

**Lunch, 12:15–12:45**
- Group A 12:15 · Group B 12:22:30 · Group C 12:30 · Group D 12:37:30
- 12:45: "Clean up / sweep" · 12:48: "Ready for recess!"

- The tool shows each group's start time next to its name.
- Settings get an **end time** in place of "minutes between groups". The time between groups works itself out (change the end time and the calls re-space).
- Daily group order shuffle stays the same.

## Floating timers keep their settings
- Plain timer: keeps minutes left, and keeps counting if it was running (e.g. a 5:00 timer started before a reload is still on track after).
- Two-phase timer: keeps phase 1/phase 2 minutes, time used, and running state.
- Each open timer saves separately, so two timers don't overwrite each other.

## Technical details
- src/lib/staged.ts: presets get `end` ("09:15", "12:45"); start "09:05"/"12:15". New `slotTimes(start, end, groups)` and gap = (end-start)/groups in seconds; `getStagedState` takes end instead of gapMin (old saved slides with gapMin still work as a fallback).
- Widget `staged` gains optional `end`; editor input swapped.
- floating.tsx: QuickTimer/TwoPhase get the item id and persist `{left|elapsed, running, startedAt, p1, p2}` in localStorage `hb-floating-state:<id>`; on load, running timers subtract wall-clock time since save. State removed on close.
- Tests updated: 9:05 slot 0, 9:07:30 slot 1, 9:12:30 slot 3, 9:15 Shurley; 12:22:30 slot 1, 12:45 clean up, 12:48 recess; timer restore math tested as a pure helper.
