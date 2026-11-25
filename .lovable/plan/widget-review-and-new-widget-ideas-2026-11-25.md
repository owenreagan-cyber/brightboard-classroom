# Widget review and new widget ideas

## What you have today

Slide tools (9): Timer sequence, Timer, Name picker, Work symbols, Clock, Spotify, Lesson & homework, Staged group timer, Character + speech bubble.

Floating tools (9): Voice signals, Timer, Two-phase timer, Noise meter, Random number, Mystery Star, 100 Prize Board, Bathroom/locker groups, Lunch groups.

## Review findings

- The timer, two-phase timer and timer sequence do similar jobs. They could share one look and one settings panel, so they feel like one tool family.
- The name picker forgets who was already picked when the page reloads, and it can't skip absent students.
- Slide tools can't be moved or resized on the slide. Only floating tools can be dragged.
- Nothing marks students absent, so the picker, Mystery Star and groups still include them.
- Mystery Star, the Prize Board and the music only update the other device when you switch back to it, about every 15 seconds.

## Suggested new widgets (most useful first)

1. **Attendance / who's here:** tap names to mark students absent for today. The name picker, Mystery Star and group makers then skip them. Saved to your account.
2. **Team points:** 4 squads (for example Leaf, Sand, Mist, Cloud) with big +1 / -1 buttons. Scores last all week. The mascot cheers when a team scores, except in Assessment Mode.
3. **Random groups maker:** split today's students into groups of 2 to 5, then reshuffle. Shows first names on group cards.
4. **Classroom jobs chart:** line leader, door holder and other jobs, rotating automatically each school day.
5. **Visual "first / then" and daily agenda:** the day's blocks as picture cards that tick off as the day goes on, using the subject characters.
6. **Brain break / movement spinner:** a wheel of quick movement activities (10 jumping jacks, ninja freeze, and so on) with a short timer.
7. **Hand-raise / help queue:** students added to a line for help, in order, with tap-to-clear.
8. **Word of the day / spelling word:** large word with sound-out syllables, tied to the Spelling board.
9. **Phone remote:** next and previous slide, start a timer and reveal Mystery Star from your phone while the smartboard presents.

## Small fixes to do along the way

- The name picker remembers who has gone and skips absent students.
- One shared look for all timers.

## Suggested order

1. Attendance + name picker fix (the other tools depend on it).
2. Team points and Random groups maker.
3. Jobs chart and daily agenda.
4. Brain break spinner, help queue, word of the day.
5. Phone remote.

## Technical details

- New tools follow the existing pattern: slide tools in src/components/board/widgets.tsx with types in src/lib/board.ts and zod in src/lib/library.ts; floating ones in floating.tsx; pure logic in src/lib with tests.
- Attendance, team points and jobs sync through auth user metadata using the existing queueCloudSave, keyed by date, so no database change.
- Games (team points cheers, spinner) are hidden in Assessment Mode.
- Phone remote would use a realtime channel per teacher; it needs its own small design step.
