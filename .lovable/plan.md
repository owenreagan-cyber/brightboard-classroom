# Timer music: play a playlist while the timer runs

## What you'll get
- Every timer (slide timer, floating quick timer, two-phase timer, and staged bathroom/lunch timers) gets a **"Music while running"** option.
- Pick a playlist from your school-curated Class Music library (no pasted links, no personal playlists, explicit songs still blocked).
- Press Start: music begins. Pause the timer: music pauses. Resume: music resumes.
- Timer reaches zero: music fades out and stops, then the normal alarm/announcement plays so it's clearly heard.
- Two-phase timers: choose music for "work" only, "break" only, or both.
- Staged timers: music plays from start until the final announcement (e.g. "Ready for recess"), then stops.
- If Spotify isn't connected, the timer still runs normally and shows a small "Connect Spotify for music" note.
- Only one thing controls music at a time: a timer starting music takes over; when it ends it doesn't restart slide autoplay.

## Technical details
- Add optional `music?: { itemId: string; phases?: "work"|"break"|"both" }` to timer widget data (slide JSON, no DB change) and to floating timer saved state.
- New helper in src/lib/spotify.ts: `timerMusic.start(ownerId, item)`, `pause(ownerId)`, `stop(ownerId)` with an owner token so a finished timer only stops music it started; short volume fade before pause.
- Hook `useTimerMusic(running, finished, music)` used by TimerWidget, QuickTimer/two-phase in floating.tsx, and StagedWidget.
- Pure owner/transition logic gets a small test (start on run, stop on end, don't stop another timer's music).
