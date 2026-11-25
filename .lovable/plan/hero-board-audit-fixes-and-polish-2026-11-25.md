# Hero Board audit: fixes and polish

## What I tested (signed in as you)
- Board editor: edited a slide's message, refreshed, and the change was still there. **Saving works.**
- Opened every floating tool, started a timer, refreshed. Tools came back.
- Present mode, next/previous slide, Schedule page (month + week), and the board and schedule on a phone-sized screen.
- Spotify: the morning slide only shows "Paste a Spotify playlist link…". Playback itself can't be tested here (needs your Premium account and a speaker device), so I only checked that the tool appears.

## Problems found
1. **Tools pile on top of each other.** Each new floating tool opens only 30px from the last, so 5+ tools hide each other and the slide (the Random number tool was fully covered). Fix: open new tools in free spots, cascade wider, and add a "Close all tools" button.
2. **Tools button covers the editor.** The orange Tools button sits over the "Tools on this slide" list in the right panel. Fix: give the editor bottom space so nothing hides behind it.
3. **Phone: board page is wider than the screen.** The editor squeezes three columns side by side, so you have to scroll sideways and the editor is cut off. Fix: on phones, show slide list / slide / settings as stacked sections with tabs.
4. **Broken button inside a button in the slide list** (shows as page errors and can make taps misfire on the slide list). Fix the markup.
5. **Morning Message slide is "No folder / No day"**, so it never gets auto-suggested at 7:20. Fix: offer a one-tap "File under Homeroom" when an unfiled slide's name matches a subject.
6. **Floating tools aren't scaled for present mode**: on the smartboard they're small and cover the heading. Fix: slightly larger tools in present mode and remember position separately for present vs edit.
7. **Spotify tool shows only a hint** when no playlist is set. Fix: show a "Pick music" button that opens the music library directly.
8. Schedule page: "No lesson" shows for all Math days this week. That's correct for Thanksgiving, but the label should say "Break" instead.

## Still unchecked (needs you)
- Spotify playing on your Premium account.
- The same Mystery Star / Prize board showing on your phone and the classroom computer at once.

## Technical details
- floating.tsx: placement finds the first non-overlapping slot in a grid; "Close all" clears items and `hb-floating-state:*`.
- board.tsx: add bottom padding to editor aside; below `md` switch to a tabbed single column (List / Slide / Edit).
- Library.tsx: nested `<button>` in the folder header → move inner control out or use a `div role="button"`.
- library.ts: `guessFolder(name)` helper + test; UI button on unfiled slides.
- LessonPlanner day buttons: show calendar off-day summary when the day is closed.
- Verify each fix again with the phone and desktop walkthrough.
