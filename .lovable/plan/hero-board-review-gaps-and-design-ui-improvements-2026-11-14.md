# Hero Board review: gaps and design/UI improvements

## What works today
Slides with subject designs, the Board Library (folders, Mon–Fri, import/export), floating tools, games, class lists, Spotify, AI drafting, and the Schedule page with Canvas lessons and Google Calendar.

## Gaps to close first (built but never tried on the board)
1. Walk through every tool on a real signed-in board: theme panel, AI draft, Mystery Star, Prize Board, random number, Lesson & homework card, edited block times. Fix anything broken.
2. Floating tools (timers, noise meter, voice signals) vanish on reload. Save their positions and settings so a refresh mid-lesson keeps them.
3. Prize Board mix (70% standard / 18% rare / 4% legendary / 8% Whammy) was my guess. Add a small settings panel so you can set the mix and the prize names.

## Missing features worth adding
- **Auto-advance mode**: the board switches to the scheduled slide when a block starts (using your block times), with a 1-minute "Up next" warning banner.
- **Transition timer**: a big countdown on the current slide until the next block (e.g. "Lunch in 4:30").
- **Phone remote**: open the board on your phone to go next/previous, start a timer, or reveal the Mystery Star while the smartboard presents.
- **Behavior points / team scores**: hero-style team tallies (e.g. 4 squads) that persist across days.
- **Groups maker**: split the current class list into random groups of 2–5.
- **Daily jobs chart**: rotate classroom jobs across the roster each week.
- **Slide duplication + templates**: copy a slide to another day or folder in one click.
- **Undo for slide edits** and a version history per board.

## Design / UI polish
- **Present mode**: larger text scaling for the back row, hide the cursor after 3 seconds, keyboard shortcuts overlay (arrows, T for timer, N for name picker).
- **Editor layout**: group the long side panel into tabs (Content, Design, Tools, AI) so it fits without scrolling.
- **Consistent tool cards**: same header, drag handle and size controls on every floating tool; resizable corners.
- **Motion**: short shonen-style "power-up" entrance when switching slides and when a timer ends (respecting reduced-motion).
- **Mascot reactions**: the ninja cat cheers on Prize Board wins and timer finish (hidden in Assessment Mode).
- **Schedule page on phone**: stack the week grid into a day-by-day list on small screens.
- **Empty states**: friendly prompts when a slot has no board or a class list is empty.
- **Higher-quality backgrounds**: current subject art is preview quality; export full-size versions from Canva.

## Still waiting on you
- Which days are History vs. Science at 1:15.
- Adding the lovable-edu-suite local tools in the desktop app.
- A real "No school" calendar event to test.

## Suggested order
1. Gaps 1–3. 2. Auto-advance + transition timer. 3. Editor tabs + present-mode polish. 4. Phone remote. 5. Remaining classroom tools.

Tell me which items to build, or approve to start with steps 1–2.
